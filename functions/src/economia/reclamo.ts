/* eslint-disable camelcase */
/**
 * Reclamo del tutor sobre un cobro generado porque el equipo cerró la entrega
 * ("No estoy de acuerdo"). Mientras esté abierto se pausa la cobranza (sin
 * recordatorios ni bloqueo); el equipo lo resuelve manteniendo el cobro o
 * anulándolo.
 *
 * Solo aplica a cobros con origen `cierre_equipo` y dentro de la ventana
 * (`reclamo_hasta`, calculada con la política con la que nació el paseo).
 */
import type {Firestore, Timestamp} from 'firebase-admin/firestore';
import {ErrorNegocio} from '../comun/errores';
import {validarMotivo} from '../compartido/versionables';
import {recalcularBloqueo} from './cobranza';
import {COLECCION} from './tipos';

export const ORIGEN_CIERRE_EQUIPO = 'cierre_equipo';

export type DecisionReclamo = 'mantener' | 'anular';

/**
 * Marca un cobro como nacido de un cierre del equipo, con su ventana de reclamo.
 * @param {Firestore} db Firestore.
 * @param {string} obligacionId Cobro del tutor.
 * @param {Timestamp} reclamoHasta Fin de la ventana de reclamo.
 */
export async function marcarCobroCerradoPorEquipo(
  db: Firestore,
  obligacionId: string,
  reclamoHasta: Timestamp
): Promise<void> {
  await db.collection(COLECCION.OBLIGACIONES).doc(obligacionId).update({
    origen: ORIGEN_CIERRE_EQUIPO,
    reclamo_hasta: reclamoHasta,
  });
}

/**
 * El tutor abre un reclamo sobre un cobro pendiente cerrado por el equipo.
 * @param {Firestore} db Firestore.
 * @param {string} uid Tutor autenticado (debe ser el deudor).
 * @param {string} obligacionId Cobro.
 * @param {string} motivo Motivo del reclamo.
 * @param {Timestamp} ahora Momento.
 */
export async function abrirReclamoCobro(
  db: Firestore,
  uid: string,
  obligacionId: string,
  motivo: unknown,
  ahora: Timestamp
): Promise<void> {
  const errorMotivo = validarMotivo(motivo);
  if (errorMotivo) throw new ErrorNegocio('invalid-argument', errorMotivo);

  const ref = db.collection(COLECCION.OBLIGACIONES).doc(obligacionId);
  await db.runTransaction(async (tx) => {
    const cobro = (await tx.get(ref)).data();
    if (!cobro || cobro.tipo !== 'COBRO_TUTOR' || cobro.deudor !== uid) {
      throw new ErrorNegocio('not-found', 'No encontramos ese cobro');
    }
    if (cobro.estado !== 'PENDIENTE') {
      throw new ErrorNegocio('failed-precondition',
        'Solo se puede reclamar un cobro pendiente');
    }
    if (cobro.origen !== ORIGEN_CIERRE_EQUIPO) {
      throw new ErrorNegocio('failed-precondition',
        'Este cobro no se puede reclamar: lo confirmaste con tu código');
    }
    const hasta = cobro.reclamo_hasta as Timestamp | undefined;
    if (!hasta || hasta.toMillis() < ahora.toMillis()) {
      throw new ErrorNegocio('failed-precondition',
        'El plazo para reclamar este cobro ya venció');
    }
    if (cobro.reclamo) {
      throw new ErrorNegocio('failed-precondition',
        'Este cobro ya tiene un reclamo');
    }
    tx.update(ref, {
      reclamo: {estado: 'ABIERTO', en: ahora, motivo: String(motivo).trim()},
    });
  });
  // Un cobro en reclamo ya no bloquea al tutor
  await recalcularBloqueo(db, uid, ahora);
}

/**
 * El equipo resuelve un reclamo: mantiene el cobro (se reanuda la cobranza) o
 * lo anula.
 * @param {Firestore} db Firestore.
 * @param {string} obligacionId Cobro.
 * @param {DecisionReclamo} decision Mantener o anular.
 * @param {object} opciones Admin que resuelve, motivo y momento.
 * @return {Promise<string>} UID del tutor deudor.
 */
export async function resolverReclamoCobro(
  db: Firestore,
  obligacionId: string,
  decision: DecisionReclamo,
  opciones: {por: string; motivo: unknown; ahora: Timestamp}
): Promise<string> {
  const errorMotivo = validarMotivo(opciones.motivo);
  if (errorMotivo) throw new ErrorNegocio('invalid-argument', errorMotivo);
  if (decision !== 'mantener' && decision !== 'anular') {
    throw new ErrorNegocio('invalid-argument', 'Decisión no válida');
  }

  const ref = db.collection(COLECCION.OBLIGACIONES).doc(obligacionId);
  const tutor = await db.runTransaction(async (tx) => {
    const cobro = (await tx.get(ref)).data();
    if (!cobro || cobro.tipo !== 'COBRO_TUTOR') {
      throw new ErrorNegocio('not-found', 'No encontramos ese cobro');
    }
    if (cobro.reclamo?.estado !== 'ABIERTO') {
      throw new ErrorNegocio('failed-precondition',
        'El cobro no tiene un reclamo abierto');
    }
    tx.update(ref, {
      reclamo: {
        ...cobro.reclamo,
        estado: decision === 'anular' ? 'ACEPTADO' : 'RECHAZADO',
        resuelto_por: opciones.por,
        resuelto_en: opciones.ahora,
        resolucion_motivo: String(opciones.motivo).trim(),
      },
      ...(decision === 'anular' && {estado: 'ANULADA'}),
    });
    return cobro.deudor as string;
  });
  await recalcularBloqueo(db, tutor, opciones.ahora);
  return tutor;
}
