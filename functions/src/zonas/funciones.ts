/**
 * Cloud Functions de las zonas de negocio (capa delgada).
 *
 * - guardarZona: el admin crea o edita una zona (con motivo e historial); si
 *   queda abierta, avisa a quienes pidieron que les avisaran.
 * - consultarServicio: ¿se atiende en esta celda? (para el cuidador).
 * - avisarCuandoLleguen: "Avísame cuando lleguemos" (tutor o cuidador).
 * - alCrearPaseoAsignarZona: cada paseo nuevo guarda la zona de su recogida y,
 *   si llegó a un sector sin servicio, se cancela.
 */
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {onCall} from 'firebase-functions/v2/https';
import {Timestamp} from 'firebase-admin/firestore';
import admin from '../comun/firebaseAdminCompat';
import {
  OPCIONES_CALLABLE as OPCIONES,
  conErrores,
  requerirAdmin,
  requerirUid,
} from '../comun/callables';
import {asignarZonaAPaseo, guardarZona as guardar} from './zonas';
import {
  avisarZonasAbiertas,
  cancelarSiFueraDeServicio,
  consultarServicio as consultar,
  exigirCeldaDeCobertura,
  registrarInteres,
} from './servicio';

if (!admin.apps || admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

export const guardarZona = onCall(
  {...OPCIONES, timeoutSeconds: 120},
  (request) =>
    conErrores(async () => {
      const autor = await requerirAdmin(db, request);
      const d = request.data ?? {};
      const resultado = await guardar(db, d, {
        motivo: d.motivo,
        autor,
        ahora: Timestamp.now(),
      });
      // Si la zona queda abierta, se avisa a quienes pidieron que les avisaran
      if (d.estado !== 'cerrada') {
        await avisarZonasAbiertas(db).catch((error) =>
          console.error('[zonas] no se pudo avisar a los interesados:', error));
      }
      return resultado;
    })
);

export const consultarServicio = onCall(OPCIONES, (request) =>
  conErrores(async () => {
    requerirUid(request);
    return consultar(db, exigirCeldaDeCobertura(request.data?.celda));
  })
);

export const avisarCuandoLleguen = onCall(OPCIONES, (request) =>
  conErrores(async () => {
    const uid = requerirUid(request);
    await registrarInteres(db, {
      uid,
      celda: request.data?.celda,
      rol: request.data?.rol,
      avisar: true,
    }, Timestamp.now());
    return {ok: true};
  })
);

export const alCrearPaseoAsignarZona = onDocumentCreated(
  'operaciones/{operacionId}',
  async (event) => {
    const id = event.params.operacionId;
    const paseo = event.data?.data();
    try {
      await asignarZonaAPaseo(db, id, paseo);
      await cancelarSiFueraDeServicio(db, id, paseo, Timestamp.now());
    } catch (error) {
      // Un fallo aquí no debe tumbar la creación del paseo: se registra y se sigue
      console.error(`[zonas] no se pudo procesar el paseo (${id}):`, error);
    }
  }
);
