/* eslint-disable camelcase */
/**
 * Único punto de entrada para avisar a un usuario.
 *
 * Crea el aviso en su bandeja (usuarios/{uid}/notificaciones) con el texto y
 * la acción del catálogo (compartido/notificaciones.ts). Con `dedup_key` el
 * id del documento es determinista: avisar dos veces lo mismo no duplica.
 */
import type {Firestore, Transaction} from 'firebase-admin/firestore';
import {Timestamp} from 'firebase-admin/firestore';
import {
  CATALOGO_NOTIFICACIONES,
  COLECCION_NOTIFICACIONES,
  type DatosNotificacion,
  type TipoNotificacion,
} from '../compartido/notificaciones';

export interface SolicitudNotificacion {
  tipo: TipoNotificacion
  /** Destinatario. */
  uid: string
  datos?: DatosNotificacion
  /** Id determinista del aviso; sin él se genera uno nuevo cada vez. */
  dedup_key?: string
  ahora?: Timestamp
}

/**
 * Crea la notificación en la bandeja del usuario.
 * Con `tx` la escritura forma parte de esa transacción (el llamador debe
 * haber hecho antes todas sus lecturas).
 * @param {Firestore} db Firestore.
 * @param {SolicitudNotificacion} solicitud Qué avisar y a quién.
 * @param {Transaction} tx Transacción opcional.
 * @return {Promise<boolean>} true si se creó; false si ya existía (dedup_key).
 */
export async function notificar(
  db: Firestore,
  solicitud: SolicitudNotificacion,
  tx?: Transaction
): Promise<boolean> {
  const {tipo, uid, dedup_key} = solicitud;
  if (!uid) {
    console.warn(`[notificar] ${tipo}: sin destinatario, se omite`);
    return false;
  }

  const definicion = CATALOGO_NOTIFICACIONES[tipo];
  const datos = solicitud.datos ?? {};
  const bandeja = db.collection('usuarios').doc(uid)
    .collection(COLECCION_NOTIFICACIONES);
  const ref = dedup_key ? bandeja.doc(dedup_key) : bandeja.doc();

  const documento = {
    tipo,
    categoria: definicion.categoria,
    ...definicion.plantilla(datos),
    datos: {...datos, accion: definicion.accion},
    leido: false,
    creado_en: solicitud.ahora ?? Timestamp.now(),
  };

  if (tx) {
    if ((await tx.get(ref)).exists) return false;
    tx.set(ref, documento);
    return true;
  }
  if (!dedup_key) {
    await ref.set(documento);
    return true;
  }
  try {
    await ref.create(documento);
    return true;
  } catch (error) {
    if ((error as {code?: number | string}).code === 6 ||
      (error as {code?: number | string}).code === 'already-exists') {
      return false;
    }
    throw error;
  }
}
