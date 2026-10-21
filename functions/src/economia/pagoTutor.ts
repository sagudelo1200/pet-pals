/* eslint-disable camelcase */
/**
 * Pago del tutor (posterior al paseo) a través del puerto de pasarela.
 * 1. iniciarPagoTutor: reserva una referencia propia y pide el cobro a la
 *    pasarela (un pago en curso se reutiliza).
 * 2. confirmarPagoTutor: consulta a la pasarela (nunca confía en el cliente)
 *    y, si está aprobado, registra el recaudo, el recibo de caja y recalcula
 *    el bloqueo.
 */
import type {Firestore, Timestamp} from 'firebase-admin/firestore';
import {FieldValue} from 'firebase-admin/firestore';
import {recalcularBloqueo} from './cobranza';
import type {AdaptadorContable} from './contabilidad';
import {registrarReciboCajaOperacion} from './documentos';
import {registrarEvento, registrarRecaudo} from './motor';
import type {AdaptadorPago, EstadoPago} from './pagos';
import {COLECCION, ErrorEconomico, type PoliticaCobro} from './tipos';

/**
 * Lee la operación y verifica que el usuario pueda pagarla.
 * @param {Firestore} db Firestore.
 * @param {string} opId Operación.
 * @param {string} uid Usuario.
 * @param {boolean} esAdmin Si es admin.
 * @return {Promise<FirebaseFirestore.DocumentData>} Operación.
 */
async function leerOperacionDelTutor(
  db: Firestore,
  opId: string,
  uid: string,
  esAdmin: boolean
) {
  const op = (await db.collection(COLECCION.OPERACIONES).doc(opId).get()).data();
  if (!op) throw new ErrorEconomico('not-found', 'La operación no existe');
  if (op.tutor_id !== uid && !esAdmin) {
    throw new ErrorEconomico('permission-denied', 'Solo el tutor puede pagar');
  }
  return op;
}

interface PagoPendiente {
  referencia: string
  proveedor: string
  url?: string
}

/**
 * Inicia el pago de una operación ejecutada. Idempotente: si ya hay un pago
 * en curso devuelve ese mismo (un doble toque no crea dos cobros). La
 * referencia se reserva en una transacción antes de llamar a la pasarela.
 * @param {Firestore} db Firestore.
 * @param {string} opId Operación.
 * @param {string} uid Tutor.
 * @param {AdaptadorPago} pasarela Pasarela.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<object>} referencia, url y monto.
 */
export async function iniciarPagoTutor(
  db: Firestore,
  opId: string,
  uid: string,
  pasarela: AdaptadorPago,
  ahora: Timestamp
): Promise<{referencia: string; url?: string; monto: number}> {
  const opRef = db.collection(COLECCION.OPERACIONES).doc(opId);
  const reserva = await db.runTransaction(async (tx) => {
    const op = (await tx.get(opRef)).data();
    if (!op) throw new ErrorEconomico('not-found', 'La operación no existe');
    if (op.tutor_id !== uid) {
      throw new ErrorEconomico('permission-denied', 'Solo el tutor puede pagar');
    }
    if (op.estado !== 'EJECUTADA') {
      throw new ErrorEconomico('failed-precondition',
        `La operación no se puede pagar en estado ${op.estado}`);
    }
    const existente = op.pago_pendiente as PagoPendiente | undefined;
    if (existente) return {op, pago: existente, nuevo: false};

    const intento = (op.intentos_pago ?? 0) + 1;
    const pago: PagoPendiente = {
      referencia: `PP-${opId}-${intento}`,
      proveedor: pasarela.proveedor,
    };
    tx.update(opRef, {
      pago_pendiente: {...pago, iniciado_en: ahora},
      intentos_pago: intento,
    });
    return {op, pago, nuevo: true};
  });

  const {op, pago, nuevo} = reserva;
  const monto = op.valor_acordado as number;
  if (!nuevo) {
    return {referencia: pago.referencia, ...(pago.url && {url: pago.url}), monto};
  }

  try {
    const {url} = await pasarela.iniciarPago({
      referencia: pago.referencia,
      operacion_id: opId,
      tutor_id: op.tutor_id,
      monto,
      descripcion: `Paseo ${op.operacion_servicio_id}`,
    });
    if (url) await opRef.update({pago_pendiente: {...pago, url, iniciado_en: ahora}});
    await registrarEvento(db, opId, 'PAGO_INICIADO',
      `Pago solicitado por $${monto}`, ahora, {referencia_externa: pago.referencia});
    return {referencia: pago.referencia, ...(url && {url}), monto};
  } catch (error) {
    // La pasarela no aceptó el cobro: se libera la reserva para reintentar
    await liberarPagoPendiente(db, opId, pago.referencia);
    throw error;
  }
}

/**
 * Quita el pago en curso solo si sigue siendo el de esa referencia.
 * @param {Firestore} db Firestore.
 * @param {string} opId Operación.
 * @param {string} referencia Referencia esperada.
 * @return {Promise<boolean>} true si lo quitó.
 */
async function liberarPagoPendiente(
  db: Firestore,
  opId: string,
  referencia: string
): Promise<boolean> {
  const opRef = db.collection(COLECCION.OPERACIONES).doc(opId);
  return db.runTransaction(async (tx) => {
    const op = (await tx.get(opRef)).data();
    if (op?.pago_pendiente?.referencia !== referencia) return false;
    tx.update(opRef, {pago_pendiente: FieldValue.delete()});
    return true;
  });
}

/**
 * Confirma el pago consultando a la pasarela.
 * @param {Firestore} db Firestore.
 * @param {string} opId Operación.
 * @param {string} uid Tutor (o admin).
 * @param {boolean} esAdmin Si es admin.
 * @param {object} deps Pasarela, contabilidad y política de cobro.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<EstadoPago>} Estado del pago.
 */
export async function confirmarPagoTutor(
  db: Firestore,
  opId: string,
  uid: string,
  esAdmin: boolean,
  deps: {
    pasarela: AdaptadorPago
    contabilidad: AdaptadorContable
    cobro: PoliticaCobro
  },
  ahora: Timestamp
): Promise<EstadoPago> {
  const op = await leerOperacionDelTutor(db, opId, uid, esAdmin);
  if (op.estado === 'RECAUDADA' || op.estado === 'CERRADA') {
    return {estado: 'APROBADO'};
  }
  const pendiente = op.pago_pendiente as
    {referencia: string; proveedor: string} | undefined;
  if (!pendiente) {
    throw new ErrorEconomico('failed-precondition', 'No hay un pago iniciado');
  }

  const resultado = await deps.pasarela.consultarPago(pendiente.referencia);
  if (resultado.estado === 'RECHAZADO') {
    // Solo quien libera el intento registra el rechazo (sin eventos duplicados)
    if (await liberarPagoPendiente(db, opId, pendiente.referencia)) {
      await registrarEvento(db, opId, 'PAGO_RECHAZADO',
        resultado.mensaje || 'Pago rechazado', ahora,
        {referencia_externa: pendiente.referencia});
    }
    return resultado;
  }
  if (resultado.estado === 'PENDIENTE') return resultado;

  await registrarRecaudo(db, opId, {
    proveedor: pendiente.proveedor,
    referencia: pendiente.referencia,
    transaccion_id: resultado.transaccion_id || pendiente.referencia,
  }, ahora);
  // Recibo de caja: aplica la factura emitida al validar la entrega
  await registrarReciboCajaOperacion(db, opId, deps.contabilidad, ahora);
  await recalcularBloqueo(db, op.tutor_id, deps.cobro, ahora);
  return resultado;
}
