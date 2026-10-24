/* eslint-disable camelcase */
/**
 * Envío de push con el servicio de Expo (funciona igual en iOS y Android; el
 * token lo guarda la app en usuarios/{uid}/dispositivos).
 */
import type {Firestore} from 'firebase-admin/firestore';

export const URL_PUSH_EXPO = 'https://exp.host/--/api/v2/push/send';

export type EstadoPush = 'ENVIADA' | 'SIN_DISPOSITIVOS' | 'FALLIDA';

export interface MensajePush {
  titulo: string
  cuerpo: string
  datos: Record<string, string | number>
}

type EnviarHttp = (url: string, init: {
  method: string
  headers: Record<string, string>
  body: string
}) => Promise<{ok: boolean, status: number, json: () => Promise<unknown>}>;

interface TicketExpo {
  status: 'ok' | 'error'
  details?: {error?: string}
}

/**
 * Envía el mensaje a todos los dispositivos activos del usuario. Los tokens
 * que Expo reporta como inexistentes (app desinstalada) se desactivan.
 * Lanza un Error si el servicio de Expo no responde bien.
 * @param {Firestore} db Firestore.
 * @param {string} uid Destinatario.
 * @param {MensajePush} mensaje Contenido del aviso.
 * @param {EnviarHttp} enviar Cliente HTTP (fetch; se inyecta en tests).
 * @return {Promise<EstadoPush>} Resultado del envío.
 */
export async function enviarPush(
  db: Firestore,
  uid: string,
  mensaje: MensajePush,
  enviar: EnviarHttp = fetch as unknown as EnviarHttp
): Promise<EstadoPush> {
  const dispositivos = await db.collection('usuarios').doc(uid)
    .collection('dispositivos').where('activo', '==', true).get();
  if (dispositivos.empty) return 'SIN_DISPOSITIVOS';

  const docs = dispositivos.docs;
  const respuesta = await enviar(URL_PUSH_EXPO, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
    body: JSON.stringify(docs.map((d) => ({
      to: d.data().token,
      title: mensaje.titulo,
      body: mensaje.cuerpo,
      data: mensaje.datos,
      channelId: 'default',
    }))),
  });
  if (!respuesta.ok) throw new Error(`Expo Push respondió ${respuesta.status}`);

  const tickets = ((await respuesta.json()) as {data?: TicketExpo[]}).data ?? [];
  let enviados = 0;
  await Promise.all(docs.map(async (d, i) => {
    const ticket = tickets[i];
    if (ticket?.status === 'ok') {
      enviados++;
    } else if (ticket?.details?.error === 'DeviceNotRegistered') {
      await d.ref.update({activo: false});
    }
  }));
  return enviados > 0 ? 'ENVIADA' : 'FALLIDA';
}
