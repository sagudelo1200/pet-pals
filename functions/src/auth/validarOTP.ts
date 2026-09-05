import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

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
 * Valida OTP, crea registro de verificación
 * y establece emailVerified = true.
 * Trigger actualizarInsignias cachea las insignias automáticamente.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validarOTP = functions.https.onCall(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (request: any): Promise<ValidarOTPResponse> => {
    try {
      if (!request.auth) {
        return {
          success: false,
          error: 'Usuario no autenticado',
        } as ValidarOTPResponse;
      }

      const {uid, codigo} = request.data as ValidarOTPRequest;

      if (!uid || !codigo) {
        return {
          success: false,
          error: 'UID y código son requeridos',
        } as ValidarOTPResponse;
      }

      if (request.auth.uid !== uid) {
        return {
          success: false,
          error: 'El UID no coincide con el usuario autenticado',
        } as ValidarOTPResponse;
      }

      if (!/^\d{6}$/.test(codigo)) {
        return {
          success: false,
          error: 'Formato de código inválido',
        } as ValidarOTPResponse;
      }

      const otpDocRef = db.collection('otp_codes').doc(uid);
      const otpDocSnap = await otpDocRef.get();

      if (!otpDocSnap.exists) {
        return {
          success: false,
          error: 'Código no encontrado. Solicita un nuevo código',
        } as ValidarOTPResponse;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const otpData = otpDocSnap.data() as Record<string, any>;
      if (!otpData) {
        return {
          success: false,
          error: 'Código no encontrado. Solicita un nuevo código',
        } as ValidarOTPResponse;
      }

      const ahora = admin.firestore.Timestamp.now();
      if (otpData.expira_en && ahora > otpData.expira_en) {
        return {
          success: false,
          error: 'Código expirado. Solicita un nuevo código',
        } as ValidarOTPResponse;
      }

      if (otpData.utilizado) {
        return {
          success: false,
          error: 'Este código ya fue utilizado',
        } as ValidarOTPResponse;
      }

      if (otpData.codigo !== codigo) {
        const intentosFallidos = (otpData.intentos_fallidos || 0) + 1;
        await otpDocRef.update({
          intentos_fallidos: intentosFallidos,
        });

        return {
          success: false,
          error: 'Código incorrecto',
        } as ValidarOTPResponse;
      }

      // 6. OPERACIÓN TRANSACCIONAL: Marcar OTP como usado + crear verificación EMAIL
      await db.runTransaction(async (transaction) => {
        transaction.update(otpDocRef, {
          utilizado: true,
          validado_en: ahora,
        });

        // Crear documento de verificación EMAIL en la colección 'verificaciones'
        // Fuente de verdad: verificaciones/{id} es el registro oficial de verificación
        const verificacionRef = db.collection('verificaciones').doc();
        transaction.set(verificacionRef, {
          id: verificacionRef.id,
          usuario_id: uid,
          tipo: 'EMAIL',
          estado: 'VERIFICADO',
          metodo: 'AUTOMATICO',
          version: 1,
          resultado: {email: 'OK'},
          evidencias: {email: true},
          creado_en: ahora,
          actualizado_en: ahora,
          verificado_en: ahora,
          creado_por: uid,
          actualizado_por: uid,
          razon_transicion: 'inicio_verificacion',
        });
      });

      // 7. ACTUALIZAR FIREBASE AUTH: Marcar email como verificado
      // ✅ Esto hace que user.emailVerified = true en el cliente
      // AuthNavigator lo leerá directamente sin queries adicionales
      await admin.auth().updateUser(uid, {
        emailVerified: true,
      });

      functions.logger.info(
        `[validarOTP] Email verificado: ${uid} (insignias cacheadas)`
      );
      return {
        success: true,
        mensaje: 'Email verificado correctamente',
      } as ValidarOTPResponse;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as Record<string, any>;
      functions.logger.error('[validarOTP] Error:', error);

      return {
        success: false,
        error: (err?.message as string) || 'Error desconocido validando OTP',
      } as ValidarOTPResponse;
    }
  }
);
