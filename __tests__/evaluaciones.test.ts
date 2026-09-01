/**
 * Tests - Sistema de Evaluaciones Paw Path
 *
 * ⚠️ DEPRECADO: Los tests originales usaban ServicioEvaluacion.crear() que ha sido
 * migrado completamente a Callable Function (crearEvaluacion) en la arquitectura Option B.
 *
 * CAMBIOS EN ARQUITECTURA (FASE 0-2):
 * ✅ Validación movida a Cloud Function (server-side)
 * ✅ ID determinístico: ${tipo}_${actorId}_${objetivo}_${contextoId}
 * ✅ Firestore Rules proporciona protección contra duplicados (immutability)
 * ✅ No hay queries preventivas (race condition eliminada)
 *
 * PRÓXIMOS PASOS (FASE 3):
 * - Reescribir tests para usar mock de httpsCallable
 * - Validar payload esperado: {tipo, objetivo, contextoId, rating, comentario}
 * - Validar manejo de errores: already-exists, failed-precondition, permission-denied
 * - Validar integración con alCrearEvaluacion trigger
 *
 * Los tests originales se conservan como referencia en backup/tests/evaluaciones.backup.ts
 */

export const testMarker =
  'Tests reestructurados en FASE 3 - Arquitectura Option B'
