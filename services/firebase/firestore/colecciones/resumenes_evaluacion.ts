import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase.config'
import { ResumenEvaluacion } from '@/models/ResumenEvaluacion'
import { CrudResult, toDomain, mapFirebaseError } from '@/services/firebase/comun'

/**
 * Servicio de lectura de ResumenEvaluacion (agregados de evaluaciones).
 *
 * La escritura está reservada a la Cloud Function `alCrearEvaluacion`
 * (rules: `allow write: if false`); este servicio SOLO lee.
 *
 * Fuente de verdad de reputación: `resumenes_evaluacion/{objetivoId}`
 * (objetivoId = UID de usuario o ID de mascota).
 */
export class ServicioResumenEvaluacion {
  private static readonly COLECCION = 'resumenes_evaluacion'

  static async obtenerPorObjetivo(
    objetivoId: string
  ): Promise<CrudResult<ResumenEvaluacion>> {
    try {
      const docRef = doc(db, this.COLECCION, objetivoId)
      const snap = await getDoc(docRef)

      if (!snap.exists()) {
        return {
          success: false,
          data: null,
          error: 'Resumen de evaluaciones no encontrado',
        }
      }

      const domain = toDomain(snap.data()) as ResumenEvaluacion
      return {
        success: true,
        data: { ...domain, id: snap.id } as ResumenEvaluacion,
      }
    } catch (e) {
      return {
        success: false,
        data: null,
        error: mapFirebaseError(e),
      }
    }
  }
}
