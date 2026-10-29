/* eslint-disable camelcase */
/**
 * Motor económico: único punto que escribe operaciones económicas,
 * obligaciones, movimientos y eventos. Los clientes solo leen (ver reglas).
 *
 * Todas las operaciones son idempotentes (ids deterministas y deduplicación
 * por origen + referencia): un reintento nunca duplica dinero.
 */
import type {
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Transaction,
} from 'firebase-admin/firestore';
import {FieldValue, Timestamp} from 'firebase-admin/firestore';
import {
  COLECCION,
  PAW_PATH,
  type PoliticaComercial,
  type TipoEventoEconomico,
} from './tipos';
import type {DesgloseCobro} from './calculo';
import type {TipoServicio} from '../compartido/servicios';

/**
 * Una operación económica por tutor y servicio (paseos compartidos incluidos).
 * @param {string} servicioId Id del paseo (operaciones/{id}).
 * @param {string} tutorId UID del tutor.
 * @return {string} Id determinista.
 */
export function idOperacionEconomica(servicioId: string, tutorId: string): string {
  return `${servicioId}_${tutorId}`;
}

export const idObligacionCobro = (opId: string) => `${opId}_cobro`;
export const idObligacionCuidador = (opId: string) => `${opId}_cuidador`;

const operaciones = (db: Firestore) => db.collection(COLECCION.OPERACIONES);
const obligaciones = (db: Firestore) => db.collection(COLECCION.OBLIGACIONES);

/**
 * Referencia nueva para un evento económico (subcolección inmutable).
 * @param {Firestore} db Firestore.
 * @param {string} opId Operación económica.
 * @return {FirebaseFirestore.DocumentReference} Referencia.
 */
function refEvento(db: Firestore, opId: string) {
  return operaciones(db).doc(opId).collection('eventos_economicos').doc();
}

/**
 * Datos de un evento económico.
 * @param {string} opId Operación.
 * @param {TipoEventoEconomico} tipo Tipo.
 * @param {string} detalle Descripción.
 * @param {Timestamp} ahora Momento.
 * @param {object} extra Campos de correlación.
 * @return {object} Documento.
 */
function datosEvento(
  opId: string,
  tipo: TipoEventoEconomico,
  detalle: string,
  ahora: Timestamp,
  extra: Record<string, string> = {}
) {
  return {operacion_id: opId, tipo, detalle, timestamp: ahora, ...extra};
}

/**
 * Registra un evento económico fuera de transacción.
 * @param {Firestore} db Firestore.
 * @param {string} opId Operación.
 * @param {TipoEventoEconomico} tipo Tipo.
 * @param {string} detalle Descripción.
 * @param {Timestamp} ahora Momento.
 * @param {object} extra Campos de correlación.
 */
export async function registrarEvento(
  db: Firestore,
  opId: string,
  tipo: TipoEventoEconomico,
  detalle: string,
  ahora: Timestamp,
  extra: Record<string, string> = {}
): Promise<void> {
  await refEvento(db, opId).set(datosEvento(opId, tipo, detalle, ahora, extra));
}

export interface NuevoMovimiento {
  operacion_id: string
  tipo: 'RECAUDO' | 'PAGO' | 'REEMBOLSO' | 'AJUSTE'
  valor: number
  sentido: 'ENTRADA' | 'SALIDA'
  origen: string
  referencia_origen: string
}

/**
 * Documento de deduplicación de un movimiento (clave: origen + referencia).
 * @param {Firestore} db Firestore.
 * @param {NuevoMovimiento} mov Movimiento.
 * @return {FirebaseFirestore.DocumentReference} Referencia.
 */
function refDedup(db: Firestore, mov: NuevoMovimiento) {
  const clave = `${mov.origen}:${mov.referencia_origen}`.replace(/\//g, '_');
  return db.collection(COLECCION.DEDUPLICACION).doc(clave);
}

/**
 * Escribe un movimiento dentro de una transacción salvo que ya exista
 * (invariante I4). La lectura de deduplicación se hace antes, porque en una
 * transacción todas las lecturas van primero.
 * @param {Firestore} db Firestore.
 * @param {Transaction} tx Transacción.
 * @param {DocumentReference} dedupRef Documento de deduplicación.
 * @param {DocumentSnapshot} dedup Lectura previa de dedupRef.
 * @param {NuevoMovimiento} mov Movimiento.
 * @param {Timestamp} ahora Momento.
 * @return {string} Id del movimiento (nuevo o existente).
 */
function escribirMovimiento(
  db: Firestore,
  tx: Transaction,
  dedupRef: DocumentReference,
  dedup: DocumentSnapshot,
  mov: NuevoMovimiento,
  ahora: Timestamp
): string {
  if (dedup.exists) return dedup.data()?.movimiento_id as string;
  const movRef = db.collection(COLECCION.MOVIMIENTOS).doc();
  tx.set(movRef, {...mov, id: movRef.id, creado_en: ahora});
  tx.set(dedupRef, {movimiento_id: movRef.id, creado_en: ahora});
  return movRef.id;
}

/**
 * Registra un movimiento financiero una sola vez por (origen, referencia).
 * Si ya existía devuelve el id original (invariante I4).
 * @param {Firestore} db Firestore.
 * @param {NuevoMovimiento} mov Movimiento.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<string>} Id del movimiento.
 */
export async function registrarMovimiento(
  db: Firestore,
  mov: NuevoMovimiento,
  ahora: Timestamp
): Promise<string> {
  return db.runTransaction(async (tx) => {
    const dedupRef = refDedup(db, mov);
    const dedup = await tx.get(dedupRef);
    return escribirMovimiento(db, tx, dedupRef, dedup, mov, ahora);
  });
}

export interface CobroServicio {
  servicioId: string
  tipoServicio: TipoServicio
  tutorId: string
  cuidadorId: string
  desglose: DesgloseCobro
  /** Política acordada al nacer el servicio: rige la operación completa. */
  politica: PoliticaComercial
  detallePrecio: Record<string, number>
}

const HORA_MS = 60 * 60 * 1000;

/**
 * Genera, al validar la entrega, la operación económica del tutor con sus
 * dos obligaciones: tutor → Paw-Path (valor total) y Paw-Path → cuidador
 * (recursos administrados). Idempotente: si ya existe no hace nada.
 * @param {Firestore} db Firestore.
 * @param {CobroServicio} c Datos del cobro.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<boolean>} true si se creó.
 */
export async function generarCobroServicio(
  db: Firestore,
  c: CobroServicio,
  ahora: Timestamp
): Promise<boolean> {
  const d = c.desglose;
  if (d.valor_acordado !== d.remuneracion_mandatario + d.recursos_administrados ||
      d.remuneracion_mandatario !== d.comision_base + d.iva_comision) {
    throw new Error('Violación I1: composición económica incorrecta');
  }
  const opId = idOperacionEconomica(c.servicioId, c.tutorId);
  const opRef = operaciones(db).doc(opId);

  return db.runTransaction(async (tx) => {
    if ((await tx.get(opRef)).exists) return false;

    tx.set(opRef, {
      id: opId,
      tipo_servicio: c.tipoServicio,
      operacion_servicio_id: c.servicioId,
      tutor_id: c.tutorId,
      cuidador_id: c.cuidadorId,
      valor_acordado: d.valor_acordado,
      remuneracion_mandatario: d.remuneracion_mandatario,
      recursos_administrados: d.recursos_administrados,
      comision_base: d.comision_base,
      iva_comision: d.iva_comision,
      politica_version: c.politica.version,
      detalle_precio: c.detallePrecio,
      estado: 'EJECUTADA',
      creado_en: ahora,
    });

    // Cada obligación lleva los términos de su política: lo que pase después
    // (bloqueo, liquidación, documentos) no depende de la política vigente
    const base = {
      operacion_id: opId,
      operacion_servicio_id: c.servicioId,
      politica_version: c.politica.version,
      estado: 'PENDIENTE',
      creado_en: ahora,
    };
    tx.set(obligaciones(db).doc(idObligacionCobro(opId)), {
      ...base,
      id: idObligacionCobro(opId),
      tipo: 'COBRO_TUTOR',
      deudor: c.tutorId,
      acreedor: PAW_PATH,
      concepto: 'Pago por servicio de paseo',
      valor: d.valor_acordado,
      recordatorios_enviados: 0,
      bloquear_desde: Timestamp.fromMillis(
        ahora.toMillis() + c.politica.cobro.bloqueo_tras_horas * HORA_MS),
    });
    tx.set(obligaciones(db).doc(idObligacionCuidador(opId)), {
      ...base,
      id: idObligacionCuidador(opId),
      tipo: 'PAGO_CUIDADOR',
      deudor: PAW_PATH,
      acreedor: c.cuidadorId,
      concepto: 'Pago por servicio de paseo ejecutado',
      valor: d.recursos_administrados,
      cobro_recaudado: false,
      requiere_recaudo: c.politica.liquidacion.solo_recaudadas,
      documento_soporte: c.politica.contabilidad.documento_soporte_cuidador,
    });

    const eventos: Array<[TipoEventoEconomico, string, Record<string, string>?]> = [
      ['OPERACION_ENCARGADA', `Servicio ${c.servicioId} encargado por ${c.tutorId}`],
      ['CUIDADOR_ASIGNADO', `Cuidador ${c.cuidadorId} asignado`],
      ['SERVICIO_EJECUTADO', `Servicio ${c.servicioId} ejecutado`],
      ['OBLIGACION_GENERADA', `Cobro de $${d.valor_acordado} al tutor`,
        {obligacion_id: idObligacionCobro(opId)}],
      ['OBLIGACION_GENERADA', `Pago de $${d.recursos_administrados} al cuidador`,
        {obligacion_id: idObligacionCuidador(opId)}],
    ];
    for (const [tipo, detalle, extra] of eventos) {
      tx.set(refEvento(db, opId), datosEvento(opId, tipo, detalle, ahora, extra));
    }
    return true;
  });
}

export interface PagoAprobado {
  proveedor: string
  referencia: string
  transaccion_id: string
}

/**
 * Registra el recaudo confirmado por la pasarela: movimiento de entrada,
 * cobro del tutor CUMPLIDO, operación RECAUDADA y obligación del cuidador
 * marcada como liquidable. Todo en una transacción e idempotente: repetirlo
 * (o ejecutarlo en paralelo) no duplica dinero ni eventos.
 * @param {Firestore} db Firestore.
 * @param {string} opId Operación económica.
 * @param {PagoAprobado} pago Datos de la pasarela.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<boolean>} true si se registró ahora.
 */
export async function registrarRecaudo(
  db: Firestore,
  opId: string,
  pago: PagoAprobado,
  ahora: Timestamp
): Promise<boolean> {
  const opRef = operaciones(db).doc(opId);
  return db.runTransaction(async (tx) => {
    const op = (await tx.get(opRef)).data();
    if (!op) throw new Error(`Operación ${opId} no existe`);
    if (op.estado !== 'EJECUTADA') return false;

    const mov: NuevoMovimiento = {
      operacion_id: opId,
      tipo: 'RECAUDO',
      valor: op.valor_acordado,
      sentido: 'ENTRADA',
      origen: pago.proveedor,
      referencia_origen: pago.transaccion_id,
    };
    const dedupRef = refDedup(db, mov);
    const dedup = await tx.get(dedupRef);
    const movId = escribirMovimiento(db, tx, dedupRef, dedup, mov, ahora);

    tx.update(opRef, {
      estado: 'RECAUDADA',
      recaudado_en: ahora,
      referencia_pago: pago.referencia,
      pago_pendiente: FieldValue.delete(),
    });
    tx.update(obligaciones(db).doc(idObligacionCobro(opId)), {
      estado: 'CUMPLIDA',
      cumplido_en: ahora,
      movimiento_cumplido_id: movId,
    });
    tx.update(obligaciones(db).doc(idObligacionCuidador(opId)), {
      cobro_recaudado: true,
    });
    tx.set(refEvento(db, opId), datosEvento(opId, 'RECAUDO',
      `Pago confirmado: ${pago.transaccion_id}`, ahora, {movimiento_id: movId}));
    return true;
  });
}

/**
 * Cumple una obligación de pago a tercero con un movimiento de salida, en
 * una transacción. Idempotente: si la obligación ya está cumplida no hace
 * nada (aunque se repita con otra referencia). La referencia debe ser única
 * por obligación (deduplicación I4).
 * @param {Firestore} db Firestore.
 * @param {string} obligacionId Obligación.
 * @param {object} pago origen y referencia del pago.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<string | null>} Id del movimiento, o null si ya estaba cumplida.
 */
export async function pagarObligacion(
  db: Firestore,
  obligacionId: string,
  pago: {origen: string; referencia: string},
  ahora: Timestamp
): Promise<string | null> {
  const obligRef = obligaciones(db).doc(obligacionId);
  const resultado = await db.runTransaction(async (tx) => {
    const oblig = (await tx.get(obligRef)).data();
    if (!oblig) throw new Error(`Obligación ${obligacionId} no existe`);
    // Ya cumplida: no se paga de nuevo, pero se reintenta el cierre abajo
    if (oblig.estado === 'CUMPLIDA') {
      return {movId: null, opId: oblig.operacion_id as string};
    }
    if (oblig.estado !== 'PENDIENTE') {
      throw new Error(`Obligación ${obligacionId} está ${oblig.estado}`);
    }

    const mov: NuevoMovimiento = {
      operacion_id: oblig.operacion_id,
      tipo: 'PAGO',
      valor: oblig.valor,
      sentido: 'SALIDA',
      origen: pago.origen,
      referencia_origen: pago.referencia,
    };
    const dedupRef = refDedup(db, mov);
    const dedup = await tx.get(dedupRef);
    const movId = escribirMovimiento(db, tx, dedupRef, dedup, mov, ahora);

    tx.update(obligRef, {
      estado: 'CUMPLIDA',
      cumplido_en: ahora,
      movimiento_cumplido_id: movId,
    });
    tx.set(refEvento(db, oblig.operacion_id), datosEvento(oblig.operacion_id,
      'PAGO_TERCERO', `Pago de $${oblig.valor} a ${oblig.acreedor}`, ahora,
      {movimiento_id: movId, obligacion_id: obligacionId}));
    return {movId, opId: oblig.operacion_id as string};
  });
  await cerrarSiCompleta(db, resultado.opId, ahora);
  return resultado.movId;
}

/**
 * Cierra la operación si ya fue recaudada y no le quedan obligaciones
 * pendientes (invariante I5). En una transacción: se cierra una sola vez.
 * @param {Firestore} db Firestore.
 * @param {string} opId Operación.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<boolean>} true si se cerró.
 */
export async function cerrarSiCompleta(
  db: Firestore,
  opId: string,
  ahora: Timestamp
): Promise<boolean> {
  const opRef = operaciones(db).doc(opId);
  const pendientes = obligaciones(db)
    .where('operacion_id', '==', opId)
    .where('estado', '==', 'PENDIENTE');
  return db.runTransaction(async (tx) => {
    if ((await tx.get(opRef)).data()?.estado !== 'RECAUDADA') return false;
    if (!(await tx.get(pendientes)).empty) return false;
    tx.update(opRef, {estado: 'CERRADA', cerrado_en: ahora});
    tx.set(refEvento(db, opId), datosEvento(opId, 'OPERACION_CERRADA',
      'Operación cerrada: sin obligaciones pendientes', ahora));
    return true;
  });
}
