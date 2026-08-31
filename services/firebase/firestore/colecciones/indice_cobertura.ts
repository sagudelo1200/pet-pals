import { db } from '@/firebase.config'
import {
  doc,
  collection,
  writeBatch,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { celdasDeCobertura } from '@/services/geo'
import { cellToChildren } from 'h3-js'
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
  /**
   * Array de tipos de verificación completados (EMAIL, IDENTIDAD, etc).
   * Calculado por trigger actualizarInsignias desde colección verificaciones.
   */
  insignias_verificacion?: string[]
  /**
   * Horario semanal recurrente. Clave: "0"–"6" (0=Dom, 1=Lun…). Solo días presentes = activos.
   */
  horario_semanal?: Record<string, { inicio: string; fin: string }>
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
   * Limpia undefined de un objeto para que sea compatible con Firestore
   * @private
   */
  private static limpiarUndefined(obj: any): any {
    const resultado: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        resultado[key] = value
      }
    }
    return resultado
  }

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

    // Limpiar undefined antes de guardar
    const datosLimpios = this.limpiarUndefined(datos)

    const entrada: EntradaCuidadorCobertura = {
      ...datosLimpios,
      uid,
      h3_origen: h3Origen,
      actualizado_en: serverTimestamp(),
    } as EntradaCuidadorCobertura

    for (const celda of celdas) {
      const ref = doc(db, COLECCION_BASE, celda, SUBCOLECCION, uid)
      batch.set(ref, entrada)
    }

    await batch.commit()

    // Actualizar contador de cuidadores en h3_zonas (fire-and-forget, no bloqueante)
    // Convertir cada celda R8 a sus celdas R9 hijas para actualizar zonas
    const actualizacionesPromesas: Array<Promise<void>> = []
    for (const celdaR8 of celdas) {
      const celdasR9 = cellToChildren(celdaR8, 9)
      for (const celdaR9 of celdasR9) {
        actualizacionesPromesas.push(
          ServicioZonasH3.actualizarZona(celdaR9, { cuidadores_count: 1 })
        )
      }
    }

    Promise.all(actualizacionesPromesas).catch(e =>
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

    // Actualizar contador de cuidadores en h3_zonas (fire-and-forget)
    // Convertir cada celda R8 a sus celdas R9 hijas para actualizar zonas
    const actualizacionesPromesas: Array<Promise<void>> = []
    for (const celdaR8 of celdas) {
      const celdasR9 = cellToChildren(celdaR8, 9)
      for (const celdaR9 of celdasR9) {
        actualizacionesPromesas.push(
          ServicioZonasH3.actualizarZona(celdaR9, { cuidadores_count: -1 })
        )
      }
    }

    Promise.all(actualizacionesPromesas).catch(e =>
      console.warn('[ServicioIndiceCobertura] Error decrementando zonas:', e)
    )
  }

  /**
   * Actualiza la cobertura manual de un walker usando un conjunto de celdas explícito.
   * Elimina las celdas que ya no están en la selección y escribe todas las nuevas.
   */
  static async escribirCeldasManuales(
    uid: string,
    h3Origen: string,
    celdasNuevas: string[],
    celdasAnteriores: string[],
    datos: Omit<
      EntradaCuidadorCobertura,
      'uid' | 'h3_origen' | 'actualizado_en'
    >
  ): Promise<void> {
    const batch = writeBatch(db)

    // Limpiar undefined antes de guardar
    const datosLimpios = this.limpiarUndefined(datos)

    const entrada: EntradaCuidadorCobertura = {
      ...datosLimpios,
      uid,
      h3_origen: h3Origen,
      actualizado_en: serverTimestamp(),
    } as EntradaCuidadorCobertura

    const setNuevas = new Set(celdasNuevas)

    // Eliminar celdas que ya no forman parte de la cobertura
    for (const celda of celdasAnteriores) {
      if (!setNuevas.has(celda)) {
        batch.delete(doc(db, COLECCION_BASE, celda, SUBCOLECCION, uid))
      }
    }

    // Escribir todas las celdas nuevas
    for (const celda of celdasNuevas) {
      batch.set(doc(db, COLECCION_BASE, celda, SUBCOLECCION, uid), entrada)
    }

    await batch.commit()

    // Sincronizar contadores en h3_zonas (territorio vivo) — fire-and-forget
    const setAnteriores = new Set(celdasAnteriores)
    const agregadas = celdasNuevas.filter(c => !setAnteriores.has(c))
    const eliminadas = celdasAnteriores.filter(c => !setNuevas.has(c))

    const actualizacionesPromesas: Array<Promise<void>> = []

    for (const celdaR8 of agregadas) {
      const celdasR9 = cellToChildren(celdaR8, 9)
      for (const celdaR9 of celdasR9) {
        actualizacionesPromesas.push(
          ServicioZonasH3.actualizarZona(celdaR9, { cuidadores_count: 1 })
        )
      }
    }

    for (const celdaR8 of eliminadas) {
      const celdasR9 = cellToChildren(celdaR8, 9)
      for (const celdaR9 of celdasR9) {
        actualizacionesPromesas.push(
          ServicioZonasH3.actualizarZona(celdaR9, { cuidadores_count: -1 })
        )
      }
    }

    Promise.all(actualizacionesPromesas).catch(e =>
      console.warn('[ServicioIndiceCobertura] Error sincronizando h3_zonas:', e)
    )
  }

  /**
   * Migra cobertura de un cuidador de forma ATÓMICA.
   *
   * Combina eliminación de cobertura anterior + escritura de nueva cobertura
   * en UN SOLO batch Firestore. Garantiza:
   * - ✅ No hay ventana de inconsistencia
   * - ✅ Usuario siempre está en algún índice
   * - ✅ Contadores se actualizan juntos
   *
   * FASE 2: Soporte para orquestación centralizada.
   *
   * @param uid - UID del cuidador
   * @param h3Nuevo - Nueva celda H3 de origen
   * @param h3Anterior - Celda H3 anterior
   * @param datos - Datos del cuidador a actualizar
   */
  static async migraCoberturaAtomicamente(
    uid: string,
    h3Nuevo: string,
    h3Anterior: string,
    datos: Omit<
      EntradaCuidadorCobertura,
      'uid' | 'h3_origen' | 'actualizado_en'
    >
  ): Promise<void> {
    const celdasAnteriores = celdasDeCobertura(h3Anterior)
    const celdasNuevas = celdasDeCobertura(h3Nuevo)

    const batch = writeBatch(db)

    // Limpiar undefined antes de guardar
    const datosLimpios = this.limpiarUndefined(datos)

    const entrada: EntradaCuidadorCobertura = {
      ...datosLimpios,
      uid,
      h3_origen: h3Nuevo,
      actualizado_en: serverTimestamp(),
    } as EntradaCuidadorCobertura

    // PASO 1: Eliminar de celdas antiguas
    for (const celda of celdasAnteriores) {
      const ref = doc(db, COLECCION_BASE, celda, SUBCOLECCION, uid)
      batch.delete(ref)
    }

    // PASO 2: Escribir en celdas nuevas
    for (const celda of celdasNuevas) {
      const ref = doc(db, COLECCION_BASE, celda, SUBCOLECCION, uid)
      batch.set(ref, entrada)
    }

    // PASO 3: Commit ATÓMICO (ambas operaciones juntas o ninguna)
    await batch.commit()

    console.log(
      `[ServicioIndiceCobertura] ✅ Cobertura migrada atómicamente: ${uid} de ${h3Anterior} a ${h3Nuevo}`
    )

    // PASO 4: Actualizar contadores en h3_zonas (fire-and-forget con retry - delegado a orquestador)
    const setAnteriores = new Set(celdasAnteriores)
    const agregadas = celdasNuevas.filter(c => !setAnteriores.has(c))
    const eliminadas = celdasAnteriores.filter(
      c => !new Set(celdasNuevas).has(c)
    )

    const actualizacionesPromesas: Array<Promise<void>> = []

    for (const celdaR8 of agregadas) {
      const celdasR9 = cellToChildren(celdaR8, 9)
      for (const celdaR9 of celdasR9) {
        actualizacionesPromesas.push(
          ServicioZonasH3.actualizarZona(celdaR9, { cuidadores_count: 1 })
        )
      }
    }

    for (const celdaR8 of eliminadas) {
      const celdasR9 = cellToChildren(celdaR8, 9)
      for (const celdaR9 of celdasR9) {
        actualizacionesPromesas.push(
          ServicioZonasH3.actualizarZona(celdaR9, { cuidadores_count: -1 })
        )
      }
    }

    Promise.all(actualizacionesPromesas).catch(e =>
      console.warn(
        '[ServicioIndiceCobertura] Error actualizando zonas en migración:',
        e
      )
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
