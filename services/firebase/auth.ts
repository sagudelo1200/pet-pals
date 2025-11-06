import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  deleteUser,
} from 'firebase/auth'
import { auth } from '../../firebase.config'
import { AuthResult } from './types'
import { ERR } from '@/constants/errors'
import { UsuarioService } from './usuario'

// Mapeo de errores de Firebase Auth a códigos de dominio
function mapFirebaseAuthError(e: any): string {
  const code = e?.code as string | undefined
  switch (code) {
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
      return ERR.AUTH_NETWORK_ERROR
    default:
      return ERR.ERROR_DESCONOCIDO
  }
}

export class AuthService {
  // Registro con email y contraseña
  static async registerWithEmail(
    email: string,
    password: string,
    displayName: string
  ): Promise<AuthResult> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      )

      // Actualizar el perfil con el nombre
      if (userCredential.user && displayName) {
        await updateProfile(userCredential.user, {
          displayName: displayName,
        })
      }

      // Crear documento de usuario en Firestore inmediatamente.
      // Usamos createWithUid para asegurar uso del UID retornado.
      try {
        const uid = userCredential.user.uid
        const res = await UsuarioService.createWithUid(uid, {
          nombre: displayName,
          correo: email,
          celular: '',
          roles: ['dueño'],
          verificado: false,
          fecha_registro: new Date(),
          estado: 'activo',
        } as any)

        if (!res.success) {
          // Si falla la creación del doc, hacemos rollback eliminando el usuario de Auth
          try {
            await deleteUser(userCredential.user)
          } catch (delErr) {
            console.error('Rollback: error eliminando usuario en Auth', delErr)
          }
          return {
            success: false,
            error: res.error || ERR.ERROR_DESCONOCIDO,
          }
        }
      } catch (e) {
        // En caso de cualquier excepción intentar rollback
        try {
          await deleteUser(userCredential.user)
        } catch (delErr) {
          console.error('Rollback: error eliminando usuario en Auth', delErr)
        }
        console.error('Error creando doc usuario tras registro:', e)
        return {
          success: false,
          error: ERR.ERROR_DESCONOCIDO,
        }
      }

      return {
        success: true,
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: displayName,
          photoURL: userCredential.user.photoURL,
        },
      }
    } catch (error: any) {
      console.error('Error en registro:', error)
      return {
        success: false,
        error: mapFirebaseAuthError(error),
      }
    }
  }

  // Login con email y contraseña
  static async loginWithEmail(
    email: string,
    password: string
  ): Promise<AuthResult> {
    try {
      const startTime = Date.now()

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      )

      const endTime = Date.now()
      const elapsedTime = endTime - startTime
      const minResponseTime = 3000
      if (elapsedTime < minResponseTime) {
        await new Promise(resolve =>
          setTimeout(resolve, minResponseTime - elapsedTime)
        )
      }

      return {
        success: true,
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL,
        },
      }
    } catch (error: any) {
      console.error('Error en login:', error)
      return {
        success: false,
        error: mapFirebaseAuthError(error),
      }
    }
  }

  // Cerrar sesión
  static async logout(): Promise<AuthResult> {
    try {
      await signOut(auth)
      return { success: true }
    } catch (error: any) {
      console.error('Error en logout:', error)
      return {
        success: false,
        error: mapFirebaseAuthError(error),
      }
    }
  }

  // Obtener usuario actual
  static getCurrentUser(): User | null {
    return auth.currentUser
  }

  /* eslint-disable no-unused-vars */
  // Escuchar cambios de autenticación
  static onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback)
  }
}
