import {onRequest} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import {Timestamp} from 'firebase-admin/firestore';
import {calcularYGuardarResumen} from './reputacion';

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * ============================================================================
 * HTTP FUNCTION `revelarEvaluacionVencida` — Materializa la ventana del doble
 * ciego para UNA evaluación (ejecutada por Cloud Task, 6 días después de la
 * creación de una evaluación unidireccional)
 * ============================================================================
 * Llamada SOLO por Cloud Tasks (autenticación OIDC, mismo patrón que
 * `escalarPaseoIndividual`). Es idempotente:
 * - Si el documento ya está `revelada: true` (la contraparte llegó antes),
 *   no hace nada.
 * - Si sigue pendiente, lo marca `revelada: true` y, si es
 *   `evaluacion_cuidador` sobre un usuario, recalcula el resumen del objetivo
 *   para PUBLICAR la reseña unidireccional en el perfil.
 *
 * Payload esperado: { evaluacionId }
 * ============================================================================
 */
export const revelarEvaluacionVencida = onRequest(
  {cors: false},
  async (req, res) => {
    // Solo Cloud Tasks hace POST
    if (req.method !== 'POST') {
      res.status(405).json({error: 'Method not allowed'});
      return;
    }

    try {
      const {evaluacionId} = (req.body ?? {}) as Record<string, unknown>;

      if (typeof evaluacionId !== 'string' || evaluacionId === '') {
        res.status(400).json({error: 'evaluacionId requerido'});
        return;
      }

      const ref = db.doc(`evaluaciones/${evaluacionId}`);
      const snap = await ref.get();

      if (!snap.exists) {
        console.log(
          `[revelarEvaluacion] ${evaluacionId} no existe; nada que revelar`
        );
        res.status(200).json({success: true, razon: 'no existe'});
        return;
      }

      const data = snap.data() as Record<string, unknown>;

      if (data.revelada === true) {
        // La contraparte llegó antes (o ya se materializó): no-op
        res.status(200).json({success: true, razon: 'ya revelada'});
        return;
      }

      // Materializar la revelación de la ventana
      await ref.update({revelada: true, revelada_en: Timestamp.now()});

      // Publicar la reseña unidireccional en el perfil del cuidador
      const objetivo = data.objetivo as Record<string, unknown> | undefined;
      if (
        data.tipo === 'evaluacion_cuidador' &&
        objetivo?.tipo === 'usuario' &&
        typeof objetivo?.id === 'string'
      ) {
        await calcularYGuardarResumen({
          tipo: 'usuario',
          id: objetivo.id,
        });
      }

      console.log(`[revelarEvaluacion] ${evaluacionId} revelada por ventana`);
      res.status(200).json({success: true, evaluacionId});
    } catch (error) {
      const evalId = String(
        (req.body as Record<string, unknown> | undefined)?.evaluacionId ?? '?'
      );
      const msg = `[revelarEvaluacion] Error procesando ${evalId}:`;
      console.error(msg, error);
      // Cloud Tasks reintentará según la configuración de la cola
      res.status(500).json({
        error: 'Error procesando revelación',
        detalles: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
