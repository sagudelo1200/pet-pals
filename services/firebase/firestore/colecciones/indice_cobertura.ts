import { db } from '@/firebase.config'
import {
  doc,
  collection,
  writeBatch,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { celdasDeCobertura } from '@/services/geo'
import { ServicioZonasH3 } from './h3_zonas'
import type { CrudResult } from '@/services/firebase/comun'

const COLECCION_BASE = 'indice_cobertura'
const SUBCOLECCION = 'cuidadores'

/**
 * Entrada desnormalizada del walker en el índice de cobertura.
 * Incluye todos los campos necesarios para renderizar la lista y filtrar disponibilidad.
 */
export interface EntradaCuidadorCobertura {
  uid: string
  nombre: string
  foto?: string
  rating_promedio: number
  tarifa_por_hora: number
  verificacion: string
  horario_laboral?: {
    dias: number[]
    hora_inicio: string
    hora_fin: string
  }
  /** Celda H3 de origen del walker (su dirección principal) */
  h3_origen: string
  actualizado_en?: unknown
}

/**
 * Servicio de índice de cobertura geoespacial.
 * Mantiene `/indice_cobertura/{celda}/cuidadores/{uid}` con escrituras en batch
 * sobre todas las celdas de cobertura del walker (kRing=2, ≈19 celdas, ≈2km).
 */
export class ServicioIndiceCobertura {
  /**
   * Registra o actualiza la cobertura de un walker en todas sus celdas H3.
   * Llama primero con `h3OrigenAnterior` distinto para migrar la cobertura.
   */
  static async escribirCoberturaWalker(
    uid: string,
    h3Origen: string,
    datos: Omit<
      EntradaCuidadorCobertura,
      'uid' | 'h3_origen' | 'actualizado_en'
    >
  ): Promise<void> {
    const celdas = celdasDeCobertura(h3Origen) // 19 celdas en kRing(2)
    const batch = writeBatch(db)

    const entrada: EntradaCuidadorCobertura = {
      ...datos,
      uid,
      h3_origen: h3Origen,
      actualizado_en: serverTimestamp(),
    }

    for (const celda of celdas) {
      const ref = doc(db, COLECCION_BASE, celda, SUBCOLECCION, uid)
      batch.set(ref, entrada)
    }

    await batch.commit()

    // Actualizar contador de cuidadores en h3_zonas (fire-and-forget, no bloqueante)
    Promise.all(
      celdas.map(celda =>
        ServicioZonasH3.actualizarZona(celda, { cuidadores_count: 1 })
      )
    ).catch(e =>
      console.warn('[ServicioIndiceCobertura] Error actualizando zonas:', e)
    )
  }

  /**
   * Elimina la cobertura de un walker de todas sus celdas H3 anteriores.
   * Usar antes de `escribirCoberturaWalker` cuando el walker cambia de dirección.
   */
  static async eliminarCoberturaWalker(
    h3OrigenAnterior: string,
    uid: string
  ): Promise<void> {
    const celdas = celdasDeCobertura(h3OrigenAnterior)
    const batch = writeBatch(db)

    for (const celda of celdas) {
      const ref = doc(db, COLECCION_BASE, celda, SUBCOLECCION, uid)
      batch.delete(ref)
    }

    await batch.commit()

    Promise.all(
      celdas.map(celda =>
        ServicioZonasH3.actualizarZona(celda, { cuidadores_count: -1 })
      )
    ).catch(e =>
      console.warn('[ServicioIndiceCobertura] Error decrementando zonas:', e)
    )
  }

  /**
   * Obtiene todos los walkers cuya cobertura incluye la celda H3 indicada.
   * Complejidad O(1) en Firestore: un getDocs simple sobre la subcolección.
   */
  static async obtenerCuidadoresPorCelda(
    indiceCelda: string
  ): Promise<CrudResult<EntradaCuidadorCobertura[]>> {
    try {
      const colRef = collection(db, COLECCION_BASE, indiceCelda, SUBCOLECCION)
      const snaps = await getDocs(colRef)
      return {
        success: true,
        data: snaps.docs.map(d => d.data() as EntradaCuidadorCobertura),
      }
    } catch (err) {
      console.warn(
        '[ServicioIndiceCobertura] Error obteniendo cuidadores:',
        err
      )
      return { success: true, data: [] }
    }
  }
}
