import * as functions from 'firebase-functions';
import admin from '../comun/firebaseAdminCompat';
import {randomInt} from 'crypto';
import {injectOTPData} from './emailTemplates';
import {enviarEmail, describirErrorEmail, SECRETOS_EMAIL} from '../comun/email';
import {leerConfiguracion} from '../comun/configuracion';

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// Interfaces para tipado
// `email` se ignora: el código se envía siempre al email de la cuenta autenticada
interface EnviarOTPRequest {
  email?: string
  uid: string
}

interface EnviarOTPResponse {
  success: boolean
  error?: string
  mensaje?: string
  /** Segundos que le quedan al código vigente (la app muestra la cuenta). */
  segundosValidez?: number
  /** Segundos hasta poder pedir otro código. */
  segundosParaReenvio?: number
  /** Intentos fallidos permitidos con este código. */
  maxIntentos?: number
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

      const {uid} = request.data as EnviarOTPRequest;
      const email = request.auth.token?.email as string | undefined;

      if (!uid) {
        return {
          success: false,
          error: 'UID es requerido',
        } as EnviarOTPResponse;
      }

      if (!email) {
        return {
          success: false,
          error: 'La cuenta no tiene un email asociado',
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

      const ahora = admin.firestore.Timestamp.now();
      const otpRef = db.collection('otp_codes').doc(uid);
      // Validez y espera entre envíos: configuracion/auth (la misma espera
      // que muestra el botón "Reenviar" de la app)
      const config = await leerConfiguracion(db, 'auth');
      const MINUTOS_EXPIRACION = config.otp_minutos_expiracion;
      const SEGUNDOS_ENTRE_ENVIOS = config.otp_segundos_reenvio;
      // Límites reales para la app (el servidor manda, no la configuración local)
      const limites = (creadoMs: number, expiraMs: number) => ({
        segundosValidez: Math.max(0, Math.round((expiraMs - ahora.toMillis()) / 1000)),
        segundosParaReenvio: Math.max(0, Math.round(
          (creadoMs + SEGUNDOS_ENTRE_ENVIOS * 1000 - ahora.toMillis()) / 1000)),
        maxIntentos: config.otp_max_intentos,
      });

      // Límite de envíos: si hay un código sin usar enviado hace menos de
      // SEGUNDOS_ENTRE_ENVIOS, no se envía otro (evita gastar créditos y abuso)
      const otpPrevio = (await otpRef.get()).data();
      const creadoPrevio = otpPrevio?.creado_en?.toMillis?.();
      if (
        otpPrevio &&
        !otpPrevio.utilizado &&
        typeof creadoPrevio === 'number' &&
        ahora.toMillis() - creadoPrevio < SEGUNDOS_ENTRE_ENVIOS * 1000
      ) {
        functions.logger.info(`[enviarOTP] Envío omitido por límite (UID: ${uid})`);
        return {
          success: true,
          mensaje:
            'Ya te enviamos un código hace un momento. Revisa tu bandeja de entrada.',
          ...limites(creadoPrevio, otpPrevio.expira_en?.toMillis?.() ?? creadoPrevio),
        } as EnviarOTPResponse;
      }

      const otp = String(randomInt(0, 1000000)).padStart(6, '0');
      const expiraEn = new Date(
        ahora.toDate().getTime() + MINUTOS_EXPIRACION * 60000
      );

      await otpRef.set({
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
        ...limites(ahora.toMillis(), expiraEn.getTime()),
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
