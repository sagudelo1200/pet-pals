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
import { calcularEstadoZona } from '@/services/geo'
import { mapFirebaseError, type CrudResult } from '@/services/firebase/comun'
import type { ZonaH3, OperativaSección, DeltaOperativa } from '@/models/ZonaH3'
import { cellToParent } from 'h3-js'

// ✅ Re-exportar tipos para disponibilidad pública
export type { ZonaH3, OperativaSección, DeltaOperativa }

const COLECCION = 'h3_zonas'

/**
 * Servicio de cobertura territorial H3.
 * Mantiene el estado OPERATIVO de cada celda geográfica (cuidadores, demanda, paseos).
 *
 * NOTA: Escribe en la sección `operativa` de la estructura unificada ZonaH3.
 * La sección `narrativa` es gestionada por ServicioTerritorio.
 */
export class ServicioZonasH3 {
  /**
   * Aplica un delta a los contadores de cobertura de una zona.
   * Escribe en la sección `operativa` del documento ZonaH3 unificado.
   * Si la zona no existe, la crea inicializando con los IDs H3.
   */
  static async actualizarZona(
    h3_r9: string,
    delta: DeltaOperativa
  ): Promise<void> {
    try {
      const ref = doc(db, COLECCION, h3_r9)
      const snap = await getDoc(ref)
      const actual = (snap.data() ?? {}) as any
      const esNuevo = !snap.exists()

      // Leer valores actuales de la sección operativa (si existe)
      const operativaActual = actual.operativa ?? {
        cuidadores_count: 0,
        demanda_total: 0,
        paseos_activos: 0,
        paseos_total: 0,
        estado: 'sin_cobertura' as const,
        ratio_cobertura: 0,
      }

      const cuidadores = Math.max(
        0,
        operativaActual.cuidadores_count + (delta.cuidadores_count || 0)
      )
      const demanda = Math.max(
        0,
        operativaActual.demanda_total + (delta.demanda_total || 0)
      )
      const activos = Math.max(
        0,
        operativaActual.paseos_activos + (delta.paseos_activos || 0)
      )
      const totales = Math.max(
        0,
        operativaActual.paseos_total + (delta.paseos_total || 0)
      )

      const estado = calcularEstadoZona({
        cuidadores_count: cuidadores,
        demanda_total: demanda,
        paseos_activos: activos,
      }) as OperativaSección['estado']

      // Construir nueva sección operativa
      const operativaActualizada: OperativaSección = {
        cuidadores_count: cuidadores,
        demanda_total: demanda,
        paseos_activos: activos,
        paseos_total: totales,
        estado,
        ratio_cobertura: cuidadores / Math.max(demanda, 1),
      }

      if (delta.marcar_demanda) {
        operativaActualizada.ultima_demanda_en = serverTimestamp() as any
      }
      if (delta.marcar_actividad) {
        operativaActualizada.ultima_actividad_en = serverTimestamp() as any
      }

      // Construir documento con IDs H3 cuando se crea por primera vez
      const docData: any = {
        operativa: operativaActualizada,
        actualizado_en: serverTimestamp(),
      }

      // Si es nueva, guardar también los IDs H3
      if (esNuevo) {
        const h3_r8 = cellToParent(h3_r9, 8) // Convertir R9 a R8
        docData.id = h3_r9
        docData.h3_r9 = h3_r9
        docData.h3_r8 = h3_r8
        docData.creado_en = serverTimestamp()
        // Inicializar narrativa vacía si es nueva
        if (!docData.narrativa) {
          docData.narrativa = {
            identidad: { tipo: 'otro', confianza: 30 },
            indices: {
              bienestar: 50,
              seguridad: 50,
              actividad: 50,
              socializacion: 50,
            },
            total_eventos: 0,
            eventos_por_tipo: {},
          }
        }
      }

      // Escribir documento con sección operativa actualizada
      // merge: true preserva sección narrativa cuando se actualiza
      await setDoc(ref, docData, { merge: !esNuevo })
    } catch (err) {
      console.warn('[ServicioZonasH3] Error actualizando zona:', h3_r9, err)
    }
  }

  /**
   * Obtiene una zona con ambas secciones (narrativa + operativa)
   */
  static async obtenerZona(h3_r9: string): Promise<ZonaH3 | null> {
    try {
      const snap = await getDoc(doc(db, COLECCION, h3_r9))
      return snap.exists() ? (snap.data() as ZonaH3) : null
    } catch {
      return null
    }
  }

  /**
   * Obtiene todas las zonas sin cobertura
   */
  static async obtenerZonasSinCobertura(): Promise<CrudResult<ZonaH3[]>> {
    try {
      const q = query(
        collection(db, COLECCION),
        where('operativa.estado', '==', 'sin_cobertura')
      )
      const snaps = await getDocs(q)
      return { success: true, data: snaps.docs.map(d => d.data() as ZonaH3) }
    } catch (err: unknown) {
      return { success: false, error: mapFirebaseError(err) }
    }
  }

  /**
   * Obtiene todas las zonas activas
   */
  static async obtenerZonasActivas(): Promise<CrudResult<ZonaH3[]>> {
    try {
      const q = query(
        collection(db, COLECCION),
        where('operativa.estado', 'in', ['activa', 'en_operacion'])
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
    callback: (_zonas: ZonaH3[]) => void,
    onError?: (_err: Error) => void
  ): () => void {
    console.log(
      '[ServicioZonasH3] 🔄 Abriendo suscripción a colección:',
      COLECCION
    )
    const q = collection(db, COLECCION)
    return onSnapshot(
      q,
      snap => {
        console.log(
          '[ServicioZonasH3] 📦 Snapshot recibido:',
          snap.docs.length,
          'documentos'
        )
        if (snap.docs.length === 0) {
          console.warn('[ServicioZonasH3] ⚠️ La colección está vacía')
        }
        callback(snap.docs.map(d => d.data() as ZonaH3))
      },
      err => {
        console.error('[ServicioZonasH3] ❌ Error en suscripción:', err)
        onError?.(err)
      }
    )
  }
}
