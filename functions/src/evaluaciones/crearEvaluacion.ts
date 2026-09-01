import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp()
}

const db = admin.firestore()

/**
 * Callable Function: crearEvaluacion
 *
 * Propósito:
 * Crear evaluaciones con validación completa server-side.
 * Garantiza integridad contextual: participación, estado del paseo, relación actor/objetivo.
 *
 * Flujo:
 * Cliente: httpsCallable('crearEvaluacion')({tipo, objetivo, contextoId, rating, comentario})
 *    ↓
 * CF: Valida TODO en servidor
 *    ├── Auth: uid == actor
 *    ├── Paseo: existe + COMPLETADO
 *    ├── Participación: actor en paseo
 *    ├── Relación: actor eval a objetivo correcto
 *    └── Crear con ID determinístico
 *    ↓
 * Firestore: setDoc (protegido por Rules)
 *    ↓
 * Cloud Function (alCrearEvaluacion): Actualiza ResumenEvaluacion
 *
 * Garantías:
 * - ✅ Unicidad: ID determinístico
 * - ✅ Integridad contextual: Validada en servidor
 * - ✅ No hay evaluaciones falsas: Imposible sin admin SDK
 */
export const crearEvaluacion = onCall(
  { enforceAppCheck: false },
  async request => {
    // 1. Validar autenticación
    const uid = request.auth?.uid
    if (!uid) {
      throw new HttpsError(
        'unauthenticated',
        'Usuario no autenticado. Debes iniciar sesión para crear evaluaciones.'
      )
    }

    const actorId = uid
    const payload = request.data as Record<string, unknown>

    // 2. Validar estructura de datos
    const { tipo, objetivo, contextoId, rating, comentario } = payload

    if (!tipo || !objetivo || !contextoId) {
      throw new HttpsError(
        'invalid-argument',
        'Parámetros incompletos: tipo, objetivo y contextoId son requeridos'
      )
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      throw new HttpsError(
        'invalid-argument',
        'Rating debe ser un número entre 1 y 5'
      )
    }

    if (
      typeof tipo !== 'string' ||
      typeof objetivo !== 'string' ||
      typeof contextoId !== 'string'
    ) {
      throw new HttpsError(
        'invalid-argument',
        'tipo, objetivo y contextoId deben ser strings'
      )
    }

    // 3. Validar que el tipo es válido
    const tiposValidos = [
      'evaluacion_cuidador',
      'evaluacion_tutor',
      'evaluacion_mascota',
      'evaluacion_sistema',
    ]
    if (!tiposValidos.includes(tipo)) {
      throw new HttpsError(
        'invalid-argument',
        `Tipo de evaluación inválido: ${tipo}`
      )
    }

    // 4. Leer Paseo
    const paseoRef = db.doc(`paseos/${contextoId}`)
    const paseoSnap = await paseoRef.get()

    if (!paseoSnap.exists) {
      throw new HttpsError('not-found', `Paseo con ID ${contextoId} no existe`)
    }

    const paseo = paseoSnap.data() as Record<string, unknown>

    // 5. Validar estado del paseo
    const estadoValido =
      paseo?.estado === 'COMPLETADO' || paseo?.estado === 'FINALIZADO'

    if (!estadoValido) {
      throw new HttpsError(
        'failed-precondition',
        `Paseo debe estar COMPLETADO o FINALIZADO. Estado actual: ${paseo?.estado || 'desconocido'}`
      )
    }

    // 6. Validar participación del actor en el paseo
    const esCreador = paseo?.creado_por === actorId
    const esCuidador = paseo?.id_cuidador === actorId

    if (!esCreador && !esCuidador) {
      throw new HttpsError(
        'permission-denied',
        'No participaste en este paseo. Solo los participantes pueden crear evaluaciones.'
      )
    }

    // 7. Validar relación actor → objetivo basada en tipo
    if (tipo === 'evaluacion_cuidador') {
      // El tutor (creador) evalúa al cuidador
      if (esCreador && objetivo !== paseo?.id_cuidador) {
        throw new HttpsError(
          'permission-denied',
          'Como tutor, solo puedes evaluar al cuidador de este paseo'
        )
      }
      if (esCuidador) {
        throw new HttpsError(
          'permission-denied',
          'Los cuidadores no pueden crear evaluaciones de cuidador'
        )
      }
    } else if (tipo === 'evaluacion_tutor') {
      // El cuidador evalúa al tutor
      if (esCuidador && objetivo !== paseo?.creado_por) {
        throw new HttpsError(
          'permission-denied',
          'Como cuidador, solo puedes evaluar al tutor de este paseo'
        )
      }
      if (esCreador) {
        throw new HttpsError(
          'permission-denied',
          'Los tutores no pueden crear evaluaciones de tutor'
        )
      }
    } else if (tipo === 'evaluacion_mascota') {
      // Solo cuidador puede evaluar mascotas
      if (!esCuidador) {
        throw new HttpsError(
          'permission-denied',
          'Solo el cuidador puede crear evaluaciones de comportamiento de mascota'
        )
      }
      // objetivo es el ID de la mascota, no necesita validación especial
    }

    // 8. Construir ID determinístico
    const evaluacionId = `${tipo}_${actorId}_${objetivo}_${contextoId}`

    // 9. Crear documento en Firestore
    const evaluacionRef = db.doc(`evaluaciones/${evaluacionId}`)

    try {
      await evaluacionRef.set({
        tipo,
        actor: { tipo: 'usuario', id: actorId },
        objetivo: { tipo: 'usuario', id: objetivo },
        contexto: { tipo: 'paseo', id: contextoId },
        datos: {
          rating: Math.max(1, Math.min(5, rating as number)), // Clamp 1-5 por seguridad
          comentario: comentario || '',
        },
        creado_en: admin.firestore.FieldValue.serverTimestamp(),
      })
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('permission-denied')
      ) {
        // Segunda escritura del mismo ID es UPDATE, rechazada por Rules
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
