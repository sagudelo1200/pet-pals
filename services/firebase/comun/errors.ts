import { ERR, type ErrorCode } from '@/constants'

// Helper runtime: obtener todas las hojas (valores string) de ERR para
// permitir comprobaciones como "si el valor ya es un código ERR".
function collectErrorLeafValues(obj: unknown): string[] {
  const out: string[] = []
  if (typeof obj === 'string') return [obj]
  if (obj && typeof obj === 'object') {
    for (const v of Object.values(obj as any)) {
      out.push(...collectErrorLeafValues(v))
    }
  }
  return out
}

/**
 * Mapea errores de Firebase/Firestore a códigos ERR propios de dominio/UI.
 * Acepta tanto objetos de error ({ code, message }) como strings directas.
 */
export function mapFirebaseError(err: unknown): ErrorCode {
  // Si ya es un código ERR válido, respetarlo tal cual
  if (typeof err === 'string') {
    // Comprobar si la cadena ya es alguno de los valores hoja de ERR
    const values = collectErrorLeafValues(ERR)
    return (
      values.includes(err) ? err : ERR.COMUN.ERROR_DESCONOCIDO
    ) as ErrorCode
  }

  const anyErr = err as any
  const code: string | undefined = anyErr?.code
  // Normalizar códigos de Firebase
  // Evitar imprimir 'undefined' cuando no exista `message`. Mostrar JSON del error como fallback.
  const mensajeLog = anyErr?.message ?? JSON.stringify(anyErr)
  // Si se ejecuta desde los __test__, evitar el console.warn
  if (typeof jest === 'undefined') {
    console.warn(
      `mapFirebaseError: mapeando error Firebase: [${code}] ${mensajeLog}`
    )
  }

  switch (code) {
    case 'permission-denied':
      return ERR.COMUN.PERMISOS_INSUFICIENTES
    case 'unauthenticated':
      return ERR.COMUN.NO_AUTENTICADO
    case 'not-found':
      return ERR.COMUN.DOCUMENTO_NO_ENCONTRADO
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return ERR.AUTH.CREDENCIALES_INVALIDAS
    case 'auth/user-not-found':
      return ERR.AUTH.USUARIO_NO_ENCONTRADO
    case 'auth/invalid-email':
      return ERR.AUTH.CORREO_INVALIDO
    case 'auth/user-disabled':
      return ERR.AUTH.USUARIO_DESHABILITADO
    case 'auth/too-many-requests':
      return ERR.AUTH.DEMASIADOS_INTENTOS
    case 'auth/email-already-in-use':
      return ERR.AUTH.CORREO_EN_USO
    case 'auth/weak-password':
      return ERR.AUTH.PASSWORD_DEBIL
    case 'auth/operation-not-allowed':
      return ERR.AUTH.OPERACION_NO_PERMITIDA
    case 'auth/network-request-failed':
    case 'network-request-failed':
      return ERR.AUTH.ERROR_RED
    case 'invalid-argument':
      return ERR.COMUN.DATOS_INVALIDOS
    case 'unavailable':
      return ERR.REALTIME.ERROR_CONEXION
    case 'disconnected':
      return ERR.REALTIME.ERROR_CONEXION
    case 'canceled':
      return ERR.REALTIME.OPERACION_CANCELADA
    default:
      break
  }

  // Si el mensaje ya es un código ERR, respétalo
  const message: string | undefined = anyErr?.message
  if (message) {
    const values = collectErrorLeafValues(ERR)
    if (values.includes(message)) return message as ErrorCode
  }

  return (ERR.COMUN.ERROR_DESCONOCIDO +
    ': ' +
    (anyErr?.message || anyErr?.code || JSON.stringify(anyErr))) as ErrorCode
}
