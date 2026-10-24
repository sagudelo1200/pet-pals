/* eslint-disable camelcase */
/**
 * Cierre de la entrega cuando el tutor no la confirma con su código.
 *
 * El cobro del paseo nace cuando el tutor valida el código de entrega
 * (economia/funciones.ts → alValidarEntregaEconomia). Si no lo hace, el
 * paseo se queda en FINALIZADO. Este módulo (lógica pura, sin Cloud
 * Functions) resuelve ese caso en tres momentos:
 *
 *   1. aviso al tutor en el chat del paseo (configuracion/paseos)
 *   2. marca de revisión para el equipo (configuracion/paseos)
 *   3. cierre por el equipo (o automático) a favor del cuidador, que marca
 *      la entrega como validada y deja que el trigger económico genere el
 *      cobro de siempre. Las reglas de cobro y reclamo son de la política
 *      con la que nació el paseo (politica_comercial.entrega).
 */
import type {Firestore, Timestamp} from 'firebase-admin/firestore';
import {ErrorNegocio} from '../comun/errores';
import {leerConfiguracion} from '../comun/configuracion';
import {obtenerPolitica, obtenerPoliticaVigente} from '../economia/politica';
import {programarTarea} from '../economia/tareas';

const HORA_MS = 60 * 60 * 1000;
export const SISTEMA_ENTREGA = 'sistema-cf-entrega';
export const MOTIVO_REVISION = 'ENTREGA_SIN_CONFIRMAR';
export const CLAVE_CHAT_ENTREGA_PENDIENTE = 'chat:sistema.entrega.pendiente';

type Paseo = Record<string, unknown>;

/**
 * Tutores que aún no validaron el código de entrega.
 * @param {Paseo} paseo Datos del paseo.
 * @return {string[]} UIDs de los tutores pendientes.
 */
export function tutoresPendientesDeEntrega(paseo: Paseo): string[] {
  const codigos = (paseo.codigos_entrega_por_tutor ?? {}) as Record<string, unknown>;
  const validados = (paseo.codigo_entrega_validado_por_tutor ?? {}) as
    Record<string, boolean>;
  return Object.keys(codigos).filter((t) => validados[t] !== true);
}

/**
 * ¿La entrega sigue esperando al tutor? (paseo finalizado con códigos sin validar)
 * @param {Paseo | undefined} paseo Datos del paseo.
 * @return {boolean} Si está pendiente.
 */
export function entregaPendiente(paseo: Paseo | undefined): paseo is Paseo {
  return !!paseo && paseo.tipo === 'paseo' && paseo.estado === 'FINALIZADO' &&
    tutoresPendientesDeEntrega(paseo).length > 0;
}

/**
 * Política con la que nació el paseo (o la vigente si faltara).
 * @param {Firestore} db Firestore.
 * @param {Paseo} paseo Datos del paseo.
 * @return {Promise<PoliticaComercial>} Política.
 */
async function politicaDelPaseo(db: Firestore, paseo: Paseo) {
  return typeof paseo.politica_version === 'number' ?
    obtenerPolitica(db, paseo.politica_version) :
    obtenerPoliticaVigente(db);
}

/**
 * Programa el seguimiento de una entrega: aviso, revisión y, si la política
 * lo permite, cierre automático. Nombres de tarea deterministas: un
 * disparador repetido no duplica nada.
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo recién finalizado.
 * @param {Paseo} paseo Datos del paseo.
 * @param {number} ahoraMs Momento de la finalización.
 */
export async function programarSeguimientoEntrega(
  db: Firestore,
  paseoId: string,
  paseo: Paseo,
  ahoraMs: number
): Promise<void> {
  const config = await leerConfiguracion(db, 'paseos');
  const politica = await politicaDelPaseo(db, paseo);

  await programarTarea('avisarEntregaPendiente', {paseoId},
    ahoraMs + config.entrega_aviso_horas * HORA_MS, `entrega-aviso-${paseoId}`);
  await programarTarea('revisarEntregaPendiente', {paseoId},
    ahoraMs + config.entrega_revision_horas * HORA_MS, `entrega-revision-${paseoId}`);

  const {cierre_automatico_horas: horas} = politica.entrega;
  if (horas > 0) {
    await programarTarea('cerrarEntregaAutomatico', {paseoId},
      ahoraMs + horas * HORA_MS, `entrega-cierre-${paseoId}`);
  }
}

/**
 * Recuerda al tutor, en el chat del paseo, que debe confirmar la entrega.
 * Idempotente (un solo aviso por paseo) y no hace nada si ya se confirmó o
 * si el chat del paseo no existe.
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<boolean>} true si se envió el aviso.
 */
export async function avisarEntregaPendiente(
  db: Firestore,
  paseoId: string,
  ahora: Timestamp
): Promise<boolean> {
  const paseo = (await db.collection('operaciones').doc(paseoId).get()).data();
  if (!entregaPendiente(paseo)) return false;

  const conversacion = await db.collection('conversaciones').doc(paseoId).get();
  if (!conversacion.exists) return false;

  const mensaje = db.collection('conversaciones').doc(paseoId)
    .collection('mensajes').doc('entrega-aviso');
  if ((await mensaje.get()).exists) return false;

  await mensaje.set({
    contenido: CLAVE_CHAT_ENTREGA_PENDIENTE,
    autor_uid: SISTEMA_ENTREGA,
    tipo_mensaje: 'sistema',
    metadata: {accion: 'entrega_pendiente'},
    creado_en: ahora,
    actualizado_en: ahora,
    creado_por: SISTEMA_ENTREGA,
    actualizado_por: SISTEMA_ENTREGA,
  });
  return true;
}

/**
 * Pasa el paseo a la cola de revisión del equipo si el tutor sigue sin
 * confirmar la entrega.
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<boolean>} true si quedó marcado para revisión.
 */
export async function marcarParaRevision(
  db: Firestore,
  paseoId: string,
  ahora: Timestamp
): Promise<boolean> {
  const ref = db.collection('operaciones').doc(paseoId);
  return db.runTransaction(async (tx) => {
    const paseo = (await tx.get(ref)).data();
    if (!entregaPendiente(paseo)) return false;
    if (paseo.requiere_revision === true || paseo.en_disputa) return false;
    tx.update(ref, {
      requiere_revision: true,
      requiere_revision_desde: ahora,
      motivo_revision: MOTIVO_REVISION,
    });
    return true;
  });
}

export interface ResultadoCierre {
  tutores: string[]
  completado: boolean
}

/**
 * Cierra la entrega a favor del cuidador: marca como validado el código de
 * los tutores pendientes y, si ya no queda ninguno, completa el paseo. El
 * trigger económico existente genera el cobro (con ventana de reclamo).
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo.
 * @param {object} opciones Quién cierra (UID o 'sistema'), motivo y momento.
 * @return {Promise<ResultadoCierre>} Tutores cerrados y si el paseo se completó.
 */
export async function cerrarEntregaPorEquipo(
  db: Firestore,
  paseoId: string,
  opciones: {por: string; motivo: string; ahora: Timestamp}
): Promise<ResultadoCierre> {
  const ref = db.collection('operaciones').doc(paseoId);
  const inicial = (await ref.get()).data();
  if (!inicial || inicial.tipo !== 'paseo') {
    throw new ErrorNegocio('not-found', 'El paseo no existe');
  }
  const politica = await politicaDelPaseo(db, inicial);
  if (!politica.entrega.cobrar_si_cierra_equipo) {
    throw new ErrorNegocio('failed-precondition',
      'La política de este paseo no permite cerrar la entrega sin el tutor');
  }

  return db.runTransaction(async (tx) => {
    const paseo = (await tx.get(ref)).data();
    if (!entregaPendiente(paseo)) {
      throw new ErrorNegocio('failed-precondition',
        'La entrega no está pendiente de confirmación');
    }
    const pendientes = tutoresPendientesDeEntrega(paseo);
    const validados = {
      ...((paseo.codigo_entrega_validado_por_tutor ?? {}) as Record<string, boolean>),
    };
    const momentos = {
      ...((paseo.timestamp_validacion_entrega_por_tutor ?? {}) as
        Record<string, unknown>),
    };
    for (const tutor of pendientes) {
      validados[tutor] = true;
      momentos[tutor] = opciones.ahora;
    }
    const completado = Object.keys(
      (paseo.codigos_entrega_por_tutor ?? {}) as Record<string, unknown>
    ).every((t) => validados[t] === true);

    tx.update(ref, {
      codigo_entrega_validado_por_tutor: validados,
      timestamp_validacion_entrega_por_tutor: momentos,
      cierre_por_equipo: {
        por: opciones.por,
        en: opciones.ahora,
        motivo: opciones.motivo,
      },
      requiere_revision: false,
      ...(completado && {
        estado: 'COMPLETADO',
        timestamp_validacion_tutor: opciones.ahora,
      }),
      actualizado_por: opciones.por,
      actualizado_en: opciones.ahora,
    });
    return {tutores: pendientes, completado};
  });
}

/**
 * Abre una disputa en lugar de cobrar: la entrega queda detenida hasta que
 * se resuelva por otra vía. No genera cobro.
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo.
 * @param {object} opciones Quién la abre, motivo y momento.
 */
export async function abrirDisputaDeEntrega(
  db: Firestore,
  paseoId: string,
  opciones: {por: string; motivo: string; ahora: Timestamp}
): Promise<void> {
  const ref = db.collection('operaciones').doc(paseoId);
  await db.runTransaction(async (tx) => {
    const paseo = (await tx.get(ref)).data();
    if (!entregaPendiente(paseo)) {
      throw new ErrorNegocio('failed-precondition',
        'La entrega no está pendiente de confirmación');
    }
    tx.update(ref, {
      en_disputa: {por: opciones.por, en: opciones.ahora, motivo: opciones.motivo},
      requiere_revision: false,
      actualizado_por: opciones.por,
      actualizado_en: opciones.ahora,
    });
  });
}

/**
 * Cierre automático (apagado por defecto): cierra a favor del cuidador solo si
 * la política lo permite y, cuando se exige evidencia, el cuidador subió la
 * foto del grupo.
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<ResultadoCierre | null>} Resultado, o null si no se cerró.
 */
export async function cerrarEntregaAutomatico(
  db: Firestore,
  paseoId: string,
  ahora: Timestamp
): Promise<ResultadoCierre | null> {
  const paseo = (await db.collection('operaciones').doc(paseoId).get()).data();
  if (!entregaPendiente(paseo) || paseo.en_disputa) return null;

  const {entrega} = await politicaDelPaseo(db, paseo);
  if (entrega.cierre_automatico_horas <= 0 || !entrega.cobrar_si_cierra_equipo) {
    return null;
  }
  if (entrega.cierre_automatico_requiere_evidencia && !paseo.foto_entrega_grupo) {
    // Sin evidencia no se cierra solo: queda para el equipo
    await marcarParaRevision(db, paseoId, ahora);
    return null;
  }
  return cerrarEntregaPorEquipo(db, paseoId, {
    por: 'sistema',
    motivo: 'Cierre automático por entrega sin confirmar',
    ahora,
  });
}
