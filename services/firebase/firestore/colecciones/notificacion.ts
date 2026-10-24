/* eslint-disable no-unused-vars */
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import {
  COLECCION_NOTIFICACIONES,
  COLECCION_PREFERENCIAS,
  DOC_PREFERENCIAS_NOTIFICACIONES,
  type PreferenciasNotificacion,
} from '@/functions/src/compartido/notificaciones'
import { toDomain } from '@/services/firebase/comun'
import type { Notificacion } from '@/models/Notificacion'

/** Tope de avisos que se cargan en la bandeja. */
const LIMITE_BANDEJA = 50
/** Tope para contar no leídos (la UI muestra "99+" desde aquí). */
export const LIMITE_CONTADOR = 100

const bandeja = (uid: string) =>
  collection(db, 'usuarios', uid, COLECCION_NOTIFICACIONES)

/**
 * ServicioNotificacion
 *
 * Bandeja del usuario (usuarios/{uid}/notificaciones) y sus dispositivos para
 * push (usuarios/{uid}/dispositivos). Los avisos los crea el servidor.
 */
export class ServicioNotificacion {
  /** Escucha en tiempo real los avisos más recientes. */
  static escuchar(
    uid: string,
    alCambiar: (avisos: Notificacion[]) => void,
    alFallar?: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      bandeja(uid),
      orderBy('creado_en', 'desc'),
      limit(LIMITE_BANDEJA)
    )
    return onSnapshot(
      q,
      snap =>
        alCambiar(
          snap.docs.map(
            d => ({ id: d.id, ...toDomain(d.data()) }) as Notificacion
          )
        ),
      alFallar
    )
  }

  /** Escucha cuántos avisos sin leer hay (hasta LIMITE_CONTADOR). */
  static escucharNoLeidas(
    uid: string,
    alCambiar: (cantidad: number) => void
  ): Unsubscribe {
    const q = query(
      bandeja(uid),
      where('leido', '==', false),
      limit(LIMITE_CONTADOR)
    )
    return onSnapshot(
      q,
      snap => alCambiar(snap.size),
      () => alCambiar(0)
    )
  }

  static async marcarLeida(uid: string, id: string): Promise<void> {
    await updateDoc(doc(bandeja(uid), id), {
      leido: true,
      leido_en: serverTimestamp(),
    })
  }

  static async marcarTodasLeidas(uid: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return
    const batch = writeBatch(db)
    ids.forEach(id =>
      batch.update(doc(bandeja(uid), id), {
        leido: true,
        leido_en: serverTimestamp(),
      })
    )
    await batch.commit()
  }

  /** Preferencias del usuario; lo que no eligió cuenta como activado. */
  static async obtenerPreferencias(
    uid: string
  ): Promise<PreferenciasNotificacion> {
    const snap = await getDoc(refPreferencias(uid))
    const datos = snap.data() ?? {}
    return { push: datos.push !== false, email: datos.email !== false }
  }

  static async guardarPreferencias(
    uid: string,
    preferencias: PreferenciasNotificacion
  ): Promise<void> {
    await setDoc(refPreferencias(uid), preferencias)
  }

  /** Guarda (o reactiva) el token de push de este dispositivo. */
  static async registrarDispositivo(
    uid: string,
    token: string,
    plataforma: string
  ): Promise<void> {
    await setDoc(
      doc(db, 'usuarios', uid, 'dispositivos', idDispositivo(token)),
      { token, plataforma, activo: true, actualizado_en: serverTimestamp() },
      { merge: true }
    )
  }

  /** Desactiva el token de este dispositivo (al cerrar sesión). */
  static async desactivarDispositivo(uid: string, token: string): Promise<void> {
    await setDoc(
      doc(db, 'usuarios', uid, 'dispositivos', idDispositivo(token)),
      { activo: false, actualizado_en: serverTimestamp() },
      { merge: true }
    )
  }
}

const refPreferencias = (uid: string) =>
  doc(
    db,
    'usuarios',
    uid,
    COLECCION_PREFERENCIAS,
    DOC_PREFERENCIAS_NOTIFICACIONES
  )

/** Id del documento: el token sin caracteres no válidos para un id. */
export const idDispositivo = (token: string): string =>
  token.replace(/[^A-Za-z0-9_-]/g, '_')
