/* eslint-disable camelcase */
/**
 * Saca un aviso de la bandeja por los canales externos (push, email) que el
 * catálogo y las preferencias del usuario permiten.
 */
import type {Firestore} from 'firebase-admin/firestore';
import {
  CATALOGO_NOTIFICACIONES,
  COLECCION_PREFERENCIAS,
  DOC_PREFERENCIAS_NOTIFICACIONES,
  canalesDeEnvio,
  type TipoNotificacion,
} from '../compartido/notificaciones';
import {enviarEmail} from '../comun/email';
import {enviarPush, type MensajePush} from '../comun/push';
import {htmlNotificacion} from './emailHtml';

export interface Emisores {
  push: (uid: string, mensaje: MensajePush) => Promise<string>
  email: (uid: string, mensaje: MensajePush) => Promise<string>
}

export const SIN_DESTINO = 'SIN_DESTINO';

/**
 * Envía el aviso por email al correo del usuario.
 * @param {Firestore} db Firestore.
 * @param {string} uid Destinatario.
 * @param {MensajePush} mensaje Contenido del aviso.
 * @return {Promise<string>} ENVIADA, o SIN_DESTINO si no tiene correo.
 */
export async function emailAUsuario(
  db: Firestore,
  uid: string,
  mensaje: MensajePush
): Promise<string> {
  const correo = (await db.collection('usuarios').doc(uid).get()).data()?.correo;
  if (typeof correo !== 'string' || !correo) return SIN_DESTINO;
  await enviarEmail({
    to: correo,
    subject: mensaje.titulo,
    html: htmlNotificacion(mensaje.titulo, mensaje.cuerpo),
  });
  return 'ENVIADA';
}

/**
 * Despacha un aviso por cada canal permitido. Un canal que falla no impide
 * los demás: queda como FALLIDA en el resultado.
 * @param {Firestore} db Firestore.
 * @param {string} uid Destinatario.
 * @param {object} aviso Aviso de la bandeja (tipo, titulo, cuerpo, datos).
 * @param {Emisores} emisores Envío por canal (se inyecta en tests).
 * @return {Promise<Record<string, string>>} Estado por canal.
 */
export async function despacharAviso(
  db: Firestore,
  uid: string,
  aviso: {
    tipo: TipoNotificacion
    titulo: string
    cuerpo: string
    datos?: Record<string, string | number>
  },
  emisores: Emisores = {
    push: (u, m) => enviarPush(db, u, m),
    email: (u, m) => emailAUsuario(db, u, m),
  }
): Promise<Record<string, string>> {
  const preferencias = (await db.collection('usuarios').doc(uid)
    .collection(COLECCION_PREFERENCIAS)
    .doc(DOC_PREFERENCIAS_NOTIFICACIONES).get()).data();
  const canales = canalesDeEnvio(CATALOGO_NOTIFICACIONES[aviso.tipo], preferencias);

  const mensaje = {
    titulo: aviso.titulo,
    cuerpo: aviso.cuerpo,
    datos: aviso.datos ?? {},
  };
  const estados: Record<string, string> = {};
  for (const canal of canales) {
    if (canal !== 'push' && canal !== 'email') continue; // sms: aún sin proveedor
    try {
      estados[canal] = await emisores[canal](uid, mensaje);
    } catch (error) {
      console.error(`[notificaciones] ${canal} falló (${aviso.tipo}):`, error);
      estados[canal] = 'FALLIDA';
    }
  }
  return estados;
}
