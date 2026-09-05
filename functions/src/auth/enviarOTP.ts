import * as functions from 'firebase-functions';
import sgMail from '@sendgrid/mail';
import * as admin from 'firebase-admin';
import {injectOTPData} from './emailTemplates';

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const MINUTOS_EXPIRACION = 10;

// Inicializar SendGrid con API key (del secreto de Firebase Functions)
const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
}

// Interfaces para tipado
interface EnviarOTPRequest {
  email: string
  uid: string
}

interface EnviarOTPResponse {
  success: boolean
  error?: string
  mensaje?: string
  minutosExpiracion?: number
}

/**
 * Genera OTP de 6 dígitos y lo envía por email. No retorna código en respuesta.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const enviarOTP = functions.https.onCall(
  {secrets: ['SENDGRID_API_KEY']},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (request: any): Promise<EnviarOTPResponse> => {
    try {
      if (!request.auth) {
        return {
          success: false,
          error: 'Usuario no autenticado',
        } as EnviarOTPResponse;
      }

      const {email, uid} = request.data as EnviarOTPRequest;

      if (!email || !uid) {
        return {
          success: false,
          error: 'Email y UID son requeridos',
        } as EnviarOTPResponse;
      }

      if (request.auth.uid !== uid) {
        return {
          success: false,
          error: 'El UID no coincide con el usuario autenticado',
        } as EnviarOTPResponse;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          success: false,
          error: 'Formato de email inválido',
        } as EnviarOTPResponse;
      }

      const otp = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
      const ahora = admin.firestore.Timestamp.now();
      const expiraEn = new Date(
        ahora.toDate().getTime() + MINUTOS_EXPIRACION * 60000
      );

      await db
        .collection('otp_codes')
        .doc(uid)
        .set({
          id: uid,
          email: email,
          codigo: otp,
          utilizado: false,
          intentos_fallidos: 0,
          creado_en: ahora,
          expira_en: admin.firestore.Timestamp.fromDate(expiraEn),
          ttl: admin.firestore.Timestamp.fromDate(expiraEn),
        });

      const emailContent = {
        to: email,
        from: 'noreply@paw-path.com.co',
        subject: '🔐 Tu código de verificación - Paw-Path',
        html: injectOTPData(otp, MINUTOS_EXPIRACION),
      };

      await sgMail.send(emailContent);
      functions.logger.info(`[enviarOTP] OTP enviado a ${email} (UID: ${uid})`);
      return {
        success: true,
        mensaje: 'Código enviado a tu email. Revisa tu bandeja de entrada.',
        minutosExpiracion: MINUTOS_EXPIRACION,
      } as EnviarOTPResponse;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as Record<string, any>;
      functions.logger.error('[enviarOTP] Error:', error);

      // Detectar errores específicos de SendGrid
      if (err?.response?.body?.errors) {
        const sgError =
          err.response.body.errors[0]?.message || 'Error SendGrid desconocido';
        return {
          success: false,
          error: `Error de email: ${sgError}`,
        } as EnviarOTPResponse;
      }

      return {
        success: false,
        error:
          (err?.message as string) || 'Error desconocido al enviar el código',
      } as EnviarOTPResponse;
    }
  }
);
