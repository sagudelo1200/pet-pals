import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import {
  calcularYGuardarResumen,
  actualizarRatingEnIndice,
  calcularSuperhost,
  INSIGNIA_SUPERHOST,
} from './reputacion'
import { programarRevelacion } from './cloudTasks'

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp()
}

const db = admin.firestore()

/**
 * ============================================================================
 * TRIGGER `alCrearEvaluacion` — Doble ciego + propagación de reputación
 * ============================================================================
 * Disparador: onDocumentCreated('evaluaciones/{evaluacionId}')
 *
 * Responsabilidades (en orden):
 * 1. DOBLE CIEGO CON REVELACIÓN: para evaluaciones entre personas
 *    (evaluacion_cuidador / evaluacion_tutor), si la contraparte (misma
 *    tripla con roles invertidos y mismo paseo) ya existe, se marcan AMBAS
 *    con `revelada: true`; si no, la nueva queda `revelada: false` en espera
 *    y se programa UNA Cloud Task con delay de 6 días (event-driven, sin
 *    polling) para materializar la ventana si la contraparte nunca llega.
 * 2. Recalcular `resumenes_evaluacion/{objetivo.id}` (FUENTE DE VERDAD) vía
 *    el módulo compartido `reputacion` (desgloses + distribución + reseñas
 *    públicas + observaciones de mascota).
 * 3. Cache público SOLO cuando la evaluación creada es `evaluacion_cuidador`
 *    (única métrica que alimenta la reputación pública):
 *    - `perfiles_publicos/{uid}.rating_promedio` (update; NUNCA se crea un
 *      perfil inexistente — evita perfiles fantasma).
 *    - `indice_cobertura/{celda}/cuidadores/{uid}.rating_promedio`.
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
      const objetivoTipo = objetivo?.tipo as string | undefined
      const tipo = evaluacionData.tipo as string | undefined

      if (!objetivoId) {
        console.warn(`[alCrearEvaluacion] Evaluacion sin objetivo.id`)
        return
      }

      console.log(
        `[alCrearEvaluacion] Procesando evaluacion ${evaluacionId} para objetivo ${objetivoId}`
      )

      // 1. DOBLE CIEGO: marcar revelación (antes del resumen para que la
      // evaluación recién creada ya cuente como revelada si es mutua)
      if (tipo === 'evaluacion_cuidador' || tipo === 'evaluacion_tutor') {
        const actor = evaluacionData.actor as
          | Record<string, unknown>
          | undefined
        const contexto = evaluacionData.contexto as
          | Record<string, unknown>
          | undefined
        const actorId = actor?.id as string | undefined
        const contextoId = contexto?.id as string | undefined

        if (actorId && contextoId) {
          const contraparteId =
            tipo === 'evaluacion_cuidador'
              ? `evaluacion_tutor_${objetivoId}_${actorId}_${contextoId}`
              : `evaluacion_cuidador_${objetivoId}_${actorId}_${contextoId}`

          const contraparteSnap = await db
            .doc(`evaluaciones/${contraparteId}`)
            .get()

          if (contraparteSnap.exists) {
            const reveladaEn = Timestamp.now()
            await Promise.all([
              db
                .doc(`evaluaciones/${evaluacionId}`)
                .update({ revelada: true, revelada_en: reveladaEn }),
              db
                .doc(`evaluaciones/${contraparteId}`)
                .update({ revelada: true, revelada_en: reveladaEn }),
            ])
            console.log(
              `[alCrearEvaluacion] Evaluación mutua: reveladas ${evaluacionId} y ${contraparteId}`
            )
          } else {
            await db
              .doc(`evaluaciones/${evaluacionId}`)
              .update({ revelada: false })
            // EVENT-DRIVEN: se programa UNA Cloud Task con delay de 6 días
            // para materializar la ventana de ESTA evaluación (la lectura por
            // rules ya revela a tiempo; la tarea publica la reseña en el
            // perfil). Sin polling: si la contraparte llega antes, la tarea
            // será un no-op. Fire-and-forget: si falla la programación, la
            // reseña aparece con la próxima evaluación del cuidador.
            programarRevelacion(evaluacionId).catch(error =>
              console.warn(
                `[alCrearEvaluacion] No se pudo programar la revelación de ${evaluacionId}:`,
                error instanceof Error ? error.message : String(error)
              )
            )
            console.log(
              `[alCrearEvaluacion] ${evaluacionId} en espera (contraparte ${contraparteId} no existe); revelación programada`
            )
          }
        }
      }

      // 2. Recalcular el resumen (fuente de verdad) con el módulo compartido
      const desgloses = await calcularYGuardarResumen({
        tipo: objetivoTipo ?? 'usuario',
        id: objetivoId,
      })
      console.log(
        `[alCrearEvaluacion] ResumenEvaluacion actualizado para ${objetivoId}`
      )

      // 3. Cache público: SOLO evaluacion_cuidador sobre objetivo usuario
      if (tipo === 'evaluacion_cuidador' && objetivoTipo === 'usuario') {
        const desgloseCuidador = desgloses.evaluaciones_cuidador
        const ratingPromedio =
          desgloseCuidador.cantidad > 0 ? desgloseCuidador.promedio : 0

        const perfilRef = db.collection('perfiles_publicos').doc(objetivoId)
        const perfilSnap = await perfilRef.get()
        const now = Timestamp.now()

        if (perfilSnap.exists) {
          // Medalla tipo Superhost: rating ≥ 4.8 con volumen mínimo
          const esSuperhost = calcularSuperhost(desgloseCuidador)
          const perfilData = perfilSnap.data() as Record<string, unknown>
          const insignias = Array.isArray(perfilData.insignias_verificacion)
            ? (perfilData.insignias_verificacion as unknown[]).filter(
                (i): i is string => typeof i === 'string'
              )
            : []
          const tieneInsignia = insignias.includes(INSIGNIA_SUPERHOST)
          const debeActualizarInsignia =
            (esSuperhost && !tieneInsignia) ||
            (!esSuperhost && tieneInsignia)

          const updatePerfil: Record<string, unknown> = {
            rating_promedio: ratingPromedio,
            actualizado_en: now,
          }
          if (debeActualizarInsignia) {
            updatePerfil.insignias_verificacion = esSuperhost
              ? [...insignias, INSIGNIA_SUPERHOST]
              : insignias.filter(i => i !== INSIGNIA_SUPERHOST)
          }

          await perfilRef.update(updatePerfil)

          await actualizarRatingEnIndice(
            objetivoId,
            ratingPromedio,
            perfilData
          )

          console.log(
            `[alCrearEvaluacion] PerfilPublico actualizado para ${objetivoId}: rating ${ratingPromedio}, superhost ${esSuperhost}`
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
