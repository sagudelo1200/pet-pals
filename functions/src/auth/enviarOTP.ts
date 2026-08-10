import * as functions from "firebase-functions";
import {defineSecret} from "firebase-functions/params";
import * as sgMail from "@sendgrid/mail";
import * as admin from "firebase-admin";

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const SENDGRID_API_KEY = defineSecret("SENDGRID_API_KEY");
const MINUTOS_EXPIRACION = 10;

// Interfaces para tipado (copiadas de models/OTPCode.ts)
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
 * Cloud Function: Genera y envía OTP por email via SendGrid
 *
 * FLOW:
 * 1. Cliente llama con email + uid
 * 2. Función genera OTP de 6 dígitos aleatorio
 * 3. Envía email via SendGrid
 * 4. Guarda OTP en Firestore/otp_codes/{uid} con TTL de 10 minutos
 * 5. Responde al cliente con éxito
 *
 * @param data {EnviarOTPRequest}
 * @param context Firebase context
 * @returns {EnviarOTPResponse}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const enviarOTP = functions.https.onCall(
  {secrets: [SENDGRID_API_KEY]},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (request: any): Promise<EnviarOTPResponse> => {
    try {
      // 1. VALIDACIONES
      if (!request.auth) {
        return {
          success: false,
          error: "Usuario no autenticado",
        } as EnviarOTPResponse;
      }

      const {email, uid} = request.data as EnviarOTPRequest;

      if (!email || !uid) {
        return {
          success: false,
          error: "Email y UID son requeridos",
        } as EnviarOTPResponse;
      }

      if (request.auth.uid !== uid) {
        return {
          success: false,
          error: "El UID no coincide con el usuario autenticado",
        } as EnviarOTPResponse;
      }

      // 2. GENERAR OTP (6 dígitos aleatorio)
      const otp = String(Math.floor(Math.random() * 999999)).padStart(6, "0");

      // 3. PREPARAR EMAIL
      sgMail.setApiKey(SENDGRID_API_KEY.value());

      const emailContent = {
        to: email,
        from: "noreply@paw-path.com.co",
        subject: "🔐 Tu código de verificación - Paw-Path",
        html: buildEmailHTML(otp),
      };

      // 4. ENVIAR EMAIL
      await sgMail.send(emailContent);

      // 5. GUARDAR OTP EN FIRESTORE CON TTL
      const ahora = admin.firestore.Timestamp.now();
      const expiraEn = new Date(
        ahora.toDate().getTime() + MINUTOS_EXPIRACION * 60000
      );

      await db
        .collection("otp_codes")
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

      // 6. RESPUESTA EXITOSA
      return {
        success: true,
        mensaje: "OTP enviado exitosamente",
        minutosExpiracion: MINUTOS_EXPIRACION,
      } as EnviarOTPResponse;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as Record<string, any>;
      functions.logger.error("Error en enviarOTP:", error);

      // Detectar errores específicos de SendGrid
      if (err?.response?.body?.errors) {
        const sgError =
          err.response.body.errors[0]?.message || "Error SendGrid desconocido";
        return {
          success: false,
          error: `Error de email: ${sgError}`,
        } as EnviarOTPResponse;
      }

      return {
        success: false,
        error: (err?.message as string) || "Error desconocido al enviar OTP",
      } as EnviarOTPResponse;
    }
  }
);

/**
 * Construye el HTML del email con diseño Paw-Path
 * Rompe líneas para cumplir con ESLint max-len (90 caracteres)
 */
function buildEmailHTML(otp: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
        Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .container { max-width: 600px; margin: 0 auto; background: #0A0F0E; }
    .wrapper { background: #0A0F0E; padding: 0; }
    .header {
      background: linear-gradient(135deg, #1D8F73 0%, #2DB391 100%);
      padding: 40px 20px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -20px;
      right: -20px;
      font-size: 120px;
      opacity: 0.1;
    }
    .logo { font-size: 42px; margin-bottom: 8px; }
    .logo-text {
      color: #EBF4F2;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: 1px;
      margin: 0;
    }
    .tagline {
      color: #98A7A4;
      font-size: 13px;
      margin-top: 4px;
      font-weight: 300;
    }
    .content {
      background: #121918;
      padding: 40px 30px;
      color: #EBF4F2;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 24px;
      color: #EBF4F2;
      line-height: 1.6;
    }
    .message {
      font-size: 15px;
      color: #98A7A4;
      margin-bottom: 32px;
      line-height: 1.8;
    }
    .otp-section {
      background: linear-gradient(135deg, #1D8F73 0%, #2DB391 100%);
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      margin: 32px 0;
      box-shadow: 0 8px 24px rgba(29, 143, 115, 0.2);
    }
    .otp-label {
      color: #98A7A4;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 12px;
      opacity: 0.9;
    }
    .otp-code {
      font-size: 48px;
      font-weight: 700;
      color: #F5F5DC;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
      margin: 0;
    }
    .otp-timer {
      color: #98A7A4;
      font-size: 13px;
      margin-top: 12px;
      opacity: 0.8;
    }
    .features {
      background: #182422;
      border-left: 4px solid #2DB391;
      padding: 20px;
      margin: 28px 0;
      border-radius: 4px;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 12px;
      font-size: 14px;
    }
    .feature-item:last-child { margin-bottom: 0; }
    .feature-icon {
      margin-right: 12px;
      font-size: 18px;
      flex-shrink: 0;
    }
    .feature-text {
      color: #EBF4F2;
      line-height: 1.5;
    }
    .security-notice {
      background: rgba(29, 143, 115, 0.1);
      border: 1px solid #2DB391;
      border-radius: 8px;
      padding: 16px;
      margin: 24px 0;
      font-size: 13px;
      color: #98A7A4;
      line-height: 1.6;
    }
    .security-notice strong { color: #2DB391; }
    .footer {
      background: #0A0F0E;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #1F2D2A;
    }
    .footer-text {
      font-size: 12px;
      color: #98A7A4;
      line-height: 1.6;
      margin-bottom: 8px;
    }
    .footer-links {
      font-size: 11px;
      color: #1D8F73;
      text-decoration: none;
    }
    .paw-print { font-size: 24px; margin: 16px 0; }
    .divider { height: 1px; background: #1F2D2A; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="wrapper">
      <!-- HEADER CON GRADIENTE -->
      <div class="header">
        <div class="logo">🐾</div>
        <h1 class="logo-text">Paw-Path</h1>
        <p class="tagline">Tu mascota merece un paseo con propósito</p>
      </div>

      <!-- CONTENIDO PRINCIPAL -->
      <div class="content">
        <h2 class="greeting">Bienvenido a Paw-Path 🎉</h2>

        <p class="message">
          Bienvenido a Paw-Path. Para completar tu registro y acceder
          a todas las características de seguridad y bienestar para tu
          mascota, necesitamos verificar tu email.
        </p>

        <!-- SECCIÓN OTP -->
        <div class="otp-section">
          <p class="otp-label">Tu código de verificación</p>
          <p class="otp-code">${otp}</p>
          <p class="otp-timer">Válido por ${MINUTOS_EXPIRACION} minutos</p>
        </div>

        <!-- CARACTERÍSTICAS -->
        <div class="features">
          <div class="feature-item">
            <div class="feature-icon">🛡️</div>
            <div class="feature-text">
              <strong>Verificación segura:</strong> Tu email ha sido
              verificado correctamente.
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">📍</div>
            <div class="feature-text">
              <strong>Localización en tiempo real:</strong> Sigue cada
              paseo de tu mascota.
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">🤝</div>
            <div class="feature-text">
              <strong>Red de confianza:</strong> Conecta con
              cuidadores verificados.
            </div>
          </div>
        </div>

        <!-- NOTICIA DE SEGURIDAD -->
        <div class="security-notice">
          <strong>🔒 Por tu seguridad:</strong> Nunca compartimos
          este código. Si no solicitaste este email, puedes
          ignorarlo sin riesgo.
        </div>

        <div class="divider"></div>

        <p class="message" style="font-size: 13px; text-align: center;">
          ¿Preguntas? Estamos aquí para ayudarte. Responde este
          email o visita nuestro centro de ayuda.
        </p>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="paw-print">🐾 🐾 🐾</div>
        <p class="footer-text">
          © 2024 Paw-Path. Todos los derechos reservados.
        </p>
        <p class="footer-text" style="font-size: 11px; margin-top: 12px;">
          <a href="https://paw-path.com.co/privacy"
            style="color: #1D8F73; text-decoration: none;">Privacidad</a>
          •
          <a href="https://paw-path.com.co/terms"
            style="color: #1D8F73; text-decoration: none;">Términos</a>
          •
          <a href="https://paw-path.com.co/contact"
            style="color: #1D8F73; text-decoration: none;">Contacto</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
