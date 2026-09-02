import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { gridDisk } from 'h3-js'

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp()
}

const db = admin.firestore()

const SISTEMA = 'sistema-cf-evaluaciones'
// Mismo radio que celdasDeCobertura del cliente (gridDisk k=2 → 19 celdas ≈ 2 km)
const RADIO_COBERTURA = 2

/**
 * ============================================================================
 * TRIGGER `alCrearEvaluacion` — Agregación y propagación de reputación
 * ============================================================================
 * Disparador: onDocumentCreated('evaluaciones/{evaluacionId}')
 *
 * Responsabilidades (en orden):
 * 1. Recalcular TODAS las evaluaciones del objetivo (objetivo.id).
 * 2. Calcular promedios SEPARADOS por tipo (nunca mezclados):
 *    - evaluaciones_cuidador  → reputación PÚBLICA del cuidador
 *    - evaluaciones_tutor     → métrica PRIVADA de coaching
 *    - evaluaciones_mascota   → observaciones cualitativas (promedio siempre 0)
 *    - evaluaciones_sistema   → MVP2 (independiente)
 * 3. Upsert de `resumenes_evaluacion/{objetivo.id}` (FUENTE DE VERDAD).
 *    Si el documento ya existe, se actualiza con `update()` para NO pisar
 *    `creado_en`/`creado_por` originales.
 * 4. Cache público SOLO cuando la evaluación creada es `evaluacion_cuidador`
 *    (única métrica que alimenta la reputación pública):
 *    - `perfiles_publicos/{uid}.rating_promedio` (update; NUNCA se crea un
 *      perfil inexistente — evita perfiles fantasma).
 *    - `indice_cobertura/{celda}/cuidadores/{uid}.rating_promedio` en todas
 *      las celdas de cobertura actuales del cuidador (celdas_cobertura
 *      manuales si existen, si no gridDisk(h3_r8, 2)).
 *
 * Invariantes:
 * - `resumenes_evaluacion` es la fuente de verdad; el perfil y el índice son
 *   caches derivados exclusivamente desde aquí.
 * - `cantidad_paseos_realizados` NO se actualiza en este trigger.
 * ============================================================================
 */

export const alCrearEvaluacion = onDocumentCreated(
  'evaluaciones/{evaluacionId}',
  async event => {
    const evaluacionData = event.data?.data() as
      | Record<string, unknown>
      | undefined
    const evaluacionId = event.params.evaluacionId

    if (!evaluacionData) {
      console.warn(`[alCrearEvaluacion] Evaluacion ${evaluacionId} sin datos`)
      return
    }

    try {
      const objetivo = evaluacionData.objetivo as
        | Record<string, unknown>
        | undefined
      const objetivoId = objetivo?.id as string | undefined
      const tipo = evaluacionData.tipo as string | undefined

      if (!objetivoId) {
        console.warn(`[alCrearEvaluacion] Evaluacion sin objetivo.id`)
        return
      }

      console.log(
        `[alCrearEvaluacion] Procesando evaluacion ${evaluacionId} para objetivo ${objetivoId}`
      )

      // 1. Todas las evaluaciones del objetivo
      const evaluacionesSnap = await db
        .collection('evaluaciones')
        .where('objetivo.id', '==', objetivoId)
        .get()

      const evaluaciones = evaluacionesSnap.docs.map(doc => doc.data())

      // 2. Desgloses por tipo (separados, nunca mezclados)
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

      // 3. Upsert de ResumenEvaluacion (FUENTE DE VERDAD) preservando creado_en
      const resumenRef = db.collection('resumenes_evaluacion').doc(objetivoId)
      const now = Timestamp.now()
      const resumenSnap = await resumenRef.get()

      if (resumenSnap.exists) {
        await resumenRef.update({
          objetivo,
          ...desgloses,
          actualizado_en: now,
          actualizado_por: SISTEMA,
        })
      } else {
        await resumenRef.set({
          objetivo,
          ...desgloses,
          creado_en: now,
          actualizado_en: now,
          creado_por: SISTEMA,
          actualizado_por: SISTEMA,
        })
      }

      console.log(
        `[alCrearEvaluacion] ResumenEvaluacion actualizado para ${objetivoId}`
      )

      // 4. Cache público: SOLO evaluacion_cuidador sobre objetivo usuario
      if (tipo === 'evaluacion_cuidador' && objetivo?.tipo === 'usuario') {
        const desgloseCuidador = desgloses.evaluaciones_cuidador as {
          promedio: number
          cantidad: number
        }
        const ratingPromedio =
          desgloseCuidador.cantidad > 0 ? desgloseCuidador.promedio : 0

        const perfilRef = db.collection('perfiles_publicos').doc(objetivoId)
        const perfilSnap = await perfilRef.get()

        if (perfilSnap.exists) {
          await perfilRef.update({
            rating_promedio: ratingPromedio,
            actualizado_en: now,
          })

          await actualizarRatingEnIndice(
            objetivoId,
            ratingPromedio,
            perfilSnap.data() as Record<string, unknown>
          )

          console.log(
            `[alCrearEvaluacion] PerfilPublico.rating_promedio actualizado a ${ratingPromedio} para ${objetivoId}`
          )
        } else {
          // Nunca crear perfiles fantasma: si el cuidador no tiene perfil,
          // simplemente se omite el cache de rating.
          console.log(
            `[alCrearEvaluacion] PerfilPublico ${objetivoId} no existe; cache de rating omitido`
          )
        }
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
 * Promedio y cantidad para un tipo de evaluación.
 * El promedio solo considera ratings numéricos > 0; las observaciones
 * cualitativas (sin rating) cuentan en `cantidad` pero no en `promedio`.
 */
function calcularDesglose(
  evaluaciones: Record<string, unknown>[],
  tipo: string
): { promedio: number; cantidad: number } {
  const evaluacionesDelTipo = evaluaciones.filter(e => e.tipo === tipo)

  if (evaluacionesDelTipo.length === 0) {
    return { promedio: 0, cantidad: 0 }
  }

  const ratings = evaluacionesDelTipo
    .map(e => {
      const datos = e.datos as Record<string, unknown> | undefined
      return typeof datos?.rating === 'number' ? datos.rating : 0
    })
    .filter(r => r > 0)

  const promedio =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) /
        100
      : 0

  return {
    promedio: promedio,
    cantidad: evaluacionesDelTipo.length,
  }
}

/**
 * Actualiza `rating_promedio` en todas las celdas del índice de cobertura
 * del cuidador (mismas celdas que usa el cliente para buscar).
 * No falla si alguna celda ya no existe en el índice (allSettled).
 */
async function actualizarRatingEnIndice(
  uid: string,
  ratingPromedio: number,
  perfil: Record<string, unknown>
): Promise<void> {
  try {
    const celdasManuales = Array.isArray(perfil.celdas_cobertura)
      ? (perfil.celdas_cobertura as unknown[]).filter(
          (c): c is string => typeof c === 'string'
        )
      : []
    const celdas =
      celdasManuales.length > 0
        ? celdasManuales
        : typeof perfil.h3_r8 === 'string'
          ? gridDisk(perfil.h3_r8, RADIO_COBERTURA)
          : []

    if (celdas.length === 0) {
      console.log(
        `[alCrearEvaluacion] Cuidador ${uid} sin cobertura H3; índice no actualizado`
      )
      return
    }

    const ahora = Timestamp.now()
    const resultados = await Promise.allSettled(
      celdas.map(celda =>
        db
          .collection('indice_cobertura')
          .doc(celda)
          .collection('cuidadores')
          .doc(uid)
          .update({ rating_promedio: ratingPromedio, actualizado_en: ahora })
      )
    )

    const fallidos = resultados.filter(r => r.status === 'rejected').length
    if (fallidos > 0) {
      console.warn(
        `[alCrearEvaluacion] ${fallidos}/${celdas.length} celdas de índice no actualizadas para ${uid}`
      )
    }
  } catch (error) {
    console.warn(
      `[alCrearEvaluacion] Error actualizando índice de cobertura para ${uid}:`,
      error
    )
  }
}
