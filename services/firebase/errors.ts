import { ERR, type ErrorCode } from '@/constants'

/**
 * Mapea errores de Firebase/Firestore a códigos ERR propios de dominio/UI.
 * Acepta tanto objetos de error ({ code, message }) como strings directas.
 */
export function mapFirebaseError(err: unknown): ErrorCode {
  // Si ya es un código ERR válido, respetarlo tal cual
  if (typeof err === 'string') {
    const values = Object.values(ERR) as string[]
    return (values.includes(err) ? err : ERR.ERROR_DESCONOCIDO) as ErrorCode
  }

  const anyErr = err as any
  const code: string | undefined = anyErr?.code
  // Normalizar códigos de Firebase
  switch (code) {
    case 'permission-denied':
      return ERR.PERMISOS_INSUFICIENTES
    case 'unauthenticated':
      return ERR.NO_AUTENTICADO
    case 'not-found':
      return ERR.DOCUMENTO_NO_ENCONTRADO
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return ERR.AUTH_INVALID_CREDENTIALS
    case 'auth/user-not-found':
      return ERR.AUTH_USER_NOT_FOUND
    case 'auth/invalid-email':
      return ERR.AUTH_INVALID_EMAIL
    case 'auth/user-disabled':
      return ERR.AUTH_USER_DISABLED
    case 'auth/too-many-requests':
      return ERR.AUTH_TOO_MANY_REQUESTS
    case 'auth/email-already-in-use':
      return ERR.AUTH_EMAIL_IN_USE
    case 'auth/weak-password':
      return ERR.AUTH_WEAK_PASSWORD
    case 'auth/operation-not-allowed':
      return ERR.AUTH_OPERATION_NOT_ALLOWED
    case 'auth/network-request-failed':
    case 'network-request-failed':
      return ERR.AUTH_NETWORK_ERROR
    default:
      break
  }

  // Si el mensaje ya es un código ERR, respétalo
  const message: string | undefined = anyErr?.message
  if (message) {
    const values = Object.values(ERR) as string[]
    if (values.includes(message)) return message as ErrorCode
  }

  return ERR.ERROR_DESCONOCIDO
}
