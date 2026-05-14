import { db } from '@/firebase.config'
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { calcularEstadoZona, type EstadoZona } from '@/services/geo'
import { mapFirebaseError, type CrudResult } from '@/services/firebase/comun'

const COLECCION = 'h3_zonas'

/** Representa el estado territorial de una celda H3 */
export interface ZonaH3 {
  indice_celda: string
  cuidadores_count: number
  demanda_total: number
  paseos_activos: number
  paseos_total: number
  estado: EstadoZona
  ratio_cobertura: number
  ultima_demanda_en?: Date
  ultima_actividad_en?: Date
  actualizado_en?: Date
}

export interface DeltaZona {
  cuidadores_count?: number
  demanda_total?: number
  paseos_activos?: number
  paseos_total?: number
  /** Si true, escribe `ultima_demanda_en = serverTimestamp()` */
  marcar_demanda?: boolean
  /** Si true, escribe `ultima_actividad_en = serverTimestamp()` */
  marcar_actividad?: boolean
}

/**
 * Servicio de inteligencia territorial H3.
 * Mantiene el estado operativo de cada celda geográfica en la plataforma.
 */
export class ServicioZonasH3 {
  /**
   * Aplica un delta a los contadores de una zona y recalcula su estado.
   * Usa read-before-write para garantizar consistencia de los contadores.
   */
  static async actualizarZona(
    indiceCelda: string,
    delta: DeltaZona
  ): Promise<void> {
    try {
      const ref = doc(db, COLECCION, indiceCelda)
      const snap = await getDoc(ref)
      const actual = snap.data() ?? {}

      const cuidadores = Math.max(
        0,
        (actual.cuidadores_count || 0) + (delta.cuidadores_count || 0)
      )
      const demanda = Math.max(
        0,
        (actual.demanda_total || 0) + (delta.demanda_total || 0)
      )
      const activos = Math.max(
        0,
        (actual.paseos_activos || 0) + (delta.paseos_activos || 0)
      )
      const totales = Math.max(
        0,
        (actual.paseos_total || 0) + (delta.paseos_total || 0)
      )

      const estado = calcularEstadoZona({
        cuidadores_count: cuidadores,
        demanda_total: demanda,
        paseos_activos: activos,
      })

      const datos: Record<string, unknown> = {
        indice_celda: indiceCelda,
        cuidadores_count: cuidadores,
        demanda_total: demanda,
        paseos_activos: activos,
        paseos_total: totales,
        estado,
        ratio_cobertura: cuidadores / Math.max(demanda, 1),
        actualizado_en: serverTimestamp(),
      }

      if (delta.marcar_demanda) datos.ultima_demanda_en = serverTimestamp()
      if (delta.marcar_actividad) datos.ultima_actividad_en = serverTimestamp()

      await setDoc(ref, datos, { merge: true })
    } catch (err) {
      console.warn(
        '[ServicioZonasH3] Error actualizando zona:',
        indiceCelda,
        err
      )
    }
  }

  static async obtenerZona(indiceCelda: string): Promise<ZonaH3 | null> {
    try {
      const snap = await getDoc(doc(db, COLECCION, indiceCelda))
      return snap.exists() ? (snap.data() as ZonaH3) : null
    } catch {
      return null
    }
  }

  static async obtenerZonasSinCobertura(): Promise<CrudResult<ZonaH3[]>> {
    try {
      const q = query(
        collection(db, COLECCION),
        where('estado', '==', 'sin_cobertura')
      )
      const snaps = await getDocs(q)
      return { success: true, data: snaps.docs.map(d => d.data() as ZonaH3) }
    } catch (err: unknown) {
      return { success: false, error: mapFirebaseError(err) }
    }
  }

  static async obtenerZonasActivas(): Promise<CrudResult<ZonaH3[]>> {
    try {
      const q = query(
        collection(db, COLECCION),
        where('estado', 'in', ['activa', 'en_operacion'])
      )
      const snaps = await getDocs(q)
      return { success: true, data: snaps.docs.map(d => d.data() as ZonaH3) }
    } catch (err: unknown) {
      return { success: false, error: mapFirebaseError(err) }
    }
  }

  /**
   * Suscripción en tiempo real a todas las zonas H3.
   * Devuelve la función de cancelación de la suscripción.
   */
  static suscribirATodas(
    callback: (zonas: ZonaH3[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const q = collection(db, COLECCION)
    return onSnapshot(
      q,
      snap => callback(snap.docs.map(d => d.data() as ZonaH3)),
      err => {
        console.warn('[ServicioZonasH3] Error en suscripción:', err)
        onError?.(err)
      }
    )
  }
}
