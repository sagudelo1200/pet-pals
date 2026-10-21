/* eslint-disable camelcase */
/**
 * Documentos contables de Paw-Path (fuente de verdad).
 *
 * Cada hecho económico produce un documento que se guarda primero en
 * documentos_contables con su contenido completo, y luego se refleja en el
 * sistema contable a través del adaptador. El proveedor solo aporta su
 * número; si falla, el documento queda en ERROR para reintentar.
 *
 *  Hecho                         Documento
 *  El tutor valida la entrega →  FACTURA_VENTA (a crédito, al tutor)
 *  El tutor paga              →  RECIBO_CAJA (aplica la factura)
 *  Se paga la liquidación     →  DOCUMENTO_SOPORTE (si la política lo pide)
 *                                + RECIBO_PAGO (egreso al cuidador)
 *
 * Los ids son deterministas (tipo + hecho): generar dos veces el mismo
 * documento no lo duplica.
 */
import type {Firestore} from 'firebase-admin/firestore';
import {Timestamp} from 'firebase-admin/firestore';
import {
  enviarAlProveedor,
  validarDocumento,
  type AdaptadorContable,
  type DocumentoContable,
  type LineaDocumento,
} from './contabilidad';
import {COLECCION, type PoliticaContable} from './tipos';

const HORA_MS = 60 * 60 * 1000;
// Un envío en curso se puede retomar pasado este tiempo (caída a mitad)
const ENVIO_EN_CURSO_MS = 5 * 60 * 1000;

export const idFactura = (opId: string) => `FV-${opId}`;
export const idReciboCaja = (opId: string) => `RC-${opId}`;
export const idDocumentoSoporte = (liqId: string) => `DS-${liqId}`;
export const idReciboPago = (liqId: string) => `RP-${liqId}`;

const documentos = (db: Firestore) => db.collection(COLECCION.DOCUMENTOS);

/**
 * Guarda el documento en Paw-Path si no existe (idempotente).
 * @param {Firestore} db Firestore.
 * @param {DocumentoContable} doc Documento.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<boolean>} true si se creó.
 */
export async function registrarDocumento(
  db: Firestore,
  doc: DocumentoContable,
  ahora: Timestamp
): Promise<boolean> {
  validarDocumento(doc);
  const ref = documentos(db).doc(doc.id);
  return db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return false;
    tx.set(ref, {...doc, envio: {estado: 'PENDIENTE', intentos: 0}, creado_en: ahora});
    return true;
  });
}

/**
 * Refleja el documento en el sistema contable. Nunca lanza: un fallo queda
 * registrado (estado ERROR) para reintentar. Idempotente: un documento ya
 * enviado, o con un envío en curso, no se vuelve a enviar.
 * @param {Firestore} db Firestore.
 * @param {string} id Documento.
 * @param {AdaptadorContable} adaptador Proveedor contable.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<string>} Estado final del envío.
 */
export async function enviarDocumento(
  db: Firestore,
  id: string,
  adaptador: AdaptadorContable,
  ahora: Timestamp
): Promise<string> {
  const ref = documentos(db).doc(id);
  const reserva = await db.runTransaction(async (tx) => {
    const actual = (await tx.get(ref)).data();
    if (!actual) throw new Error(`Documento ${id} no existe`);
    const envio = actual.envio ?? {};
    if (envio.estado === 'ENVIADO') return {doc: null, estado: 'ENVIADO'};
    if (envio.estado === 'ENVIANDO' &&
        ahora.toMillis() - envio.intentado_en.toMillis() < ENVIO_EN_CURSO_MS) {
      return {doc: null, estado: 'ENVIANDO'};
    }
    tx.update(ref, {envio: {
      estado: 'ENVIANDO', proveedor: adaptador.proveedor,
      intentado_en: ahora, intentos: (envio.intentos ?? 0) + 1,
    }});
    return {doc: actual as DocumentoContable, estado: 'ENVIANDO',
      intentos: (envio.intentos ?? 0) + 1};
  });
  if (!reserva.doc) return reserva.estado;

  const base = {proveedor: adaptador.proveedor, intentado_en: ahora,
    intentos: reserva.intentos};
  try {
    await adaptador.registrarTercero(reserva.doc.tercero);
    const {numero} = await enviarAlProveedor(adaptador, reserva.doc);
    await ref.update({envio: {...base, estado: 'ENVIADO', numero_proveedor: numero}});
    return 'ENVIADO';
  } catch (error) {
    const motivo = error instanceof Error ? error.message : String(error);
    console.error(`[documentos] Envío de ${id} falló: ${motivo}`);
    await ref.update({envio: {...base, estado: 'ERROR', error: motivo.slice(0, 500)}});
    return 'ERROR';
  }
}

/**
 * Guarda y envía un documento (ambos pasos idempotentes).
 * @param {Firestore} db Firestore.
 * @param {DocumentoContable} doc Documento.
 * @param {AdaptadorContable} adaptador Proveedor contable.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<string>} Estado del envío.
 */
export async function emitirDocumento(
  db: Firestore,
  doc: DocumentoContable,
  adaptador: AdaptadorContable,
  ahora: Timestamp
): Promise<string> {
  await registrarDocumento(db, doc, ahora);
  return enviarDocumento(db, doc.id, adaptador, ahora);
}

// ---------- Documentos de cada hecho económico ----------

/**
 * Factura de venta a crédito al validar la entrega: comisión (base + IVA)
 * como ingreso propio y el dinero del cuidador como ingreso para terceros.
 * @param {Firestore} db Firestore.
 * @param {string} opId Operación económica.
 * @param {number} plazoPagoHoras Plazo de pago (vencimiento de la factura).
 * @param {AdaptadorContable} adaptador Proveedor contable.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<string>} Estado del envío.
 */
export async function facturarOperacion(
  db: Firestore,
  opId: string,
  plazoPagoHoras: number,
  adaptador: AdaptadorContable,
  ahora: Timestamp
): Promise<string> {
  const op = (await db.collection(COLECCION.OPERACIONES).doc(opId).get()).data();
  if (!op) throw new Error(`Operación ${opId} no existe`);
  const servicio = `${op.tipo_servicio} ${op.operacion_servicio_id}`;
  const lineas: LineaDocumento[] = [
    {concepto: `Comisión por gestión del servicio de ${servicio}`, tipo: 'COMISION',
      valor: op.comision_base},
    ...(op.iva_comision > 0 ? [{concepto: 'IVA sobre la comisión',
      tipo: 'IVA_COMISION' as const, valor: op.iva_comision}] : []),
    {concepto: `Servicio de ${servicio} prestado por el cuidador (para terceros)`,
      tipo: 'INGRESO_TERCEROS', valor: op.recursos_administrados},
  ];
  return emitirDocumento(db, {
    id: idFactura(opId),
    tipo: 'FACTURA_VENTA',
    tercero: {uid: op.tutor_id, rol: 'CLIENTE'},
    fecha: ahora,
    lineas,
    total: op.valor_acordado,
    referencias: {operacion_id: opId},
    datos: {vence_en: Timestamp.fromMillis(ahora.toMillis() + plazoPagoHoras * HORA_MS)},
  }, adaptador, ahora);
}

/**
 * Recibo de caja al confirmarse el pago del tutor; aplica la factura.
 * @param {Firestore} db Firestore.
 * @param {string} opId Operación económica (ya recaudada).
 * @param {AdaptadorContable} adaptador Proveedor contable.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<string>} Estado del envío.
 */
export async function registrarReciboCajaOperacion(
  db: Firestore,
  opId: string,
  adaptador: AdaptadorContable,
  ahora: Timestamp
): Promise<string> {
  const op = (await db.collection(COLECCION.OPERACIONES).doc(opId).get()).data();
  if (!op) throw new Error(`Operación ${opId} no existe`);
  const cobro = (await db.collection(COLECCION.OBLIGACIONES)
    .doc(`${opId}_cobro`).get()).data();
  const movId = cobro?.movimiento_cumplido_id as string | undefined;
  if (!movId) throw new Error(`Operación ${opId} sin recaudo registrado`);
  const mov = (await db.collection(COLECCION.MOVIMIENTOS).doc(movId).get()).data();

  return emitirDocumento(db, {
    id: idReciboCaja(opId),
    tipo: 'RECIBO_CAJA',
    tercero: {uid: op.tutor_id, rol: 'CLIENTE'},
    fecha: ahora,
    lineas: [{concepto: `Pago de la factura ${idFactura(opId)}`, tipo: 'PAGO',
      valor: op.valor_acordado}],
    total: op.valor_acordado,
    referencias: {operacion_id: opId, movimiento_id: movId,
      documento_relacionado: idFactura(opId)},
    datos: {medio_pago: mov?.origen ?? 'DESCONOCIDO',
      ...(op.referencia_pago && {referencia_pago: op.referencia_pago})},
  }, adaptador, ahora);
}

/**
 * Documentos del pago de una liquidación al cuidador: documento soporte
 * (adquisición a un sujeto no obligado a facturar, acumulado del periodo) si
 * la política lo pide, y el recibo de pago (egreso) de la transferencia.
 * @param {Firestore} db Firestore.
 * @param {string} liqId Liquidación (ya pagada).
 * @param {PoliticaContable} contable Política contable vigente.
 * @param {AdaptadorContable} adaptador Proveedor contable.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<string[]>} Estados de envío.
 */
export async function documentarPagoLiquidacion(
  db: Firestore,
  liqId: string,
  contable: PoliticaContable,
  adaptador: AdaptadorContable,
  ahora: Timestamp
): Promise<string[]> {
  const liq = (await db.collection(COLECCION.LIQUIDACIONES).doc(liqId).get()).data();
  if (!liq) throw new Error(`Liquidación ${liqId} no existe`);
  const obligs = await Promise.all((liq.obligacion_ids as string[]).map(async (id) => {
    const o = (await db.collection(COLECCION.OBLIGACIONES).doc(id).get()).data();
    return {id, valor: o?.valor as number, servicio: o?.operacion_servicio_id as string};
  }));
  const tercero = {uid: liq.cuidador_id as string, rol: 'PROVEEDOR' as const};
  const estados: string[] = [];

  if (contable.documento_soporte_cuidador) {
    estados.push(await emitirDocumento(db, {
      id: idDocumentoSoporte(liqId),
      tipo: 'DOCUMENTO_SOPORTE',
      tercero,
      fecha: ahora,
      lineas: obligs.map((o) => ({
        concepto: `Servicio de paseo ${o.servicio ?? o.id}`,
        tipo: 'SERVICIO_TERCERO' as const,
        valor: o.valor,
      })),
      total: liq.total,
      referencias: {liquidacion_id: liqId},
    }, adaptador, ahora));
  }

  estados.push(await emitirDocumento(db, {
    id: idReciboPago(liqId),
    tipo: 'RECIBO_PAGO',
    tercero,
    fecha: ahora,
    lineas: [{concepto: `Liquidación ${liqId}`, tipo: 'PAGO', valor: liq.total}],
    total: liq.total,
    referencias: {liquidacion_id: liqId,
      ...(contable.documento_soporte_cuidador &&
        {documento_relacionado: idDocumentoSoporte(liqId)})},
    datos: {medio_pago: 'TRANSFERENCIA', referencia_pago: liq.referencia_pago},
  }, adaptador, ahora));
  return estados;
}
