/* eslint-disable camelcase */
import {onDocumentUpdated} from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();

export const alPublicarNuevaVersion = onDocumentUpdated(
  {
    document: 'documentos_consentimientos/{docId}',
    region: 'us-central1',
  },
  async (event) => {
    try {
      const docAntes = event.data?.before.data();
      const docAhora = event.data?.after.data();

      if (!docAntes || !docAhora) return;

      // Solo procesar si cambió de activo: true → false
      if (!(docAntes.activo === true && docAhora.activo === false)) return;

      const tipo_documento = docAhora.tipo_documento;
      const docId = event.params.docId;

      // Buscar usuarios que aceptaron este documento específico
      const usuarios = await db
        .collection('usuarios')
        .where(
          `consentimientos_estado_actual.${tipo_documento}.documento_id`,
          '==',
          docId
        )
        .get();

      if (usuarios.empty) return;

      // Marcar como desactualizado
      const batch = db.batch();
      usuarios.forEach((userDoc) => {
        let fieldPath = `consentimientos_estado_actual.${tipo_documento}`;
        fieldPath += '.es_documento_vigente_hoy';

        batch.update(userDoc.ref, {
          [fieldPath]: false,
          actualizado_en: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('[alPublicarNuevaVersion]', error);
    }
  }
);
