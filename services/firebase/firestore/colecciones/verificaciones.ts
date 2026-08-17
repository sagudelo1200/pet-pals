import { db } from '@/firebase.config'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { CrudResult, mapFirebaseError } from '@/services/firebase/comun'

/**
 * Servicio para manejar verificaciones y OTP.
 * Gestiona:
 * - Generación y validación de OTP (email)
 * - Almacenamiento de documentos de verificación (IDENTIDAD, CERTIFICADO, etc)
 * - Estados y auditoría de verificaciones
 */
export class ServicioVerificaciones {
  private static readonly OTP_COLLECTION = 'otp_codes'
  private static readonly VERIFICACIONES_COLLECTION = 'verificaciones'
  private static readonly OTP_EXPIRY_MINUTES = 10
  private static readonly OTP_MAX_ATTEMPTS = 3

  /**
   * Generar y enviar OTP a un email.
   * Crea documento en otp_codes/{uid} con código de 6 dígitos.
   *
   * @param uid ID del usuario
   * @returns OTP generado (solo para testing, no enviar en producción)
   */
  static async generarOTP(
    uid: string
  ): Promise<CrudResult<{ codigo: string }>> {
    try {
      if (!uid) {
        return {
          success: false,
          error: 'UID requerido',
        }
      }

      // Generar código de 6 dígitos
      const codigo = Math.floor(100000 + Math.random() * 900000).toString()

      const ahora = Timestamp.now()
      const expiraEn = new Timestamp(
        ahora.seconds + this.OTP_EXPIRY_MINUTES * 60,
        ahora.nanoseconds
      )

      const otpRef = doc(db, this.OTP_COLLECTION, uid)
      await setDoc(otpRef, {
        uid,
        codigo,
        utilizado: false,
        intentos_fallidos: 0,
        creado_en: ahora,
        expira_en: expiraEn,
      })

      return {
        success: true,
        data: { codigo },
      }
    } catch (error: any) {
      return {
        success: false,
        error: mapFirebaseError(error),
      }
    }
  }

  /**
   * Validar OTP ingresado por el usuario.
   * Verifica: no expirado, no utilizado, código correcto.
   *
   * @param uid ID del usuario
   * @param codigo Código de 6 dígitos ingresado
   * @returns true si es válido, false en caso contrario
   */
  static async validarOTP(uid: string, codigo: string): Promise<boolean> {
    try {
      if (!uid || !codigo) {
        return false
      }

      const otpRef = doc(db, this.OTP_COLLECTION, uid)
      const otpSnap = await getDoc(otpRef)

      if (!otpSnap.exists()) {
        return false
      }

      const otpData = otpSnap.data()
      const ahora = Timestamp.now()

      // Verificar: no expirado
      if (otpData.expira_en && ahora > otpData.expira_en) {
        return false
      }

      // Verificar: no utilizado
      if (otpData.utilizado) {
        return false
      }

      // Verificar: intentos no excedidos
      if (
        otpData.intentos_fallidos &&
        otpData.intentos_fallidos >= this.OTP_MAX_ATTEMPTS
      ) {
        return false
      }

      // Verificar: código correcto
      if (otpData.codigo !== codigo) {
        // Incrementar intentos fallidos
        await updateDoc(otpRef, {
          intentos_fallidos: (otpData.intentos_fallidos || 0) + 1,
        })
        return false
      }

      // ✅ OTP válido: marcar como utilizado
      await updateDoc(otpRef, {
        utilizado: true,
        validado_en: ahora,
      })

      return true
    } catch (error: any) {
      console.error('[ServicioVerificaciones] Error validando OTP:', error)
      return false
    }
  }

  /**
   * Obtener información de un OTP (para debugging/testing).
   * @param uid ID del usuario
   * @returns Datos del OTP (sin código por seguridad)
   */
  static async obtenerOTP(
    uid: string
  ): Promise<CrudResult<{ utilizado: boolean; intentos_fallidos: number }>> {
    try {
      if (!uid) {
        return {
          success: false,
          error: 'UID requerido',
        }
      }

      const otpRef = doc(db, this.OTP_COLLECTION, uid)
      const otpSnap = await getDoc(otpRef)

      if (!otpSnap.exists()) {
        return {
          success: false,
          error: 'OTP no encontrado',
        }
      }

      const { utilizado, intentos_fallidos } = otpSnap.data()
      return {
        success: true,
        data: { utilizado, intentos_fallidos },
      }
    } catch (error: any) {
      return {
        success: false,
        error: mapFirebaseError(error),
      }
    }
  }

  /**
   * Obtener todas las verificaciones VERIFICADAS de un usuario.
   * Usado por triggers para cachear en insignias_verificacion.
   *
   * @param uid ID del usuario
   * @returns Array de tipos verificados ['EMAIL', 'IDENTIDAD', ...]
   */
  static async obtenerTiposVerificados(
    uid: string
  ): Promise<CrudResult<string[]>> {
    try {
      if (!uid) {
        return {
          success: false,
          error: 'UID requerido',
        }
      }

      const q = query(
        collection(db, this.VERIFICACIONES_COLLECTION),
        where('usuario_id', '==', uid),
        where('estado', '==', 'VERIFICADO')
      )

      const querySnapshot = await getDocs(q)
      const tipos = querySnapshot.docs.map(doc => doc.data().tipo)

      return {
        success: true,
        data: tipos,
      }
    } catch (error: any) {
      return {
        success: false,
        error: mapFirebaseError(error),
      }
    }
  }

  /**
   * Obtener una verificación específica.
   * @param verificacionId ID del documento de verificación
   */
  static async obtenerVerificacion(
    verificacionId: string
  ): Promise<CrudResult<any>> {
    try {
      if (!verificacionId) {
        return {
          success: false,
          error: 'ID de verificación requerido',
        }
      }

      const ref = doc(db, this.VERIFICACIONES_COLLECTION, verificacionId)
      const snap = await getDoc(ref)

      if (!snap.exists()) {
        return {
          success: false,
          error: 'Verificación no encontrada',
        }
      }

      return {
        success: true,
        data: snap.data(),
      }
    } catch (error: any) {
      return {
        success: false,
        error: mapFirebaseError(error),
      }
    }
  }

  /**
   * Limpiar OTP expirados (se puede llamar desde una Cloud Function).
   * Por ahora, se maneja por TTL en Firestore.
   */
  static limpiarOTPExpirados(): Promise<void> {
    // Implementado por TTL en Firestore. Los docs se auto-eliminan.
    return Promise.resolve()
  }
}
