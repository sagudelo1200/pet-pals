// ---------- Consultas de dominio (builders de queries Firestore) ----------
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  type Query,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import { ESTADOS_PASEO } from '@/models/Paseo'
import { ServicioPaseo } from '@/services/firebase'

/**
 * Obtiene la query para los paseos de un tutor.
 */
export function obtenerQueryPaseosTutor(uid: string): Query {
  return query(
    collection(db, 'paseos'),
    where('creado_por', '==', uid),
    orderBy('fecha_hora_inicio', 'desc'),
    limit(30)
  )
}

/**
 * Obtiene la query para las solicitudes pendientes (mercado abierto).
 */
export function obtenerQuerySolicitudesPendientes(): Query {
  return ServicioPaseo.getQuerySolicitudesPendientes()
}

/**
 * Obtiene la query para los paseos próximos de un cuidador.
 */
export function obtenerQueryAgendaCuidador(uid: string): Query {
  return query(
    collection(db, 'paseos'),
    where('id_cuidador', '==', uid),
    where('estado', 'in', [
      ESTADOS_PASEO.CONFIRMADO,
      ESTADOS_PASEO.EN_CAMINO,
      ESTADOS_PASEO.EN_PUNTO_RECOGIDA,
      ESTADOS_PASEO.EN_PROGRESO,
    ]),
    orderBy('fecha_hora_inicio', 'asc')
  )
}

/**
 * Obtiene la query para el historial de paseos de un cuidador.
 */
export function obtenerQueryHistorialCuidador(uid: string): Query {
  return query(
    collection(db, 'paseos'),
    where('id_cuidador', '==', uid),
    where('estado', 'in', [
      ESTADOS_PASEO.COMPLETADO,
      ESTADOS_PASEO.FINALIZADO,
      ESTADOS_PASEO.CANCELADO,
    ]),
    orderBy('fecha_hora_inicio', 'desc'),
    limit(30)
  )
}

/**
 * Obtiene la query para monitorear el paseo activo global de un usuario.
 */
export function obtenerQueryMonitorPaseoGlobal(uid: string): Query {
  return query(
    collection(db, 'paseos'),
    where('creado_por', '==', uid),
    where('estado', 'in', [
      ESTADOS_PASEO.CONFIRMADO,
      ESTADOS_PASEO.EN_CAMINO,
      ESTADOS_PASEO.EN_PROGRESO,
      ESTADOS_PASEO.FINALIZADO,
    ]),
    orderBy('creado_en', 'desc'),
    limit(1)
  )
}
