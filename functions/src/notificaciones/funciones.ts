/* eslint-disable camelcase */
/**
 * Cloud Functions de notificaciones. Cada aviso nuevo de la bandeja
 * (usuarios/{uid}/notificaciones) sale por los canales externos que permiten
 * el catálogo y las preferencias del usuario, y deja el resultado en
 * `canales` del mismo documento.
 */
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import admin from '../comun/firebaseAdminCompat';
import {SECRETOS_EMAIL} from '../comun/email';
import {esTipoNotificacion} from '../compartido/notificaciones';
import {despacharAviso} from './despacho';

if (!admin.apps || admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

export const alCrearNotificacion = onDocumentCreated(
  {document: 'usuarios/{uid}/notificaciones/{id}', secrets: SECRETOS_EMAIL},
  async (event) => {
    const snap = event.data;
    const aviso = snap?.data();
    if (!snap || !aviso || !esTipoNotificacion(aviso.tipo)) return;

    const canales = await despacharAviso(db, event.params.uid, {
      tipo: aviso.tipo,
      titulo: aviso.titulo,
      cuerpo: aviso.cuerpo,
      datos: aviso.datos,
    });
    if (Object.keys(canales).length > 0) await snap.ref.update({canales});
  }
);
