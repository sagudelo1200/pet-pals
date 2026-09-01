import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import { Evaluacion, TipoEvaluacion } from '@/models/Evaluacion'
import { CrudResult } from '@/services/firebase/comun'

/**
 * Servicio de Evaluaciones - Sistema de Confianza Paw-Path
 *
 * NOTA ARQUITECTÓNICA IMPORTANTE (OPCIÓN B):
 * La creación de evaluaciones está centralizada en Callable Function `crearEvaluacion`.
 * Eso garantiza que todas las validaciones se hacen server-side:
 * - ✅ Autenticación
 * - ✅ Existencia y estado del paseo
 * - ✅ Participación en paseo
 * - ✅ Relación actor/objetivo correcta
 * - ✅ Unicidad mediante ID determinístico
 *
 * Este servicio SOLO proporciona queries de lectura para:
 * - Obtener evaluaciones individuales
 * - Obtener agregados por objetivo (para ResumenEvaluacion)
 * - Obtener evaluaciones por tipo (para Cloud Functions)
 *
 * Flujo completo:
 * Cliente
 *    └── crearEvaluacion (Callable)
 *         └── Valida TODO en servidor
 *              └── Firestore (setDoc)
 *                   └── Cloud Function alCrearEvaluacion
 *                        └── ResumenEvaluacion
 */
export class ServicioEvaluacion {
  private static readonly COLLECTION = 'evaluaciones'

  /**
   * Obtener evaluación por ID
   */
  static async obtenerPorId(id: string): Promise<CrudResult<Evaluacion>> {
    try {
      const docRef = doc(db, this.COLLECTION, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return {
          success: false,
          data: null,
          error: `Evaluación ${id} no encontrada`,
        }
      }

      return {
        success: true,
        data: docSnap.data() as Evaluacion,
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Error obteniendo evaluación: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Obtener todas las evaluaciones de un objetivo (para ResumenEvaluacion)
   * Usado por Cloud Function para calcular agregados
   */
  static async obtenerPorObjetivo(
    objetivoId: string
  ): Promise<CrudResult<Evaluacion[]>> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('objetivo.id', '==', objetivoId)
      )
      const snap = await getDocs(q)
      const evaluaciones = snap.docs.map(doc => doc.data() as Evaluacion)

      return {
        success: true,
        data: evaluaciones,
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Error obteniendo evaluaciones: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Obtener evaluaciones de un tipo específico para un objetivo
   * Usado por Cloud Function
   */
  static async obtenerPorObjetivoYTipo(
    objetivoId: string,
    tipo: TipoEvaluacion
  ): Promise<CrudResult<Evaluacion[]>> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('objetivo.id', '==', objetivoId),
        where('tipo', '==', tipo)
      )
      const snap = await getDocs(q)
      const evaluaciones = snap.docs.map(doc => doc.data() as Evaluacion)

      return {
        success: true,
        data: evaluaciones,
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Error obteniendo evaluaciones por tipo: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
}
