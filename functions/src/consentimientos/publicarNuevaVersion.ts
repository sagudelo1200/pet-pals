/* eslint-disable camelcase */
/**
 * Cloud Function para publicar nuevas versiones de documentos de consentimiento.
 *
 * Nota: Este archivo usa snake_case (tipo_documento, etc.) para alinearse con:
 * 1. Payloads de cliente (resto de la app)
 * 2. Almacenamiento en Firestore (convención de la app)
 * 3. Documentos de usuario (campo tipo_documento)
 */

import {onCall, HttpsError} from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();

/**
 * Genera un hash SHA256 del contenido de un documento de consentimiento.
 *
 * @param contenido - Contenido del documento para hashear
 * @returns Hash con prefijo 'sha256:'
 */
function generarHashContenido(contenido: string): string {
  return 'sha256:' + crypto.createHash('sha256').update(contenido).digest('hex');
}

export const publicarNuevaVersion = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    try {
      // Validar autenticación y rol admin
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Usuario no autenticado');
      }

      const uid = request.auth.uid;
      const userDoc = await db.collection('usuarios').doc(uid).get();
      const userRoles = userDoc.data()?.roles || [];

      if (!userRoles.includes('admin')) {
        throw new HttpsError(
          'permission-denied',
          'Solo administradores pueden publicar nuevas versiones'
        );
      }

      // Validar entrada
      const {tipo_documento, contenido, titulo} = request.data;

      if (typeof tipo_documento !== 'string' || !tipo_documento.trim()) {
        throw new HttpsError('invalid-argument', 'tipo_documento es requerido');
      }

      if (typeof contenido !== 'string' || !contenido.trim()) {
        throw new HttpsError('invalid-argument', 'contenido es requerido');
      }

      if (typeof titulo !== 'string' || !titulo.trim()) {
        throw new HttpsError('invalid-argument', 'titulo es requerido');
      }

      // Obtener versión vigente actual
      const vigenteQuery = await db
        .collection('documentos_consentimientos')
        .where('tipo_documento', '==', tipo_documento)
        .where('activo', '==', true)
        .limit(1)
        .get();

      if (vigenteQuery.empty) {
        throw new HttpsError(
          'not-found',
          `No hay versión vigente de ${tipo_documento}`
        );
      }

      const vigenteDoc = vigenteQuery.docs[0];
      const vigenteData = vigenteDoc.data();
      const nuevaVersion = (vigenteData.version || 0) + 1;
      const nuevoDocId = `${tipo_documento}_v${nuevaVersion}`;
      const hashContenido = generarHashContenido(contenido);
      const timestamp = admin.firestore.Timestamp.now();

      const nuevoDocumento = {
        tipo_documento: tipo_documento,
        version: nuevaVersion,
        titulo,
        contenido,
        hash_contenido: hashContenido,
        es_obligatorio: vigenteData.es_obligatorio ?? true,
        roles_requeridos: vigenteData.roles_requeridos || [],
        requiere_reconfirmacion_meses:
          vigenteData.requiere_reconfirmacion_meses || null,
        activo: true,
        creado_en: timestamp,
        creado_por: uid,
      };

      // Transacción: crear v_nueva y desactivar v_anterior
      await db.runTransaction(async (transaction) => {
        const nuevoDocRef = db
          .collection('documentos_consentimientos')
          .doc(nuevoDocId);
        transaction.set(nuevoDocRef, nuevoDocumento);

        const vigenteRef = db
          .collection('documentos_consentimientos')
          .doc(vigenteDoc.id);
        transaction.update(vigenteRef, {activo: false});
      });

      console.log(`[publicarNuevaVersion] ${tipo_documento} v${nuevaVersion}`);

      return {
        exito: true,
        documento_id: nuevoDocId,
        version: nuevaVersion,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('[publicarNuevaVersion]', error);
      throw new HttpsError('internal', 'Error interno');
    }
  }
);
