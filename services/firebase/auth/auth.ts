import { signOut, onAuthStateChanged, User, reload } from 'firebase/auth'
import { auth } from '@/firebase.config'
import { AuthResult } from '@/services/firebase/comun'
import { ERR } from '@/constants/errors'

// Mapeo de errores de Firebase Auth a códigos de dominio
function mapFirebaseAuthError(e: any): string {
  const code = e?.code as string | undefined
  switch (code) {
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
      return ERR.AUTH.ERROR_RED
    default:
      return ERR.COMUN.ERROR_DESCONOCIDO
  }
}

export class ServicioAuth {
  // Cerrar sesión
  static async cerrarSesion(): Promise<AuthResult> {
    try {
      await signOut(auth)
      return { success: true }
    } catch (error: any) {
      console.error('Error en cerrarSesion:', error)
      return {
        success: false,
        error: mapFirebaseAuthError(error),
      }
    }
  }

  // Obtener usuario actual
  static obtenerUsuarioActual(): User | null {
    return auth.currentUser
  }

  /* eslint-disable no-unused-vars */
  // Escuchar cambios de autenticación
  static escucharEstadoAuth(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback)
  }

  // Recargar el usuario actual desde Firebase Auth
  // Útil para sincronizar cambios en emailVerified, etc.
  static async recargarUsuario(): Promise<AuthResult> {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        return {
          success: false,
          error: 'No hay usuario autenticado',
        }
      }
      await reload(currentUser)
      return { success: true }
    } catch (error: any) {
      console.error('Error en recargarUsuario:', error)
      return {
        success: false,
        error: mapFirebaseAuthError(error),
      }
    }
  }
}
