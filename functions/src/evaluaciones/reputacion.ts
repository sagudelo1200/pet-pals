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

export interface Desglose {
  promedio: number
  cantidad: number
}

export interface Desgloses {
  evaluaciones_cuidador: Desglose
  evaluaciones_tutor: Desglose
  evaluaciones_mascota: Desglose
  evaluaciones_sistema: Desglose
}

// Medalla tipo "Superhost" (Airbnb): rating ≥ 4.8 con volumen mínimo.
// Se refleja en perfiles_publicos.insignias_verificacion.
export const PROMEDIO_SUPERHOST = 4.8
export const MIN_EVALUACIONES_SUPERHOST = 6
export const INSIGNIA_SUPERHOST = 'SUPERHOST'

/** True si el desglose de cuidador cumple el umbral de Superhost. */
export function calcularSuperhost(desglose: Desglose): boolean {
  return (
    desglose.promedio >= PROMEDIO_SUPERHOST &&
    desglose.cantidad >= MIN_EVALUACIONES_SUPERHOST
  )
}

/**
 * ============================================================================
 * CÁLCULO DE REPUTACIÓN (compartido por `alCrearEvaluacion` y el job
 * `revelarEvaluacionesVencidas`)
 * ============================================================================
 * - `resumenes_evaluacion/{objetivoId}` es la FUENTE DE VERDAD.
 * - Los desgloses por tipo NUNCA se mezclan.
 * - Campos extra según el objetivo:
 *   · usuario → distribucion_ratings + reseñas_publicas (solo evaluaciones
 *     de cuidador MUTUAMENTE reveladas, sin identidad del evaluador).
 *   · mascota → observaciones_recientes (la observación pertenece al
 *     expediente de la mascota).
 * ============================================================================
 */

/**
 * Recalcula y guarda el resumen del objetivo. Devuelve los desgloses para
 * que el llamador pueda seguir propagando (ej. cache de perfil).
 */
export async function calcularYGuardarResumen(objetivo: {
  tipo: string
  id: string
}): Promise<Desgloses> {
  const objetivoId = objetivo.id

  const evaluacionesSnap = await db
    .collection('evaluaciones')
    .where('objetivo.id', '==', objetivoId)
    .get()

  const evaluaciones = evaluacionesSnap.docs.map(doc => doc.data())

  const desgloses: Desgloses = {
    evaluaciones_cuidador: calcularDesglose(
      evaluaciones,
      'evaluacion_cuidador'
    ),
    evaluaciones_tutor: calcularDesglose(evaluaciones, 'evaluacion_tutor'),
    evaluaciones_mascota: calcularDesglose(evaluaciones, 'evaluacion_mascota'),
    evaluaciones_sistema: calcularDesglose(evaluaciones, 'evaluacion_sistema'),
  }

  const resumenExtra: Record<string, unknown> = {}
  if (objetivo.tipo === 'usuario') {
    resumenExtra.distribucion_ratings = calcularDistribucion(
      evaluaciones,
      'evaluacion_cuidador'
    )
    resumenExtra.reseñas_publicas = evaluaciones
      .filter(e => e.tipo === 'evaluacion_cuidador' && e.revelada === true)
      .map(e => ({
        rating:
          ((e.datos as Record<string, unknown> | undefined)?.rating as
            number | undefined) ?? 0,
        comentario:
          ((e.datos as Record<string, unknown> | undefined)?.comentario as
            string | undefined) ?? '',
        contexto_id:
          ((e.contexto as Record<string, unknown> | undefined)?.id as
            string | undefined) ?? '',
        creado_en: e.creado_en ?? null,
      }))
      .slice(-5)
  } else if (objetivo.tipo === 'mascota') {
    resumenExtra.observaciones_recientes = evaluaciones
      .filter(e => e.tipo === 'evaluacion_mascota')
      .map(e => {
        const datos = (e.datos as Record<string, unknown>) || {}
        return {
          ritmo: (datos.ritmo as string) ?? '',
          compania: (datos.compania as string) ?? '',
          tolerancia: (datos.tolerancia as string) ?? '',
          comentario: (datos.comentario as string) ?? '',
          contexto_id:
            ((e.contexto as Record<string, unknown> | undefined)?.id as
              string | undefined) ?? '',
          creado_en: e.creado_en ?? null,
        }
      })
      .slice(-5)
  }

  // Upsert preservando creado_en/creado_por originales
  const resumenRef = db.collection('resumenes_evaluacion').doc(objetivoId)
  const now = Timestamp.now()
  const resumenSnap = await resumenRef.get()

  if (resumenSnap.exists) {
    await resumenRef.update({
      objetivo,
      ...desgloses,
      ...resumenExtra,
      actualizado_en: now,
      actualizado_por: SISTEMA,
    })
  } else {
    await resumenRef.set({
      objetivo,
      ...desgloses,
      ...resumenExtra,
      creado_en: now,
      actualizado_en: now,
      creado_por: SISTEMA,
      actualizado_por: SISTEMA,
    })
  }

  return desgloses
}

/**
 * Promedio y cantidad para un tipo de evaluación.
 * El promedio solo considera ratings numéricos > 0; las observaciones
 * cualitativas (sin rating) cuentan en `cantidad` pero no en `promedio`.
 */
export function calcularDesglose(
  evaluaciones: Record<string, unknown>[],
  tipo: string
): Desglose {
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
      ? Math.round(
          (ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100
        ) / 100
      : 0

  return {
    promedio: promedio,
    cantidad: evaluacionesDelTipo.length,
  }
}

/**
 * Cuenta cuántos ratings de cada valor (1-5) hay para un tipo.
 * Permite mostrar la distribución junto al promedio (honestidad: un 4.9 con
 * 1 reseña no se ve igual que uno con 24).
 */
export function calcularDistribucion(
  evaluaciones: Record<string, unknown>[],
  tipo: string
): Record<string, number> {
  const distribucion: Record<string, number> = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
  }
  for (const e of evaluaciones) {
    if (e.tipo !== tipo) continue
    const rating = (e.datos as Record<string, unknown> | undefined)?.rating
    if (typeof rating === 'number' && rating >= 1 && rating <= 5) {
      const clave = String(Math.floor(rating))
      distribucion[clave] = (distribucion[clave] || 0) + 1
    }
  }
  return distribucion
}

/**
 * Actualiza `rating_promedio` en todas las celdas del índice de cobertura
 * del cuidador (mismas celdas que usa el cliente para buscar).
 * No falla si alguna celda ya no existe en el índice (allSettled).
 */
export async function actualizarRatingEnIndice(
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
        `[reputacion] Cuidador ${uid} sin cobertura H3; índice no actualizado`
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
        `[reputacion] ${fallidos}/${celdas.length} celdas de índice no actualizadas para ${uid}`
      )
    }
  } catch (error) {
    console.warn(
      `[reputacion] Error actualizando índice de cobertura para ${uid}:`,
      error
    )
  }
}
