import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp()
}

const db = admin.firestore()

/**
 * Cloud Function: Agregación de Evaluaciones por Tipo
 *
 * Trigger: onDocumentCreated('evaluaciones/{evaluacionId}')
 *
 * Propósito:
 * 1. Al crear una nueva Evaluacion en /evaluaciones/{id}
 * 2. Obtener TODAS las evaluaciones del objetivo
 * 3. Calcular promedios SEPARADOS por tipo
 * 4. Actualizar ResumenEvaluacion/{objetivo.id} (FUENTE DE VERDAD)
 * 5. Actualizar PerfilPublico.rating_promedio (CACHE, solo evaluacion_cuidador)
 *
 * Invariante:
 * - ResumenEvaluacion es la fuente de verdad
 * - PerfilPublico es un cache que se actualiza desde aquí
 * - cantidad_paseos_realizados NO se actualiza aquí (viene de query separada)
 */
export const alCrearEvaluacion = onDocumentCreated(
  'evaluaciones/{evaluacionId}',
  async event => {
    const evaluacionData = event.data?.data() as Record<string, unknown>
    const evaluacionId = event.params.evaluacionId

    if (!evaluacionData) {
      console.warn(`[alCrearEvaluacion] Evaluacion ${evaluacionId} sin datos`)
      return
    }

    try {
      const objetivo = evaluacionData.objetivo as Record<string, unknown>
      const objetivoId = objetivo?.id as string

      if (!objetivoId) {
        console.warn(`[alCrearEvaluacion] Evaluacion sin objetivo.id`)
        return
      }

      console.log(
        `[alCrearEvaluacion] Procesando evaluacion ${evaluacionId} para objetivo ${objetivoId}`
      )

      // 1. Obtener TODAS las evaluaciones del objetivo
      const evaluacionesSnap = await db
        .collection('evaluaciones')
        .where('objetivo.id', '==', objetivoId)
        .get()

      const evaluaciones = evaluacionesSnap.docs.map(doc => doc.data())

      // 2. Calcular promedios POR TIPO (separados, nunca mezclados)
      const desgloses = {
        evaluaciones_cuidador: calcularDesglose(
          evaluaciones,
          'evaluacion_cuidador'
        ),
        evaluaciones_tutor: calcularDesglose(evaluaciones, 'evaluacion_tutor'),
        evaluaciones_mascota: calcularDesglose(
          evaluaciones,
          'evaluacion_mascota'
        ),
        evaluaciones_sistema: calcularDesglose(
          evaluaciones,
          'evaluacion_sistema'
        ),
      }

      // 3. Actualizar ResumenEvaluacion (FUENTE DE VERDAD)
      const resumenRef = db.collection('resumenes_evaluacion').doc(objetivoId)
      const now = Timestamp.now()

      await resumenRef.set(
        {
          objetivo: objetivo,
          ...desgloses,
          actualizado_en: now,
          creado_en: now,
          creado_por: 'sistema-cf-evaluaciones',
          actualizado_por: 'sistema-cf-evaluaciones',
        },
        { merge: true } // Preserva datos existentes, actualiza solo estos campos
      )

      console.log(
        `[alCrearEvaluacion] ResumenEvaluacion actualizado para ${objetivoId}`
      )

      // 4. Actualizar PerfilPublico.rating_promedio (CACHE)
      // SOLO si objetivo es usuario (evaluacion_cuidador se aplica a usuarios cuidadores)
      if (objetivo?.tipo === 'usuario') {
        const perfilRef = db.collection('perfiles_publicos').doc(objetivoId)

        // rating_promedio viene SOLO de evaluacion_cuidador
        const desgloseCuidador = desgloses.evaluaciones_cuidador as {
          promedio: number
          cantidad: number
        } | null
        const ratingPromedio =
          desgloseCuidador && desgloseCuidador.cantidad > 0
            ? desgloseCuidador.promedio
            : 0

        await perfilRef.set(
          {
            rating_promedio: ratingPromedio,
            actualizado_en: now,
          },
          { merge: true }
        )

        console.log(
          `[alCrearEvaluacion] PerfilPublico.rating_promedio actualizado a ${ratingPromedio} para ${objetivoId}`
        )
      }

      console.log(`[alCrearEvaluacion] Completada para ${evaluacionId}`)
    } catch (error) {
      console.error(
        `[alCrearEvaluacion] Error procesando ${evaluacionId}:`,
        error
      )
      throw error
    }
  }
)

/**
 * Helper: Calcular promedio y cantidad para un tipo de evaluación
 *
 * @param evaluaciones Array de todas las evaluaciones del objetivo
 * @param tipo Tipo de evaluación a filtrar (evaluacion_cuidador, evaluacion_tutor, etc)
 * @returns {promedio: number, cantidad: number}
 */
function calcularDesglose(
  evaluaciones: Record<string, unknown>[],
  tipo: string
): Record<string, unknown> {
  const evaluacionesDelTipo = evaluaciones.filter(e => e.tipo === tipo)

  if (evaluacionesDelTipo.length === 0) {
    return {
      promedio: 0,
      cantidad: 0,
    }
  }

  // Calcular promedio de ratings
  const ratings = evaluacionesDelTipo
    .map(e => {
      const datos = e.datos as Record<string, unknown>
      return typeof datos?.rating === 'number' ? datos.rating : 0
    })
    .filter(r => r > 0)

  const promedio =
    ratings.length > 0
      ? Math.round(
          (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100
        ) / 100
      : 0

  return {
    promedio: promedio,
    cantidad: evaluacionesDelTipo.length,
  }
}
