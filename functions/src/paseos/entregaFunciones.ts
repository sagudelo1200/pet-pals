/* eslint-disable camelcase */
/**
 * Cloud Functions del cierre de la entrega (capa delgada: autentica, valida
 * la entrada y delega en paseos/entrega.ts y economia/reclamo.ts).
 *
 * - alFinalizarPaseoEntrega: al pasar a FINALIZADO programa el seguimiento.
 * - avisarEntregaPendiente / revisarEntregaPendiente / cerrarEntregaAutomatico:
 *   tareas de un solo uso (Cloud Tasks), sin jobs periódicos.
 * - resolverEntregaPendiente: el equipo cierra a favor del cuidador o abre
 *   una disputa.
 * - abrirReclamoCobro / resolverReclamoCobro: "No estoy de acuerdo" del tutor
 *   y su resolución por el equipo.
 */
import {onDocumentUpdated} from 'firebase-functions/v2/firestore';
import {HttpsError, onCall, onRequest} from 'firebase-functions/v2/https';
import {Timestamp} from 'firebase-admin/firestore';
import admin from '../comun/firebaseAdminCompat';
import {
  OPCIONES_CALLABLE as OPCIONES,
  conErrores,
  requerirAdmin,
  requerirUid,
  texto,
} from '../comun/callables';
import {ErrorNegocio} from '../comun/errores';
import {validarMotivo} from '../compartido/versionables';
import {programarTarea} from '../economia/tareas';
import {
  abrirReclamoCobro as abrirReclamo,
  resolverReclamoCobro as resolverReclamo,
} from '../economia/reclamo';
import {
  abrirDisputaDeEntrega,
  avisarEntregaPendiente as avisar,
  cerrarEntregaAutomatico as cerrarAutomatico,
  cerrarEntregaPorEquipo,
  marcarParaRevision,
  programarSeguimientoEntrega,
} from './entrega';
import {esPaseo} from '../compartido/servicios';

if (!admin.apps || admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

/**
 * HTTP function privada invocada solo por Cloud Tasks (token OIDC).
 * Un error responde 500 para que Cloud Tasks reintente.
 * @param {string} nombre Nombre para los logs.
 * @param {Function} fn Lógica con el cuerpo de la petición.
 * @return {object} HTTP function.
 */
function tareaPrivada(
  nombre: string,
  fn: (body: Record<string, unknown>) => Promise<void>
) {
  return onRequest(
    {cors: false, invoker: 'private', region: 'us-central1'},
    async (req, res) => {
      if (req.method !== 'POST') {
        res.status(405).json({error: 'Method not allowed'});
        return;
      }
      try {
        await fn((req.body ?? {}) as Record<string, unknown>);
        res.status(200).json({ok: true});
      } catch (error) {
        console.error(`[entrega] ${nombre} falló:`, error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Error',
        });
      }
    }
  );
}

/**
 * Id del paseo de una tarea.
 * @param {Record<string, unknown>} body Cuerpo de la petición.
 * @return {string} Id.
 */
function paseoDe(body: Record<string, unknown>): string {
  const paseoId = body.paseoId;
  if (typeof paseoId !== 'string' || paseoId === '') {
    throw new Error('paseoId requerido');
  }
  return paseoId;
}

// ---------- Seguimiento de la entrega ----------

/** Al finalizar el paseo programa el aviso, la revisión y el cierre automático. */
export const alFinalizarPaseoEntrega = onDocumentUpdated(
  'operaciones/{operacionId}',
  async (event) => {
    const antes = event.data?.before.data();
    const despues = event.data?.after.data();
    if (!despues || !esPaseo(despues)) return;
    if (despues.estado !== 'FINALIZADO' || antes?.estado === 'FINALIZADO') return;

    const paseoId = event.params.operacionId;
    try {
      await programarSeguimientoEntrega(db, paseoId, despues, Timestamp.now().toMillis());
    } catch (error) {
      // No debe romper el cierre del paseo: el equipo aún puede revisarlo a mano
      console.error(`[entrega] No se programó el seguimiento de ${paseoId}:`, error);
    }
  }
);

export const avisarEntregaPendiente = tareaPrivada(
  'avisarEntregaPendiente',
  async (body) => {
    await avisar(db, paseoDe(body), Timestamp.now());
  }
);

export const revisarEntregaPendiente = tareaPrivada(
  'revisarEntregaPendiente',
  async (body) => {
    await marcarParaRevision(db, paseoDe(body), Timestamp.now());
  }
);

export const cerrarEntregaAutomatico = tareaPrivada(
  'cerrarEntregaAutomatico',
  async (body) => {
    await cerrarAutomatico(db, paseoDe(body), Timestamp.now());
  }
);

// ---------- Decisión del equipo ----------

export const resolverEntregaPendiente = onCall(OPCIONES, (request) =>
  conErrores(async () => {
    const uid = await requerirAdmin(db, request);
    const paseoId = texto(request.data?.paseoId, 'paseoId');
    const decision = texto(request.data?.decision, 'decision');
    const motivo = request.data?.motivo;
    const errorMotivo = validarMotivo(motivo);
    if (errorMotivo) throw new HttpsError('invalid-argument', errorMotivo);
    const opciones = {por: uid, motivo: String(motivo).trim(), ahora: Timestamp.now()};

    if (decision === 'cerrar_a_favor_cuidador') {
      return cerrarEntregaPorEquipo(db, paseoId, opciones);
    }
    if (decision === 'abrir_disputa') {
      await abrirDisputaDeEntrega(db, paseoId, opciones);
      return {tutores: [], completado: false};
    }
    throw new ErrorNegocio('invalid-argument', 'Decisión no válida');
  })
);

// ---------- Reclamo del tutor ----------

export const abrirReclamoCobro = onCall(OPCIONES, (request) =>
  conErrores(async () => {
    const uid = requerirUid(request);
    const obligacionId = texto(request.data?.obligacionId, 'obligacionId');
    await abrirReclamo(db, uid, obligacionId, request.data?.motivo, Timestamp.now());
    return {ok: true};
  })
);

export const resolverReclamoCobro = onCall(OPCIONES, (request) =>
  conErrores(async () => {
    const uid = await requerirAdmin(db, request);
    const obligacionId = texto(request.data?.obligacionId, 'obligacionId');
    const decision = texto(request.data?.decision, 'decision');
    const ahora = Timestamp.now();
    await resolverReclamo(db, obligacionId, decision as 'mantener' | 'anular', {
      por: uid,
      motivo: request.data?.motivo,
      ahora,
    });
    // Si el cobro sigue, la cobranza que se pausó se retoma
    if (decision === 'mantener') {
      const cuando = ahora.toMillis() + 60 * 1000;
      await programarTarea('revisarCobroTutor', {obligacionId}, cuando,
        `cobro-${obligacionId}-${cuando}`);
    }
    return {ok: true};
  })
);
