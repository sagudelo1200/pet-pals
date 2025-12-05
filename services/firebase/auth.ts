import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  deleteUser,
  signInWithCredential,
} from 'firebase/auth'
import { auth } from '../../firebase.config'
import { AuthResult } from './types'
import { ERR } from '@/constants/errors'
import { ServicioUsuario } from './usuario'

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
  // Registro con email y contraseña
  static async registrarConCorreo(
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
        const res = await ServicioUsuario.crearConUid(uid, {
          nombre: displayName,
          correo: email,
          celular: '',
          roles: ['tutor'],
          verificado: false,
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
            error: res.error || ERR.COMUN.ERROR_DESCONOCIDO,
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
          error: ERR.COMUN.ERROR_DESCONOCIDO,
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

  // Ingreso con correo y contraseña
  static async ingresarConCorreo(
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
      console.error('Error en ingreso:', error)
      return {
        success: false,
        error: mapFirebaseAuthError(error),
      }
    }
  }

  // Ingreso con Google (Credential)
  static async ingresarConGoogle(credential: any): Promise<AuthResult> {
    try {
      // 1. Iniciar sesión en Firebase Auth
      const userCredential = await signInWithCredential(auth, credential)
      const user = userCredential.user

      // 2. Verificar si existe en Firestore
      const docUser = await ServicioUsuario.obtenerPorId(user.uid)

      // 3. Si no existe, crearlo
      if (!docUser.success || !docUser.data) {
        const nuevoUsuario = {
          nombre: user.displayName || 'Usuario',
          correo: user.email || '',
          celular: '',
          roles: ['tutor'], // Rol por defecto
          verificado: true, // Google emails suelen estar verificados
          estado: 'activo',
          foto: user.photoURL || null,
        }

        const resCreacion = await ServicioUsuario.crearConUid(
          user.uid,
          nuevoUsuario as any
        )
        if (!resCreacion.success) {
          console.error(
            'Error creando usuario Firestore tras Google Auth:',
            resCreacion.error
          )
          // No hacemos rollback del auth aquí para no bloquear el login,
          // pero idealmente deberíamos manejar esto.
        }
      }

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        },
      }
    } catch (error: any) {
      console.error('Error en ingreso Google:', error)
      return {
        success: false,
        error: mapFirebaseAuthError(error),
      }
    }
  }

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
}
