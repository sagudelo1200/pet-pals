import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';
import type {
  FirestoreEvent,
  QueryDocumentSnapshot,
} from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Trigger: Cachea insignias_verificacion en PerfilPublico cuando verificaciones cambian.
 * Se ejecuta automáticamente al crear o actualizar un documento en 'verificaciones'.
 */
export const actualizarInsignias = onDocumentCreated(
  'verificaciones/{docId}',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, { docId: string }>
  ) => {
    await procesarActualizacionInsignias(event);
  }
);

/**
 * Escucha cambios de estado en documentos de verificación
 */
export const actualizarInsigniasOnUpdate = onDocumentUpdated(
  'verificaciones/{docId}',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (event: FirestoreEvent<any, { docId: string }>) => {
    await procesarActualizacionInsignias(event);
  }
);

/**
 * Procesa actualización de insignias para un usuario
 */
async function procesarActualizacionInsignias(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any
): Promise<void> {
  try {
    const nuevoDoc = (event.data as QueryDocumentSnapshot)?.data();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docAnterior = (event as any).before?.data?.();

    // Si el documento no existe, ignorar
    if (!nuevoDoc) {
      return;
    }

    const usuarioId = nuevoDoc.usuario_id;
    if (!usuarioId) {
      return;
    }

    const estadoAnterior = docAnterior?.estado;
    const estadoNuevo = nuevoDoc.estado;

    if (estadoAnterior && estadoAnterior === estadoNuevo) {
      return;
    }

    const verificacionesSnapshot = await db
      .collection('verificaciones')
      .where('usuario_id', '==', usuarioId)
      .where('estado', '==', 'VERIFICADO')
      .get();

    // Mapear tipos a insignias
    const insignias: string[] = [];
    verificacionesSnapshot.forEach((doc) => {
      const tipo = doc.data().tipo;
      if (tipo && !insignias.includes(tipo)) {
        insignias.push(tipo);
      }
    });

    // Actualizar PerfilPublico
    const perfilRef = db.collection('perfiles_publicos').doc(usuarioId);
    const perfilSnap = await perfilRef.get();

    if (perfilSnap.exists) {
      await perfilRef.update({
        insignias_verificacion: insignias,
        actualizado_en: admin.firestore.Timestamp.now(),
        actualizado_por: 'sistema',
      });
    } else {
      // Si el perfil no existe, crearlo
      await perfilRef.set(
        {
          insignias_verificacion: insignias,
          creado_en: admin.firestore.Timestamp.now(),
          actualizado_en: admin.firestore.Timestamp.now(),
          creado_por: 'sistema',
          actualizado_por: 'sistema',
        },
        {merge: true}
      );
    }
  } catch (error) {
    return;
  }
}
