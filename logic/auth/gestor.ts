import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
  signInWithCredential,
  signOut,
} from 'firebase/auth'
import { auth } from '@/firebase.config'
import { AuthResult } from '@/services/firebase/comun'
import { ERR } from '@/constants/errors'
import { ServicioUsuario } from '@/services/firebase/firestore/colecciones/usuario'
import { ServicioAuth } from '@/services/firebase/auth/auth'

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

/**
 * Gestor de Autenticación (Lógica de Negocio)
 * Orquesta Firebase Auth con Firestore y reglas de negocio.
 */
export const GestorAuth = {
  /**
   * Obtiene el usuario autenticado actualmente.
   */
  obtenerUsuarioActual() {
    return ServicioAuth.obtenerUsuarioActual()
  },

  // Registro con email y contraseña + creación de perfil en Firestore
  async registrarConCorreo(
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
          // Rollback: eliminar usuario de Auth si falla Firestore
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
  },

  // Ingreso con correo y contraseña
  async ingresarConCorreo(
    email: string,
    password: string
  ): Promise<AuthResult> {
    try {
      // Simular tiempo de respuesta mínimo para seguridad (opcional, movido de service)
      const startTime = Date.now()

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      )

      const endTime = Date.now()
      const elapsedTime = endTime - startTime
      const minResponseTime = 1000 // Reducido de 3000 para mejor UX, pero mantenido por seguridad
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
  },

  // Ingreso con Google (Credential) + creación de perfil si no existe
  async ingresarConGoogle(credential: any): Promise<AuthResult> {
    try {
      const userCredential = await signInWithCredential(auth, credential)
      const user = userCredential.user

      // Verificar si existe en Firestore
      const docUser = await ServicioUsuario.obtenerPorId(user.uid)

      // Si no existe, crearlo (Orquestación de negocio)
      if (!docUser.success || !docUser.data) {
        const nuevoUsuario = {
          nombre: user.displayName || 'Usuario',
          correo: user.email || '',
          celular: '',
          roles: ['tutor'],
          verificado: true,
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
  },

  async cerrarSesion(): Promise<AuthResult> {
    try {
      await signOut(auth)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: mapFirebaseAuthError(error) }
    }
  },
}
