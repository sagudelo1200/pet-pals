/* eslint-disable camelcase */
/**
 * AVISOS AL TUTOR durante el paseo: los puntos del recorrido en los que el
 * tutor necesita enterarse o actuar (el cuidador salió, llegó y hay que darle
 * el código, empezó, terminó y hay que validar la entrega, se canceló, hubo un
 * incidente, escribió). Cada uno es una entrada del catálogo de notificaciones;
 * aquí solo se decide cuándo avisar y a quién.
 *
 * El paseo puede tener varios tutores (paseo compartido): cada uno recibe lo
 * suyo, con las mascotas de su propio grupo.
 */
import type {Firestore} from 'firebase-admin/firestore';
import {notificar} from '../comun/notificar';
import type {TipoNotificacion} from '../compartido/notificaciones';

type Paseo = Record<string, unknown>;

const texto = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v : undefined;

/**
 * Qué aviso corresponde a un cambio de estado del paseo (null = ninguno).
 * Aceptar el paseo no está aquí: lo avisa `aceptarPaseo`, que sabe si el
 * cuidador aceptó con advertencias.
 * @param {Paseo | undefined} antes Paseo antes del cambio.
 * @param {Paseo} despues Paseo después del cambio.
 * @return {TipoNotificacion | null} Tipo de aviso.
 */
export function avisoPorEstado(
  antes: Paseo | undefined,
  despues: Paseo
): TipoNotificacion | null {
  const estado = despues.estado;
  if (estado === antes?.estado) return null;
  switch (estado) {
  case 'EN_CAMINO': return 'PASEO_EN_CAMINO';
  case 'EN_PUNTO_RECOGIDA': return 'PASEO_EN_PUNTO';
  case 'EN_PROGRESO': return 'PASEO_INICIADO';
  case 'FINALIZADO': return 'PASEO_FINALIZADO';
  case 'CANCELADO':
    // Solo si lo canceló el cuidador: quien cancela ya lo sabe, y una solicitud
    // que nadie tomó no tiene a quién culpar
    return texto(despues.id_cuidador) &&
      despues.actualizado_por === despues.id_cuidador ?
      'PASEO_CANCELADO' : null;
  default: return null;
  }
}

export interface DestinatarioPaseo {
  uid: string
  /** Nombres de sus mascotas en este paseo, ya unidos ("Max y Luna"). */
  mascotas: string
}

/**
 * Une nombres para leerlos en una frase.
 * @param {string[]} nombres Nombres.
 * @return {string} "A", "A y B" o "A, B y C".
 */
export function unirNombres(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? 'tu mascota';
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/**
 * Los tutores del paseo y las mascotas de cada uno (la subcolección
 * `mascotas` dice de quién es cada una; el que creó el paseo siempre cuenta).
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo.
 * @param {Paseo} paseo Datos del paseo.
 * @return {Promise<DestinatarioPaseo[]>} Un destinatario por tutor.
 */
export async function destinatariosDelPaseo(
  db: Firestore,
  paseoId: string,
  paseo: Paseo
): Promise<DestinatarioPaseo[]> {
  const snap = await db.collection('operaciones').doc(paseoId)
    .collection('mascotas').get();
  const porTutor = new Map<string, string[]>();
  for (const doc of snap.docs) {
    const dueno = texto(doc.data().id_usuario);
    if (!dueno) continue;
    porTutor.set(dueno, [...(porTutor.get(dueno) ?? []),
      texto(doc.data().nombre) ?? 'tu mascota']);
  }
  const creador = texto(paseo.creado_por);
  if (creador && !porTutor.has(creador)) porTutor.set(creador, []);
  return [...porTutor.entries()].map(([uid, nombres]) =>
    ({uid, mascotas: unirNombres(nombres)}));
}

/**
 * Avisa a los tutores un cambio de estado del paseo. Idempotente: un
 * disparador repetido no duplica el aviso.
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo.
 * @param {Paseo | undefined} antes Paseo antes del cambio.
 * @param {Paseo} despues Paseo después del cambio.
 * @return {Promise<number>} Avisos creados.
 */
export async function avisarCambioDePaseo(
  db: Firestore,
  paseoId: string,
  antes: Paseo | undefined,
  despues: Paseo
): Promise<number> {
  const tipo = avisoPorEstado(antes, despues);
  if (!tipo) return 0;
  const cuidador = texto(despues.cuidador_nombre_visual) ?? 'Tu cuidador';
  let creados = 0;
  for (const {uid, mascotas} of await destinatariosDelPaseo(db, paseoId, despues)) {
    const nuevo = await notificar(db, {
      tipo,
      uid,
      dedup_key: `paseo_${paseoId}_${String(despues.estado)}_${uid}`,
      datos: {paseo_id: paseoId, cuidador, mascotas},
    });
    if (nuevo) creados++;
  }
  return creados;
}

/**
 * Avisa a los tutores de un incidente que reportó el cuidador.
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo.
 * @param {string} eventoId Evento del incidente (dedup).
 * @return {Promise<number>} Avisos creados.
 */
export async function avisarIncidente(
  db: Firestore,
  paseoId: string,
  eventoId: string
): Promise<number> {
  const paseo = (await db.collection('operaciones').doc(paseoId).get()).data();
  if (!paseo) return 0;
  const cuidador = texto(paseo.cuidador_nombre_visual) ?? 'Tu cuidador';
  let creados = 0;
  for (const {uid, mascotas} of await destinatariosDelPaseo(db, paseoId, paseo)) {
    const nuevo = await notificar(db, {
      tipo: 'INCIDENTE_PASEO',
      uid,
      dedup_key: `incidente_${eventoId}_${uid}`,
      datos: {paseo_id: paseoId, cuidador, mascotas},
    });
    if (nuevo) creados++;
  }
  return creados;
}

/** Un aviso de mensaje como máximo cada tanto por conversación y persona. */
export const VENTANA_AVISO_CHAT_MS = 10 * 60 * 1000;

/**
 * Avisa del mensaje nuevo al resto de la conversación. Los mensajes de sistema
 * no avisan y una racha de mensajes seguidos genera un solo aviso (el primero),
 * para no llenar el teléfono.
 * @param {Firestore} db Firestore.
 * @param {string} conversacionId Conversación (= id del paseo).
 * @param {Record<string, unknown>} mensaje Mensaje nuevo.
 * @param {number} ahoraMs Momento del mensaje.
 * @return {Promise<number>} Avisos creados.
 */
export async function avisarMensaje(
  db: Firestore,
  conversacionId: string,
  mensaje: Record<string, unknown>,
  ahoraMs: number
): Promise<number> {
  const autor = texto(mensaje.autor_uid);
  if (!autor || mensaje.tipo_mensaje === 'sistema') return 0;
  const conversacion =
    (await db.collection('conversaciones').doc(conversacionId).get()).data();
  const participantes: string[] = Array.isArray(conversacion?.participantes) ?
    conversacion.participantes.filter(
      (p: unknown): p is string => typeof p === 'string') : [];
  const de = (await db.doc(`perfiles_publicos/${autor}`).get()).data()?.nombre;
  const cuerpo = (texto(mensaje.contenido) ?? '').slice(0, 120);
  const bloque = Math.floor(ahoraMs / VENTANA_AVISO_CHAT_MS);
  let creados = 0;
  for (const uid of participantes.filter((p) => p !== autor)) {
    const nuevo = await notificar(db, {
      tipo: 'MENSAJE_PASEO',
      uid,
      dedup_key: `chat_${conversacionId}_${uid}_${bloque}`,
      datos: {
        paseo_id: conversacionId,
        de: texto(de) ?? 'Nuevo mensaje',
        texto: cuerpo || 'Te escribió en el chat del paseo',
      },
    });
    if (nuevo) creados++;
  }
  return creados;
}
