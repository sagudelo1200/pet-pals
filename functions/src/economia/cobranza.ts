/* eslint-disable camelcase */
/**
 * Cobranza al tutor (pago posterior al paseo):
 * - Recordatorios tras plazo_pago_horas, como máximo max_recordatorios, con
 *   intervalo mínimo y solo en horario permitido (Ley 2300 de 2023).
 * - Bloqueo de nuevos servicios desde `bloquear_desde` (fijado al nacer el
 *   cobro con su política) con el cobro pendiente. Se guarda en
 *   usuarios/{uid}.bloqueo_financiero y lo leen las reglas.
 *
 * Los plazos son siempre los de la política de la operación, nunca la vigente.
 *
 * Sin jobs periódicos: cada cobro agenda su próxima revisión (tarea de un
 * solo uso) y la cadena termina cuando se paga o ya no queda nada por hacer.
 */
import type {Firestore, Timestamp} from 'firebase-admin/firestore';
import {FieldValue} from 'firebase-admin/firestore';
import {notificar} from '../comun/notificar';
import {horaColombia, inicioDiaColombia} from './calculo';
import {COLECCION, type PoliticaCobro} from './tipos';

const HORA_MS = 60 * 60 * 1000;

export interface CobroPendiente {
  id: string
  deudor: string
  valor: number
  operacion_id: string
  operacion_servicio_id?: string
  estado?: string
  creado_en: Timestamp
  /** Desde cuándo bloquea al tutor (fijado al nacer, según su política). */
  bloquear_desde: Timestamp
  recordatorios_enviados?: number
  ultimo_recordatorio_en?: Timestamp
  bloqueo_aplicado?: boolean
  /** Reclamo del tutor: mientras esté ABIERTO no hay recordatorios ni bloqueo. */
  reclamo?: {estado?: string}
}

/**
 * ¿El tutor tiene un reclamo abierto sobre este cobro? (se pausa la cobranza)
 * @param {object} o Cobro.
 * @return {boolean} Si hay reclamo abierto.
 */
export function enReclamo(o: {reclamo?: {estado?: string}}): boolean {
  return o.reclamo?.estado === 'ABIERTO';
}

/**
 * Cobros pendientes de los tutores (todos o los de un tutor).
 * @param {Firestore} db Firestore.
 * @param {string} tutorId Filtra por deudor si se indica.
 * @return {Promise<CobroPendiente[]>} Cobros.
 */
async function cobrosPendientes(
  db: Firestore,
  tutorId?: string
): Promise<CobroPendiente[]> {
  let q = db.collection(COLECCION.OBLIGACIONES)
    .where('tipo', '==', 'COBRO_TUTOR')
    .where('estado', '==', 'PENDIENTE');
  if (tutorId) q = q.where('deudor', '==', tutorId);
  const snap = await q.get();
  return snap.docs.map((d) => ({...(d.data() as CobroPendiente), id: d.id}));
}

/**
 * Bloquea o desbloquea al tutor según sus cobros vencidos (cada uno con el
 * plazo de su propia política).
 * @param {Firestore} db Firestore.
 * @param {string} tutorId Tutor.
 * @param {Timestamp} ahora Momento.
 * @param {CobroPendiente[]} pendientes Cobros del tutor (se consultan si faltan).
 * @return {Promise<boolean>} true si queda bloqueado.
 */
export async function recalcularBloqueo(
  db: Firestore,
  tutorId: string,
  ahora: Timestamp,
  pendientes?: CobroPendiente[]
): Promise<boolean> {
  const lista = pendientes ?? (await cobrosPendientes(db, tutorId));
  const vencidos = lista.filter((o) => !enReclamo(o) &&
    o.bloquear_desde.toMillis() <= ahora.toMillis());

  const userRef = db.collection('usuarios').doc(tutorId);
  const user = await userRef.get();
  if (!user.exists) {
    console.warn(`[cobranza] Usuario ${tutorId} no existe; bloqueo omitido`);
    return false;
  }
  const bloqueoActual = user.data()?.bloqueo_financiero;

  if (vencidos.length > 0) {
    await userRef.update({
      bloqueo_financiero: {
        activo: true,
        desde: bloqueoActual?.desde ?? ahora,
        obligacion_ids: vencidos.map((o) => o.id),
      },
    });
    return true;
  }
  if (bloqueoActual) {
    await userRef.update({bloqueo_financiero: FieldValue.delete()});
  }
  return false;
}

/**
 * ¿Toca enviar recordatorio de este cobro ahora?
 * @param {CobroPendiente} o Cobro.
 * @param {PoliticaCobro} cobro Política.
 * @param {number} ahoraMs Ahora en ms.
 * @return {boolean} Si corresponde.
 */
export function debeRecordar(
  o: CobroPendiente,
  cobro: PoliticaCobro,
  ahoraMs: number
): boolean {
  if (enReclamo(o)) return false;
  const enviados = o.recordatorios_enviados ?? 0;
  if (enviados >= cobro.max_recordatorios) return false;
  if (ahoraMs - o.creado_en.toMillis() < cobro.plazo_pago_horas * HORA_MS) {
    return false;
  }
  const ultimo = o.ultimo_recordatorio_en?.toMillis();
  if (ultimo && ahoraMs - ultimo < cobro.intervalo_recordatorios_horas * HORA_MS) {
    return false;
  }
  const hora = horaColombia(ahoraMs);
  const {desde, hasta} = cobro.horario_recordatorios;
  return hora >= desde && hora < hasta;
}

/**
 * Mueve un instante al horario permitido de recordatorios (hora Colombia).
 * @param {number} ms Instante deseado.
 * @param {PoliticaCobro} cobro Política.
 * @return {number} Mismo instante o el próximo inicio de horario.
 */
function enHorario(ms: number, cobro: PoliticaCobro): number {
  const {desde, hasta} = cobro.horario_recordatorios;
  const hora = horaColombia(ms);
  if (hora >= desde && hora < hasta) return ms;
  const inicioHoy = inicioDiaColombia(ms) + desde * HORA_MS;
  return inicioHoy > ms ? inicioHoy : inicioHoy + 24 * HORA_MS;
}

/**
 * Próximo momento en que hay algo que hacer con el cobro (recordatorio o
 * bloqueo), o null si ya no hay nada (pagado, o avisos y bloqueo agotados).
 * @param {CobroPendiente} o Cobro.
 * @param {PoliticaCobro} cobro Política de la operación.
 * @return {number | null} Momento (ms epoch).
 */
export function siguienteRevision(
  o: CobroPendiente,
  cobro: PoliticaCobro
): number | null {
  if (o.estado !== undefined && o.estado !== 'PENDIENTE') return null;
  if (enReclamo(o)) return null;
  const creado = o.creado_en.toMillis();
  const candidatos: number[] = [];

  if ((o.recordatorios_enviados ?? 0) < cobro.max_recordatorios) {
    const ultimo = o.ultimo_recordatorio_en?.toMillis();
    const desde = Math.max(
      creado + cobro.plazo_pago_horas * HORA_MS,
      ultimo ? ultimo + cobro.intervalo_recordatorios_horas * HORA_MS : 0
    );
    candidatos.push(enHorario(desde, cobro));
  }
  if (!o.bloqueo_aplicado) candidatos.push(o.bloquear_desde.toMillis());
  return candidatos.length ? Math.min(...candidatos) : null;
}

/**
 * Revisa UN cobro: envía el recordatorio si toca, bloquea al tutor si venció
 * y devuelve cuándo hay que volver a revisarlo (null = no hace falta).
 *
 * Idempotente: el estado del cobro se lee y actualiza en una transacción y
 * cada recordatorio tiene un id determinista (cobro + número), así una
 * revisión repetida o en paralelo nunca envía dos avisos.
 * @param {Firestore} db Firestore.
 * @param {string} obligacionId Cobro (obligación COBRO_TUTOR).
 * @param {PoliticaCobro} cobro Política de la operación.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<number | null>} Próxima revisión (ms epoch) o null.
 */
export async function revisarCobro(
  db: Firestore,
  obligacionId: string,
  cobro: PoliticaCobro,
  ahora: Timestamp
): Promise<number | null> {
  const ref = db.collection(COLECCION.OBLIGACIONES).doc(obligacionId);
  const ahoraMs = ahora.toMillis();

  const revisado = await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data();
    if (!data || data.estado !== 'PENDIENTE') return null;
    const o = {...(data as CobroPendiente), id: obligacionId};
    if (enReclamo(o)) return null;
    const cambios: Record<string, unknown> = {};

    if (debeRecordar(o, cobro, ahoraMs)) {
      const numero = (o.recordatorios_enviados ?? 0) + 1;
      await notificar(db, {
        tipo: 'COBRO_PENDIENTE',
        uid: o.deudor,
        dedup_key: `${obligacionId}_recordatorio_${numero}`,
        datos: {
          operacion_id: o.operacion_id,
          paseo_id: o.operacion_servicio_id ?? '',
          valor: o.valor,
        },
        ahora,
      }, tx);
      cambios.recordatorios_enviados = numero;
      cambios.ultimo_recordatorio_en = ahora;
    }

    const bloquear = !o.bloqueo_aplicado && ahoraMs >= o.bloquear_desde.toMillis();
    if (Object.keys(cambios).length > 0) tx.update(ref, cambios);
    return {o: {...o, ...cambios} as CobroPendiente, bloquear};
  });
  if (!revisado) return null;

  // El bloqueo recalcula el estado del tutor (idempotente) y luego se marca
  if (revisado.bloquear) {
    await recalcularBloqueo(db, revisado.o.deudor, ahora);
    await ref.update({bloqueo_aplicado: true});
    revisado.o.bloqueo_aplicado = true;
  }

  const siguiente = siguienteRevision(revisado.o, cobro);
  // Nunca agendar en el pasado: si ya tocaba, se revisa en un minuto
  return siguiente === null ? null : Math.max(siguiente, ahoraMs + 60 * 1000);
}
