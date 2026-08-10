/**
 * Código OTP temporal para verificación de email.
 * Se almacena en Firestore con TTL automático (expiración en 10 minutos).
 */
export interface OTPCode {
  /** ID único (uid del usuario) */
  id: string

  /** Email del usuario */
  email: string

  /** Código OTP de 6 dígitos */
  codigo: string

  /** ¿Fue utilizado correctamente? */
  utilizado: boolean

  /** Intentos fallidos de validación */
  intentos_fallidos: number

  /** Timestamp de creación (Firestore) */
  creado_en: Date

  /** Timestamp de expiración (TTL automático en Firestore: 10 minutos) */
  expira_en: Date
}

/**
 * Tipo para request de la Cloud Function enviarOTP
 */
export interface EnviarOTPRequest {
  email: string
  uid: string
}

/**
 * Tipo para response de la Cloud Function enviarOTP
 */
export interface EnviarOTPResponse {
  success: boolean
  mensaje?: string
  error?: string
  minutosExpiracion?: number
}

/**
 * Tipo para request de validación de OTP
 */
export interface ValidarOTPRequest {
  uid: string
  codigo: string
}

/**
 * Tipo para response de validación de OTP
 */
export interface ValidarOTPResponse {
  success: boolean
  mensaje?: string
  error?: string
}
