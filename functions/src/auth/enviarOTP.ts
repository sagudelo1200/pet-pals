import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {randomInt} from 'crypto';
import {injectOTPData} from './emailTemplates';
import {enviarEmail, describirErrorEmail, SECRETOS_EMAIL} from '../comun/email';

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const MINUTOS_EXPIRACION = 10;

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
  {secrets: SECRETOS_EMAIL},
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

      const otp = String(randomInt(0, 1000000)).padStart(6, '0');
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

      // SendGrid con fallback a Hostinger (ver comun/email)
      let proveedor: string;
      try {
        proveedor = await enviarEmail({
          to: email,
          subject: '🔐 Tu código de verificación - Paw-Path',
          html: injectOTPData(otp, MINUTOS_EXPIRACION),
        });
      } catch (errorEmail) {
        functions.logger.error('[enviarOTP] No se pudo enviar el email:', errorEmail);
        return {
          success: false,
          error: `Error de email: ${describirErrorEmail(errorEmail)}`,
        } as EnviarOTPResponse;
      }
      functions.logger.info(
        `[enviarOTP] OTP enviado a ${email} (UID: ${uid}) vía ${proveedor}`
      );
      return {
        success: true,
        mensaje: 'Código enviado a tu email. Revisa tu bandeja de entrada.',
        minutosExpiracion: MINUTOS_EXPIRACION,
      } as EnviarOTPResponse;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as Record<string, any>;
      functions.logger.error('[enviarOTP] Error:', error);

      return {
        success: false,
        error:
          (err?.message as string) || 'Error desconocido al enviar el código',
      } as EnviarOTPResponse;
    }
  }
);
