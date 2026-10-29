import {onDocumentUpdated} from 'firebase-functions/v2/firestore';
import admin from '../comun/firebaseAdminCompat';
import {Timestamp} from 'firebase-admin/firestore';
import {esPaseo} from '../compartido/servicios';

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Auto-crear conversación cuando paseo → CONFIRMADO
 */
export const onPaseoConfirmado = onDocumentUpdated(
  'operaciones/{operacionId}',
  async (event) => {
    const afterData = event.data?.after.data() as Record<string, unknown>;
    // Solo procesar paseos
    if (!esPaseo(afterData)) {
      return;
    }
    const operacionId = event.params.operacionId;

    if (afterData?.estado !== 'CONFIRMADO') {
      return;
    }

    const tutorId = afterData?.creado_por;
    const cuidadorId = afterData?.id_cuidador;

    if (!tutorId || !cuidadorId) {
      console.warn(
        `[onPaseoConfirmado] Operación ${operacionId} sin tutor o cuidador.`
      );
      return;
    }

    try {
      const convRef = db.collection('conversaciones').doc(operacionId);
      const existing = await convRef.get();

      if (existing.exists) {
        return;
      }

      const now = Timestamp.now();
      await convRef.set({
        participantes: [tutorId, cuidadorId],
        tutor_id: tutorId,
        cuidador_id: cuidadorId,
        activa: true,
        creado_en: now,
        actualizado_en: now,
        creado_por: 'sistema-cf-paseo-confirmado',
        actualizado_por: 'sistema-cf-paseo-confirmado',
      });
    } catch (err) {
      console.error(
        `[onPaseoConfirmado] Error para operación ${operacionId}:`,
        err
      );
      throw err;
    }
  }
);
