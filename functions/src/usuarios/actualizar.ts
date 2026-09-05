import {onDocumentUpdated} from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import {
  construirActualizacion,
  extraerAntesYDespuesDesdeEvento,
} from '../comun/camposPublicos';

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Trigger: actualiza el `perfil_publico` cuando cambia `usuarios/{uid}`.
 */
export const actualizarPerfilPublico = onDocumentUpdated(
  'usuarios/{uid}',
  async (event: unknown) => {
    try {
      const params = (event as { params?: { uid?: string } }).params;
      const uid = params?.uid;
      if (!uid) return;

      const {antes, despues} = extraerAntesYDespuesDesdeEvento(event);

      // Solo continuar si cambió algún campo público relevante
      // NOTA: 'nombre' y 'foto' se sincronizan a perfiles_publicos.
      // 'verificado' (email) y 'verificacion' (identidad) son INDEPENDIENTES:
      // - verificado: boolean en usuarios (OTP flow)
      // - verificacion: enum en perfiles_publicos (verificación de docs, futuro)
      const relevante = ['nombre', 'foto'];
      const cambios: Record<string, unknown> = {};
      for (const k of relevante) {
        const b = antes[k];
        const a = despues[k];
        if (a !== undefined && a !== b) cambios[k] = a;
      }
      if (Object.keys(cambios).length === 0) return;

      const actualizar = construirActualizacion(cambios, uid);
      if (!actualizar) return;

      const perfilRef = admin.firestore().doc(`perfiles_publicos/${uid}`);
      // Enriquecer el perfil de forma idempotente usando merge.
      await perfilRef.set(actualizar, {merge: true});
    } catch (err) {
      console.error('Error en actualizarPerfilPublico:', err);
    }
    return;
  }
);
