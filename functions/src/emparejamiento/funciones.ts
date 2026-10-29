/**
 * Cloud Functions del emparejamiento (capa delgada: autentica y delega en
 * emparejamiento.ts).
 *
 * - buscarCuidadores: cuidadores para un pedido, ordenados por encaje y con
 *   las razones. Solo el servidor ve las agendas, las excepciones y los
 *   vínculos con la mascota, por eso la búsqueda vive aquí y no en la app.
 * - aceptarPaseo: el cuidador acepta; el servidor vuelve a comprobar lo
 *   innegociable y, si hay advertencias (tamaño, cupo propio), pide confirmar.
 * - alCrearPaseoValidarCuidador: un paseo dirigido a quien no puede tomarlo se
 *   abre a otros cuidadores.
 */
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {onCall} from 'firebase-functions/v2/https';
import admin from '../comun/firebaseAdminCompat';
import {
  OPCIONES_CALLABLE as OPCIONES,
  conErrores,
  requerirUid,
} from '../comun/callables';
import {
  aceptarPaseo as aceptar,
  buscarCuidadores as buscar,
  validarAsignacionAlCrear,
} from './emparejamiento';
import {esPaseo} from '../compartido/servicios';

if (!admin.apps || admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

export const buscarCuidadores = onCall(OPCIONES, (request) =>
  conErrores(() => buscar(db, requerirUid(request), request.data, Date.now()))
);

export const aceptarPaseo = onCall(OPCIONES, (request) =>
  conErrores(() => aceptar(
    db, requerirUid(request), request.data?.paseoId, Date.now(),
    request.data?.confirmo === true))
);

export const alCrearPaseoValidarCuidador = onDocumentCreated(
  'operaciones/{operacionId}',
  async (event) => {
    if (!esPaseo(event.data?.data())) return;
    try {
      await validarAsignacionAlCrear(db, event.params.operacionId, Date.now());
    } catch (error) {
      // Un fallo aquí no debe tumbar el paseo: la aceptación vuelve a validar
      console.error('[emparejamiento] validación al crear falló:',
        event.params.operacionId, error);
    }
  }
);
