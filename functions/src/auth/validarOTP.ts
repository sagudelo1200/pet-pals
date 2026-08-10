import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// Interfaces para tipado
interface ValidarOTPRequest {
  uid: string
  codigo: string
}

interface ValidarOTPResponse {
  success: boolean
  error?: string
  mensaje?: string
}

/**
 * Cloud Function: Valida OTP enviado por email
 *
 * FLOW:
 * 1. Cliente llama con uid + código de 6 dígitos
 * 2. Función busca el OTP en Firestore/otp_codes/{uid}
 * 3. Verifica: no expirado, no utilizado, código coincide
 * 4. Si válido: Marca como utilizado + actualiza usuarios.verificado = true
 * 5. Responde al cliente con éxito/error
 *
 * @param data {ValidarOTPRequest}
 * @returns {ValidarOTPResponse}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validarOTP = functions.https.onCall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (request: any): Promise<ValidarOTPResponse> => {
    try {
      // 1. VALIDACIONES DE SEGURIDAD
      if (!request.auth) {
        return {
          success: false,
          error: "Usuario no autenticado",
        } as ValidarOTPResponse;
      }

      const {uid, codigo} = request.data as ValidarOTPRequest;

      if (!uid || !codigo) {
        return {
          success: false,
          error: "UID y código son requeridos",
        } as ValidarOTPResponse;
      }

      if (request.auth.uid !== uid) {
        return {
          success: false,
          error: "El UID no coincide con el usuario autenticado",
        } as ValidarOTPResponse;
      }

      if (!/^\d{6}$/.test(codigo)) {
        return {
          success: false,
          error: "Formato de código inválido",
        } as ValidarOTPResponse;
      }

      // 2. CONSULTAR OTP EN FIRESTORE
      const otpDocRef = db.collection("otp_codes").doc(uid);
      const otpDocSnap = await otpDocRef.get();

      if (!otpDocSnap.exists) {
        return {
          success: false,
          error: "Código no encontrado. Solicita un nuevo código",
        } as ValidarOTPResponse;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const otpData = otpDocSnap.data() as Record<string, any>;
      if (!otpData) {
        return {
          success: false,
          error: "Código no encontrado. Solicita un nuevo código",
        } as ValidarOTPResponse;
      }

      // 3. VERIFICAR QUE EL OTP NO ESTÉ EXPIRADO
      const ahora = admin.firestore.Timestamp.now();
      if (otpData.expira_en && ahora > otpData.expira_en) {
        return {
          success: false,
          error: "Código expirado. Solicita un nuevo código",
        } as ValidarOTPResponse;
      }

      // 4. VERIFICAR QUE NO HAYA SIDO UTILIZADO
      if (otpData.utilizado) {
        return {
          success: false,
          error: "Este código ya fue utilizado",
        } as ValidarOTPResponse;
      }

      // 5. VERIFICAR QUE EL CÓDIGO COINCIDA
      if (otpData.codigo !== codigo) {
        // Incrementar intentos fallidos
        const intentosFallidos = (otpData.intentos_fallidos || 0) + 1;
        await otpDocRef.update({
          intentos_fallidos: intentosFallidos,
        });

        return {
          success: false,
          error: "Código incorrecto",
        } as ValidarOTPResponse;
      }

      // 6. OPERACIÓN TRANSACCIONAL: Marcar OTP como usado + actualizar usuario
      await db.runTransaction(async (transaction) => {
        // Actualizar OTP a utilizado
        transaction.update(otpDocRef, {
          utilizado: true,
          validado_en: ahora,
        });

        // Actualizar usuario a verificado
        const usuarioRef = db.collection("usuarios").doc(uid);
        transaction.update(usuarioRef, {
          verificado: true,
          email_verificado_en: ahora,
        });
      });

      // 7. RESPUESTA EXITOSA
      functions.logger.info(`[validarOTP] Email verificado para UID: ${uid}`);
      return {
        success: true,
        mensaje: "Email verificado correctamente",
      } as ValidarOTPResponse;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as Record<string, any>;
      functions.logger.error("[validarOTP] Error:", error);

      return {
        success: false,
        error: (err?.message as string) || "Error desconocido validando OTP",
      } as ValidarOTPResponse;
    }
  }
);
