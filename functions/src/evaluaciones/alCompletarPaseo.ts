import {onDocumentUpdated} from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import {Timestamp} from 'firebase-admin/firestore';

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

const SISTEMA = 'sistema-cf-paseos';
// Estados terminales que cuentan como "paseo realizado" para el cuidador
const ESTADOS_FINALES = ['FINALIZADO', 'COMPLETADO'];

/**
 * ============================================================================
 * TRIGGER `alCompletarPaseo` — Contador de paseos realizados del cuidador
 * ============================================================================
 * Disparador: onDocumentUpdated('paseos/{paseoId}')
 *
 * Cuando un paseo entra POR PRIMERA VEZ a FINALIZADO o COMPLETADO (estados
 * terminales), recalcula cuántos paseos ha realizado el cuidador y lo guarda
 * en:
 *   1. `resumenes_evaluacion/{cuidadorId}.cantidad_paseos_realizados`
 *      (fuente de verdad de reputación).
 *   2. `perfiles_publicos/{cuidadorId}.cantidad_paseos_realizados`
 *      (cache que ya consume la UI actual; si el perfil no existe, se omite
 *      sin crear documentos fantasma).
 *
 * El contador NO depende de evaluaciones: se actualiza al terminar el paseo.
 * Las transiciones FINALIZADO → COMPLETADO no re-cuentan (solo la primera
 * entrada al conjunto de estados finales).
 * ============================================================================
 */
export const alCompletarPaseo = onDocumentUpdated(
  'paseos/{paseoId}',
  async (event) => {
    const antes = event.data?.before.data() as
      | Record<string, unknown>
      | undefined;
    const despues = event.data?.after.data() as
      | Record<string, unknown>
      | undefined;

    if (!despues) return;

    const estadoAnterior = antes?.estado;
    const estadoNuevo = despues.estado;
    const cuidadorId = despues.id_cuidador;

    // Solo cuidadores con paseo asignado
    if (typeof cuidadorId !== 'string' || cuidadorId === '') return;

    // Solo al ENTRAR por primera vez a un estado final
    if (!ESTADOS_FINALES.includes(String(estadoNuevo))) return;
    if (ESTADOS_FINALES.includes(String(estadoAnterior))) return;

    try {
      // Contar paseos finalizados/completados del cuidador
      const countSnap = await db
        .collection('paseos')
        .where('id_cuidador', '==', cuidadorId)
        .where('estado', 'in', ESTADOS_FINALES)
        .count()
        .get();
      const cantidad = countSnap.data().count;

      const now = Timestamp.now();

      // 1. Fuente de verdad: resumenes_evaluacion/{uid}
      const resumenRef = db.collection('resumenes_evaluacion').doc(cuidadorId);
      const resumenSnap = await resumenRef.get();
      if (resumenSnap.exists) {
        await resumenRef.update({
          cantidad_paseos_realizados: cantidad,
          actualizado_en: now,
          actualizado_por: SISTEMA,
        });
      } else {
        await resumenRef.set({
          cantidad_paseos_realizados: cantidad,
          creado_en: now,
          actualizado_en: now,
          creado_por: SISTEMA,
          actualizado_por: SISTEMA,
        });
      }

      // 2. Cache para la UI: perfiles_publicos/{uid} (sin crear fantasma)
      const perfilRef = db.collection('perfiles_publicos').doc(cuidadorId);
      try {
        await perfilRef.update({
          cantidad_paseos_realizados: cantidad,
          actualizado_en: now,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          (error as { code?: string }).code === 'not-found'
        ) {
          console.log(
            `[alCompletarPaseo] PerfilPublico ${cuidadorId} no existe; cache omitido`
          );
        } else {
          throw error;
        }
      }

      console.log(
        `[alCompletarPaseo] ${cuidadorId}: ${cantidad} paseos realizados`
      );
    } catch (error) {
      console.error(
        `[alCompletarPaseo] Error procesando ${event.params.paseoId}:`,
        error
      );
      throw error;
    }
  }
);
