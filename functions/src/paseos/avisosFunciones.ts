/**
 * Disparadores que avisan al tutor lo que pasa en su paseo (ver
 * avisosAlTutor.ts). Un aviso que falla no debe tumbar el paseo: se registra
 * y se sigue.
 */
import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';
import admin from '../comun/firebaseAdminCompat';
import {esPaseo} from '../compartido/servicios';
import {
  avisarCambioDePaseo,
  avisarIncidente,
  avisarMensaje,
} from './avisosAlTutor';

if (!admin.apps || admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

/** Cada cambio de estado del paseo que el tutor debe conocer. */
export const alCambiarEstadoPaseoAvisar = onDocumentUpdated(
  'operaciones/{operacionId}',
  async (event) => {
    const antes = event.data?.before.data();
    const despues = event.data?.after.data();
    if (!despues || !esPaseo(despues)) return;
    try {
      await avisarCambioDePaseo(db, event.params.operacionId, antes, despues);
    } catch (error) {
      console.error(`[avisos] estado de ${event.params.operacionId}:`, error);
    }
  }
);

/** Un incidente reportado por el cuidador durante el paseo. */
export const alRegistrarIncidenteAvisar = onDocumentCreated(
  'operaciones/{operacionId}/eventos/{eventoId}',
  async (event) => {
    if (event.data?.data()?.evento !== 'incidente') return;
    try {
      await avisarIncidente(db, event.params.operacionId, event.params.eventoId);
    } catch (error) {
      console.error(`[avisos] incidente ${event.params.eventoId}:`, error);
    }
  }
);

/** Un mensaje nuevo en el chat del paseo. */
export const alCrearMensajeAvisar = onDocumentCreated(
  'conversaciones/{conversacionId}/mensajes/{mensajeId}',
  async (event) => {
    const mensaje = event.data?.data();
    if (!mensaje) return;
    try {
      await avisarMensaje(db, event.params.conversacionId, mensaje, Date.now());
    } catch (error) {
      console.error(`[avisos] mensaje ${event.params.mensajeId}:`, error);
    }
  }
);
