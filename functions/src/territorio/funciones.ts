/**
 * Cloud Functions del territorio (capa delgada: reciben el cambio y delegan
 * en territorio.ts). Son las únicas que escriben `territorio` e
 * `indice_cobertura`.
 *
 * - alCambiarCoberturaTerritorio: el perfil del cuidador cambió → índice y oferta
 *   (y, si vive fuera de servicio, su interés).
 * - alCambiarPaseoTerritorio: un paseo cambió → demanda y paseos en curso.
 * - alRegistrarEventoTerritorio: evento de la bitácora → narrativa de la microzona.
 * - reconstruirTerritorio: el admin lo reconstruye todo desde los datos.
 */
import {
  onDocumentCreated,
  onDocumentWritten,
} from 'firebase-functions/v2/firestore';
import {onCall} from 'firebase-functions/v2/https';
import {Timestamp} from 'firebase-admin/firestore';
import admin from '../comun/firebaseAdminCompat';
import {
  OPCIONES_CALLABLE as OPCIONES,
  conErrores,
  requerirAdmin,
} from '../comun/callables';
import {registrarInteresDeCuidador} from '../zonas/servicio';
import {
  actualizarPorPaseo,
  recalcularOperativas,
  reconstruirTerritorio as reconstruir,
  sincronizarCobertura,
  sumarEventoATerritorio,
} from './territorio';

if (!admin.apps || admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

/** Un fallo aquí no debe afectar a quien hizo el cambio: se registra y se sigue. */
const registrarFallo = (donde: string, id: string, error: unknown) =>
  console.error(`[territorio] ${donde} falló (${id}):`, error);

export const alCambiarCoberturaTerritorio = onDocumentWritten(
  'perfiles_publicos/{uid}',
  async (event) => {
    const uid = event.params.uid;
    try {
      const ahora = Timestamp.now();
      const despues = event.data?.after.data();
      const celdas = await sincronizarCobertura(
        db, uid, event.data?.before.data(), despues, ahora);
      if (celdas.length > 0) {
        await recalcularOperativas(db, celdas, ahora);
        // Si vive donde aún no se atiende, es señal de dónde abrir
        await registrarInteresDeCuidador(db, uid, despues, ahora);
      }
    } catch (error) {
      registrarFallo('cobertura', uid, error);
    }
  }
);

export const alCambiarPaseoTerritorio = onDocumentWritten(
  'operaciones/{operacionId}',
  async (event) => {
    const id = event.params.operacionId;
    try {
      await actualizarPorPaseo(
        db, event.data?.before.data(), event.data?.after.data(), Timestamp.now());
    } catch (error) {
      registrarFallo('paseo', id, error);
    }
  }
);

export const alRegistrarEventoTerritorio = onDocumentCreated(
  'operaciones/{operacionId}/eventos/{eventoId}',
  async (event) => {
    const {operacionId, eventoId} = event.params;
    if (event.data?.data()?.evento !== 'bitacora') return;
    try {
      await sumarEventoATerritorio(db, operacionId, eventoId, Timestamp.now());
    } catch (error) {
      registrarFallo('evento', `${operacionId}/${eventoId}`, error);
    }
  }
);

export const reconstruirTerritorio = onCall(
  {...OPCIONES, timeoutSeconds: 300, memory: '512MiB'},
  (request) =>
    conErrores(async () => {
      await requerirAdmin(db, request);
      return reconstruir(db, Timestamp.now());
    })
);
