/* eslint-disable camelcase */
/**
 * Cuando una versión de un consentimiento pasa de ACTIVA a HISTORICA (se
 * publicó una nueva), marca a los usuarios que la habían aceptado como
 * "versión desactualizada" para que la app les pida aceptar la nueva.
 *
 * Escucha las versiones del motor genérico: versionados/{tipo}/versiones/{v}.
 */
import {onDocumentUpdated} from 'firebase-functions/v2/firestore';
import admin from '../comun/firebaseAdminCompat';
import {PREFIJO_CONSENTIMIENTO} from '../compartido/consentimiento';

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();

export const alArchivarConsentimiento = onDocumentUpdated(
  {
    document: 'versionados/{tipo}/versiones/{versionId}',
    region: 'us-central1',
  },
  async (event) => {
    const {tipo, versionId} = event.params;
    if (!tipo.startsWith(PREFIJO_CONSENTIMIENTO)) return;

    const antes = event.data?.before.data();
    const ahora = event.data?.after.data();
    if (!(antes?.estado === 'ACTIVA' && ahora?.estado === 'HISTORICA')) return;

    const tipo_documento = tipo.slice(PREFIJO_CONSENTIMIENTO.length);
    const documentoId = `${tipo}/${versionId}`;
    const campo = `consentimientos_estado_actual.${tipo_documento}`;

    const usuarios = await db
      .collection('usuarios')
      .where(`${campo}.documento_id`, '==', documentoId)
      .get();
    if (usuarios.empty) return;

    const batch = db.batch();
    usuarios.forEach((usuario) => {
      batch.update(usuario.ref, {
        [`${campo}.es_documento_vigente_hoy`]: false,
        actualizado_en: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    console.log(`[alArchivarConsentimiento] ${documentoId}: ` +
      `${usuarios.size} usuario(s) deben aceptar la nueva versión`);
  }
);
