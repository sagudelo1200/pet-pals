import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp()
}

const db = admin.firestore()

/**
 * ============================================================================
 * CONTRATO `crearEvaluacion` (v2 — CONGELADO)
 * ============================================================================
 * Callable Function que crea una evaluación de confianza con validación
 * completa server-side. Es el ÚNICO camino de escritura de la colección
 * `evaluaciones` (las Security Rules bloquean escrituras directas del cliente).
 *
 * ── Payload (request.data) ─────────────────────────────────────────────────
 * {
 *   tipo: 'evaluacion_cuidador' | 'evaluacion_tutor' | 'evaluacion_mascota',
 *   objetivo: string,     // ID del usuario (cuidador/tutor) o mascota evaluado
 *   contextoId: string,   // ID del paseo (debe existir y estar COMPLETADO/FINALIZADO)
 *   rating?: number,      // 1-5. OBLIGATORIO en evaluacion_cuidador/evaluacion_tutor.
 *                         // PROHIBIDO en evaluacion_mascota (observación cualitativa).
 *   comentario?: string,  // Opcional (máx 2000). Todos los tipos.
 *   // Solo evaluacion_mascota (opcionales, máx 200 c/u):
 *   ritmo?: string,       // ej: 'tranquilo'
 *   compania?: string,    // ej: 'solo'
 *   tolerancia?: string,  // ej: 'ignora'
 * }
 *
 * ── Respuesta (200) ────────────────────────────────────────────────────────
 * { success: true, evaluacionId: string, timestamp: string }
 *
 * ── Errores (códigos https de firebase-functions) ──────────────────────────
 * unauthenticated     Usuario no autenticado.
 * invalid-argument    Payload mal formado (campos faltantes/tipo incorrecto,
 *                     rating fuera de 1-5, rating en observación de mascota,
 *                     longitud de texto excedida).
 * not-found           El paseo (contextoId) no existe.
 * failed-precondition El paseo no está COMPLETADO/FINALIZADO, o no tiene el
 *                     actor/objetivo esperado (ej. sin cuidador asignado).
 * permission-denied   El actor no participó en el paseo o no puede evaluar al
 *                     objetivo indicado. También para `evaluacion_sistema`,
 *                     reservada al sistema (MVP2).
 * already-exists      Ya existe una evaluación del mismo tipo para la tripla
 *                     (actor, objetivo, contexto).
 * internal            Error inesperado al persistir.
 *
 * ── Garantías ──────────────────────────────────────────────────────────────
 * - ID determinístico: `${tipo}_${actorId}_${objetivo}_${contextoId}`.
 * - Unicidad REAL: escritura con `create()` (falla atómicamente si el
 *   documento ya existe). NO se depende de Security Rules porque el Admin SDK
 *   las ignora en producción.
 * - Integridad contextual (paseo existe, estado, participación, relación
 *   actor→objetivo) validada 100% en el servidor.
 * ============================================================================
 */

const TIPOS_CON_RATING = ['evaluacion_cuidador', 'evaluacion_tutor'] as const
const TIPO_OBSERVACION_MASCOTA = 'evaluacion_mascota'
const MAX_COMENTARIO = 2001
const MAX_CAMPO_CUALITATIVO = 201

function stringOpcional(valor: unknown, nombre: string, max: number): string {
  if (valor === undefined || valor === null) return ''
  if (typeof valor !== 'string') {
    throw new HttpsError('invalid-argument', `${nombre} debe ser un string`)
  }
  const limpio = valor.trim()
  if (limpio.length > max) {
    throw new HttpsError(
      'invalid-argument',
      `${nombre} no puede superar ${max} caracteres`
    )
  }
  return limpio
}

export const crearEvaluacion = onCall(
  { enforceAppCheck: false },
  async request => {
    // 1. Autenticación
    const actorId = request.auth?.uid
    if (!actorId) {
      throw new HttpsError(
        'unauthenticated',
        'Usuario no autenticado. Debes iniciar sesión para crear evaluaciones.'
      )
    }

    const payload = (request.data ?? {}) as Record<string, unknown>
    const { tipo, objetivo, contextoId, rating, comentario } = payload

    // 2. Estructura básica
    if (
      typeof tipo !== 'string' ||
      typeof objetivo !== 'string' ||
      typeof contextoId !== 'string'
    ) {
      throw new HttpsError(
        'invalid-argument',
        'tipo, objetivo y contextoId son requeridos y deben ser strings'
      )
    }

    // 3. Tipo válido
    if (tipo === 'evaluacion_sistema') {
      throw new HttpsError(
        'permission-denied',
        'evaluacion_sistema está reservada para el sistema (MVP2)'
      )
    }
    if (
      !TIPOS_CON_RATING.includes(tipo as (typeof TIPOS_CON_RATING)[number]) &&
      tipo !== TIPO_OBSERVACION_MASCOTA
    ) {
      throw new HttpsError(
        'invalid-argument',
        `Tipo de evaluación inválido: ${tipo}`
      )
    }

    // 4. Rating según tipo
    const esEvaluacionHumana = TIPOS_CON_RATING.includes(
      tipo as (typeof TIPOS_CON_RATING)[number]
    )
    if (esEvaluacionHumana) {
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        throw new HttpsError(
          'invalid-argument',
          'Rating debe ser un número entre 1 y 5 para este tipo de evaluación'
        )
      }
    } else if (rating !== undefined && rating !== null) {
      throw new HttpsError(
        'invalid-argument',
        'Las observaciones de mascota no usan rating (son cualitativas)'
      )
    }

    // 5. Campos opcionales
    const comentarioLimpio = stringOpcional(
      comentario,
      'comentario',
      MAX_COMENTARIO
    )
    const cualitativos: Record<string, string> = {}
    if (!esEvaluacionHumana) {
      const { ritmo, compania, tolerancia } = payload
      cualitativos.ritmo = stringOpcional(ritmo, 'ritmo', MAX_CAMPO_CUALITATIVO)
      cualitativos.compania = stringOpcional(
        compania,
        'compania',
        MAX_CAMPO_CUALITATIVO
      )
      cualitativos.tolerancia = stringOpcional(
        tolerancia,
        'tolerancia',
        MAX_CAMPO_CUALITATIVO
      )
    }

    // 6. Paseo: existencia y estado
    const paseoRef = db.doc(`paseos/${contextoId}`)
    const paseoSnap = await paseoRef.get()

    if (!paseoSnap.exists) {
      throw new HttpsError('not-found', `Paseo con ID ${contextoId} no existe`)
    }

    const paseo = paseoSnap.data() as Record<string, unknown>
    const estado = paseo.estado
    if (estado !== 'COMPLETADO' && estado !== 'FINALIZADO') {
      throw new HttpsError(
        'failed-precondition',
        `Paseo debe estar COMPLETADO o FINALIZADO. Estado actual: ${String(estado ?? 'desconocido')}`
      )
    }

    // 7. Participación y relación actor → objetivo
    const esCreador = paseo.creado_por === actorId
    const esCuidador = paseo.id_cuidador === actorId

    if (!esCreador && !esCuidador) {
      throw new HttpsError(
        'permission-denied',
        'No participaste en este paseo. Solo los participantes pueden crear evaluaciones.'
      )
    }

    if (tipo === 'evaluacion_cuidador') {
      // El tutor (creador) evalúa al cuidador del paseo
      if (!esCreador) {
        throw new HttpsError(
          'permission-denied',
          'Solo el tutor puede evaluar al cuidador'
        )
      }
      if (typeof paseo.id_cuidador !== 'string' || paseo.id_cuidador === '') {
        throw new HttpsError(
          'failed-precondition',
          'El paseo no tiene cuidador asignado'
        )
      }
      if (objetivo !== paseo.id_cuidador) {
        throw new HttpsError(
          'permission-denied',
          'Como tutor, solo puedes evaluar al cuidador de este paseo'
        )
      }
    } else if (tipo === 'evaluacion_tutor') {
      // El cuidador evalúa al tutor (creador)
      if (!esCuidador) {
        throw new HttpsError(
          'permission-denied',
          'Solo el cuidador puede evaluar al tutor'
        )
      }
      if (typeof paseo.creado_por !== 'string' || paseo.creado_por === '') {
        throw new HttpsError(
          'failed-precondition',
          'El paseo no tiene tutor (creado_por)'
        )
      }
      if (objetivo !== paseo.creado_por) {
        throw new HttpsError(
          'permission-denied',
          'Como cuidador, solo puedes evaluar al tutor de este paseo'
        )
      }
    } else {
      // evaluacion_mascota: solo el cuidador; la mascota debe ser del paseo
      if (!esCuidador) {
        throw new HttpsError(
          'permission-denied',
          'Solo el cuidador puede crear observaciones de mascota'
        )
      }
      const mascotasIds = Array.isArray(paseo.mascota_ids)
        ? (paseo.mascota_ids as unknown[]).filter(
            (m): m is string => typeof m === 'string'
          )
        : []
      if (mascotasIds.length > 0 && !mascotasIds.includes(objetivo)) {
        throw new HttpsError(
          'permission-denied',
          'La mascota evaluada no pertenece a este paseo'
        )
      }
    }

    // 8. Documento con ID determinístico
    const evaluacionId = `${tipo}_${actorId}_${objetivo}_${contextoId}`
    const evaluacionRef = db.doc(`evaluaciones/${evaluacionId}`)

    const datos: Record<string, unknown> = { comentario: comentarioLimpio }
    if (esEvaluacionHumana) {
      datos.rating = Math.max(1, Math.min(5, rating as number))
    } else {
      for (const [campo, valor] of Object.entries(cualitativos)) {
        if (valor !== '') datos[campo] = valor
      }
    }

    try {
      await evaluacionRef.create({
        id: evaluacionId,
        tipo,
        actor: { tipo: 'usuario', id: actorId },
        objetivo: {
          tipo: esEvaluacionHumana ? 'usuario' : 'mascota',
          id: objetivo,
        },
        contexto: { tipo: 'paseo', id: contextoId },
        datos,
        creado_por: actorId,
        actualizado_por: actorId,
        creado_en: admin.firestore.FieldValue.serverTimestamp(),
        actualizado_en: admin.firestore.FieldValue.serverTimestamp(),
      })
    } catch (error) {
      if (
        error instanceof Error &&
        (error as { code?: string }).code === 'already-exists'
      ) {
        throw new HttpsError(
          'already-exists',
          'Ya existe una evaluación de este tipo para esta combinación de actor/objetivo/paseo'
        )
      }
      throw new HttpsError(
        'internal',
        `Error al guardar evaluación: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    return {
      success: true,
      evaluacionId,
      timestamp: new Date().toISOString(),
    }
  }
)
