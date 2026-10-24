/* eslint-disable camelcase */
/**
 * Cloud Functions del expediente de la mascota (capa delgada: autentica,
 * valida la entrada y delega en expediente/expediente.ts).
 *
 * - alRegistrarMomentoExpediente: cada momento del cuidador alimenta el
 *   expediente de las mascotas involucradas.
 * - alCambiarEstadoPaseoExpediente: autoriza al cuidador al confirmarse el
 *   paseo y cuenta el vínculo al finalizarlo.
 * - alActualizarMascotaExpediente / alBorrarMascotaExpediente: la ficha del
 *   tutor y su supresión llegan al expediente.
 * - registrarLlegada: "¿cómo llegó?" del tutor.
 * - confirmarAprendizaje: el tutor confirma o rechaza un aprendizaje.
 */
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';
import {onCall} from 'firebase-functions/v2/https';
import {Timestamp} from 'firebase-admin/firestore';
import admin from '../comun/firebaseAdminCompat';
import {
  OPCIONES_CALLABLE as OPCIONES,
  conErrores,
  requerirUid,
  texto,
} from '../comun/callables';
import {
  actualizarPorEstadoDePaseo,
  borrarExpediente,
  confirmarAprendizaje as confirmar,
  procesarMomentoDeEvento,
  registrarLlegada as registrar,
  sincronizarFicha,
} from './expediente';

if (!admin.apps || admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

/** Un fallo aquí no debe tumbar el paseo: se registra y se sigue. */
const registrarFallo = (donde: string, id: string, error: unknown) =>
  console.error(`[expediente] ${donde} falló (${id}):`, error);

// ---------- Triggers ----------

/** Cada momento (bitácora o incidente) suma al expediente de sus mascotas. */
export const alRegistrarMomentoExpediente = onDocumentCreated(
  'operaciones/{operacionId}/eventos/{eventoId}',
  async (event) => {
    const {operacionId, eventoId} = event.params;
    const tipo = event.data?.data()?.evento;
    if (tipo !== 'bitacora' && tipo !== 'incidente') return;
    try {
      await procesarMomentoDeEvento(db, operacionId, eventoId, Timestamp.now());
    } catch (error) {
      registrarFallo('momento', `${operacionId}/${eventoId}`, error);
    }
  }
);

/** Autoriza al cuidador al confirmarse el paseo; cuenta el vínculo al finalizar. */
export const alCambiarEstadoPaseoExpediente = onDocumentUpdated(
  'operaciones/{operacionId}',
  async (event) => {
    const antes = event.data?.before.data();
    const despues = event.data?.after.data();
    if (!despues || despues.tipo !== 'paseo') return;
    const nuevo = despues.estado;
    if (nuevo === antes?.estado) return;
    if (nuevo !== 'CONFIRMADO' && nuevo !== 'FINALIZADO') return;
    try {
      await actualizarPorEstadoDePaseo(
        db, event.params.operacionId, nuevo, Timestamp.now());
    } catch (error) {
      registrarFallo('estado del paseo', event.params.operacionId, error);
    }
  }
);

/** La ficha editada por el tutor se refleja en "quién es" y en los tutores. */
export const alActualizarMascotaExpediente = onDocumentUpdated(
  'mascotas/{mascotaId}',
  async (event) => {
    const mascota = event.data?.after.data();
    if (!mascota) return;
    try {
      await sincronizarFicha(db, event.params.mascotaId, mascota, Timestamp.now());
    } catch (error) {
      registrarFallo('ficha', event.params.mascotaId, error);
    }
  }
);

/** Borrar la mascota borra su expediente. */
export const alBorrarMascotaExpediente = onDocumentDeleted(
  'mascotas/{mascotaId}',
  async (event) => {
    try {
      await borrarExpediente(db, event.params.mascotaId);
    } catch (error) {
      registrarFallo('supresión', event.params.mascotaId, error);
    }
  }
);

// ---------- Callables ----------

export const registrarLlegada = onCall(OPCIONES, (request) =>
  conErrores(async () => {
    const uid = requerirUid(request);
    const mascotaIds = request.data?.mascotaIds;
    const mascotas = await registrar(db, uid, {
      paseoId: texto(request.data?.paseoId, 'paseoId'),
      llegada: texto(request.data?.llegada, 'llegada'),
      mascotaIds: Array.isArray(mascotaIds) ? mascotaIds : undefined,
    }, Timestamp.now());
    return {mascotas};
  })
);

export const confirmarAprendizaje = onCall(OPCIONES, (request) =>
  conErrores(async () => {
    const uid = requerirUid(request);
    await confirmar(db, uid, {
      mascotaId: texto(request.data?.mascotaId, 'mascotaId'),
      clave: texto(request.data?.clave, 'clave'),
      decision: texto(request.data?.decision, 'decision'),
    }, Timestamp.now());
    return {ok: true};
  })
);
