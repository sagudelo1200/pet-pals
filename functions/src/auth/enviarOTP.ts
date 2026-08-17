import * as functions from 'firebase-functions'
import sgMail from '@sendgrid/mail'
import * as admin from 'firebase-admin'

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp()
}

const db = admin.firestore()
const MINUTOS_EXPIRACION = 10

// Inicializar SendGrid con API key (del secreto de Firebase Functions)
const sendgridApiKey = process.env.SENDGRID_API_KEY
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey)
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
  { secrets: ['SENDGRID_API_KEY'] },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (request: any): Promise<EnviarOTPResponse> => {
    try {
      if (!request.auth) {
        return {
          success: false,
          error: 'Usuario no autenticado',
        } as EnviarOTPResponse
      }

      const { email, uid } = request.data as EnviarOTPRequest

      if (!email || !uid) {
        return {
          success: false,
          error: 'Email y UID son requeridos',
        } as EnviarOTPResponse
      }

      if (request.auth.uid !== uid) {
        return {
          success: false,
          error: 'El UID no coincide con el usuario autenticado',
        } as EnviarOTPResponse
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return {
          success: false,
          error: 'Formato de email inválido',
        } as EnviarOTPResponse
      }

      const otp = String(Math.floor(Math.random() * 999999)).padStart(6, '0')
      const ahora = admin.firestore.Timestamp.now()
      const expiraEn = new Date(
        ahora.toDate().getTime() + MINUTOS_EXPIRACION * 60000
      )

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
        })

      /* Siempre enviar desde noreply */
      const emailContent = {
        to: email,
        from: 'noreply@paw-path.com.co',
        subject: '🔐 Tu código de verificación - Paw - Path',
        html: buildEmailHTML(otp),
      }

      await sgMail.send(emailContent)
      functions.logger.info(`[enviarOTP] OTP enviado a ${email} (UID: ${uid})`)
      return {
        success: true,
        mensaje: 'Código enviado a tu email. Revisa tu bandeja de entrada.',
        minutosExpiracion: MINUTOS_EXPIRACION,
      } as EnviarOTPResponse
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as Record<string, any>
      functions.logger.error('[enviarOTP] Error:', error)

      // Detectar errores específicos de SendGrid
      if (err?.response?.body?.errors) {
        const sgError =
          err.response.body.errors[0]?.message || 'Error SendGrid desconocido'
        return {
          success: false,
          error: `Error de email: ${sgError}`,
        } as EnviarOTPResponse
      }

      return {
        success: false,
        error:
          (err?.message as string) || 'Error desconocido al enviar el código',
      } as EnviarOTPResponse
    }
  }
)

/**
 * Construye HTML profesional del email OTP
 * Diseño limpio y responsive para móviles
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
                   'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #f9f9f9;
      padding: 20px;
    }
    .email-content {
      background: white;
      border-radius: 8px;
      padding: 40px 20px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      margin-bottom: 30px;
    }
    .emoji {
      font-size: 48px;
      margin-bottom: 10px;
    }
    h1 {
      font-size: 24px;
      color: #2C3E50;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #7F8C8D;
      font-size: 14px;
      margin-bottom: 30px;
    }
    .otp-section {
      background: #F0F7FF;
      border: 2px solid #3498DB;
      border-radius: 8px;
      padding: 30px;
      margin: 30px 0;
    }
    .otp-label {
      color: #7F8C8D;
      font-size: 14px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .otp-code {
      font-size: 36px;
      font-weight: bold;
      color: #2C3E50;
      font-family: 'Courier New', monospace;
      letter-spacing: 4px;
      background: white;
      padding: 16px;
      border-radius: 4px;
    }
    .otp-note {
      color: #E74C3C;
      font-size: 12px;
      margin-top: 12px;
      font-weight: 600;
    }
    .timer {
      background: #FFE5E5;
      border-left: 4px solid #E74C3C;
      padding: 12px 16px;
      border-radius: 4px;
      margin: 20px 0;
      text-align: left;
      font-size: 13px;
      color: #C0392B;
    }
    .footer {
      color: #95A5A6;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ECF0F1;
    }
    .footer-link {
      color: #3498DB;
      text-decoration: none;
    }
    .security-note {
      background: #E8F8F5;
      border-left: 4px solid #27AE60;
      padding: 12px 16px;
      border-radius: 4px;
      margin-top: 20px;
      font-size: 12px;
      color: #27AE60;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-content">
      <div class="header">
        <div class="emoji">🔐</div>
        <h1>Verifica tu Email</h1>
        <p class="subtitle">Paw-Path - Tu compañero en el cuidado de mascotas</p>
      </div>

      <p style="color: #555; font-size: 15px; margin-bottom: 20px;">
        Hemos recibido una solicitud para verificar tu email. Usa el siguiente código:
      </p>

      <div class="otp-section">
        <div class="otp-label">Código de Verificación</div>
        <div class="otp-code">${otp}</div>
        <div class="otp-note">⚠️ No compartas este código con nadie</div>
      </div>

      <div class="timer">
        ⏱️ Este código <strong>expira en ${MINUTOS_EXPIRACION} minutos</strong>
      </div>

      <p style="color: #7F8C8D; font-size: 14px;">
        Ingresa este código en la aplicación para completar tu verificación.
      </p>

      <div class="security-note">
        <strong>🛡️ Seguridad:</strong> Si no solicitaste este código, ignora 
        este email y tu cuenta estará segura.
      </div>

      <div class="footer">
        <p>© 2026 Paw-Path. Todos los derechos reservados.</p>
        <p>
          <a href="https://pawpath.co/privacidad" class="footer-link">
            Política de Privacidad
          </a> | 
          <a href="https://pawpath.co/terminos" class="footer-link">
            Términos de Servicio
          </a>
        </p>
        <p style="margin-top: 10px;">
          Si tienes preguntas, contáctanos a support@pawpath.co
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `
}
