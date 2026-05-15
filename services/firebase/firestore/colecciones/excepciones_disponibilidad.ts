import { db } from '@/firebase.config'
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import type {
  ExcepcionDisponibilidad,
  OverrideDia,
} from '@/models/ExcepcionDisponibilidad'

const COLECCION = 'excepciones_disponibilidad'
const SUBCOLECCION = 'semanas'

/**
 * Servicio de persistencia para excepciones de disponibilidad semanal.
 * Ruta: excepciones_disponibilidad/{uid_cuidador}/semanas/{isoWeek}
 */
export class ServicioExcepcionesDisponibilidad {
  private static ref(uid: string, semana: string) {
    return doc(db, COLECCION, uid, SUBCOLECCION, semana)
  }

  /** Obtiene la excepción de una semana específica. Devuelve null si no existe. */
  static async obtener(
    uid: string,
    semana: string
  ): Promise<ExcepcionDisponibilidad | null> {
    const snap = await getDoc(this.ref(uid, semana))
    if (!snap.exists()) return null
    return snap.data() as ExcepcionDisponibilidad
  }

  /** Crea o sobreescribe la excepción de una semana. */
  static async guardar(
    uid: string,
    semana: string,
    overrides: Record<string, OverrideDia>
  ): Promise<void> {
    const data: ExcepcionDisponibilidad = {
      uid_cuidador: uid,
      semana,
      overrides,
      actualizado_en: serverTimestamp(),
    }
    await setDoc(this.ref(uid, semana), data)
  }

  /** Elimina la excepción de una semana (vuelve al horario_semanal base). */
  static async eliminar(uid: string, semana: string): Promise<void> {
    await deleteDoc(this.ref(uid, semana))
  }
}
