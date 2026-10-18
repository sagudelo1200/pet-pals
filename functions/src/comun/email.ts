import * as functions from 'firebase-functions';
import sgMail from '@sendgrid/mail';
import {Configuration, SendApi, type V1SendRequest} from 'hostinger-mail-api-sdk';

/**
 * Envío de emails transaccionales con respaldo:
 * 1. SendGrid (principal)
 * 2. Hostinger Mail API (fallback), si SendGrid falla por cualquier motivo
 *
 * SendGrid envía desde REMITENTE_EMAIL (alias; requiere dominio autenticado).
 * Hostinger envía siempre desde el buzón real del token: HOSTINGER_MAILBOX_ID es
 * el resourceId (GET /api/v1/me) del buzón info@paw-path.com.co, no un email.
 * Los alias no aparecen en la API, por eso el fallback sale desde info@.
 */

export const REMITENTE_EMAIL = 'no-responder@paw-path.com.co';
export const REMITENTE_NOMBRE = 'Paw-Path';

/** Secretos que debe declarar toda function que envíe emails. */
export const SECRETOS_EMAIL = [
  'SENDGRID_API_KEY',
  'HOSTINGER_MAIL_TOKEN',
  'HOSTINGER_MAILBOX_ID',
];

export interface EmailSaliente {
  to: string
  subject: string
  html: string
}

export type ProveedorEmail = 'sendgrid' | 'hostinger';

/** Extrae un motivo legible de errores de SendGrid, axios (Hostinger) o genéricos. */
export function describirErrorEmail(error: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err = error as Record<string, any> | undefined;
  const sendgrid = err?.response?.body?.errors?.[0]?.message;
  if (typeof sendgrid === 'string') return sendgrid;
  const status = err?.response?.status;
  if (status) {
    // Hostinger responde { error, code, params }; otros servicios usan message
    const data = err?.response?.data;
    const partes = [data?.code, data?.error ?? data?.message].filter(
      (p): p is string => typeof p === 'string' && p !== ''
    );
    return `HTTP ${status}${partes.length ? ` - ${partes.join(': ')}` : ''}`;
  }
  return (err?.message as string) || 'Error desconocido';
}

/**
 * Envía con SendGrid (principal).
 * @param {EmailSaliente} email Destinatario, asunto y cuerpo HTML.
 */
async function enviarConSendGrid(email: EmailSaliente): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error('SendGrid no configurado');
  sgMail.setApiKey(apiKey);
  await sgMail.send({
    to: email.to,
    from: {email: REMITENTE_EMAIL, name: REMITENTE_NOMBRE},
    subject: email.subject,
    html: email.html,
  });
}

/**
 * Envía con Hostinger Mail API (fallback) desde el buzón configurado.
 * @param {EmailSaliente} email Destinatario, asunto y cuerpo HTML.
 */
async function enviarConHostinger(email: EmailSaliente): Promise<void> {
  const token = process.env.HOSTINGER_MAIL_TOKEN;
  const buzon = process.env.HOSTINGER_MAILBOX_ID;
  if (!token || !buzon) throw new Error('Hostinger no configurado');
  // Los tipos generados marcan todo como requerido; la API solo exige
  // un destinatario (to/cc/bcc), el resto es opcional.
  const payload: Partial<V1SendRequest> = {
    to: [email.to],
    displayName: REMITENTE_NOMBRE,
    subject: email.subject,
    html: email.html,
  };
  const api = new SendApi(new Configuration({accessToken: token}));
  await api.sendEmail(buzon, payload as V1SendRequest);
}

/**
 * Envía un email con SendGrid y, si falla, con Hostinger.
 * Devuelve el proveedor que lo envió; si fallan ambos lanza un Error con los
 * dos motivos.
 */
export async function enviarEmail(email: EmailSaliente): Promise<ProveedorEmail> {
  try {
    await enviarConSendGrid(email);
    return 'sendgrid';
  } catch (errorSendGrid) {
    const motivoSendGrid = describirErrorEmail(errorSendGrid);
    functions.logger.warn(
      `[email] SendGrid falló (${motivoSendGrid}); reintentando con Hostinger`
    );
    try {
      await enviarConHostinger(email);
      functions.logger.info(`[email] Enviado con Hostinger (fallback) a ${email.to}`);
      return 'hostinger';
    } catch (errorHostinger) {
      const motivoHostinger = describirErrorEmail(errorHostinger);
      functions.logger.error(`[email] Hostinger también falló (${motivoHostinger})`);
      throw new Error(`SendGrid: ${motivoSendGrid} | Hostinger: ${motivoHostinger}`);
    }
  }
}
