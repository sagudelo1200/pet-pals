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
import { ServicioPerfilPublico } from '@/services/firebase/firestore/colecciones/perfiles_publicos'

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

export const GestorAuth = {
  obtenerUsuarioActual() {
    return ServicioAuth.obtenerUsuarioActual()
  },

  async registrarConCorreo(
    email: string,
    password: string,
    displayName: string,
    fechaNacimiento?: Date
  ): Promise<AuthResult> {
    console.log('[GestorAuth] INICIO registrarConCorreo', {
      email,
      displayName,
    })
    try {
      console.log('[GestorAuth] Creando usuario en Firebase Auth...')
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      )
      console.log('[GestorAuth] Usuario creado en Auth:', {
        uid: userCredential.user.uid,
        emailVerified: userCredential.user.emailVerified,
      })

      if (userCredential.user && displayName) {
        await updateProfile(userCredential.user, { displayName })
      }

      try {
        const uid = userCredential.user.uid
        console.log('[GestorAuth] Creando documento usuario en Firestore...', {
          uid,
        })
        const res = await ServicioUsuario.crearConUid(uid, {
          nombre: displayName,
          correo: email,
          celular: '',
          fecha_nacimiento: fechaNacimiento || null,
          roles: ['tutor'],
          estado: 'activo',
        } as any)

        if (!res.success) {
          console.error('[GestorAuth] Error creando doc usuario:', res.error)
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
        console.log('[GestorAuth] Documento usuario creado exitosamente')

        try {
          console.log('[GestorAuth] Creando perfil público...')
          await ServicioPerfilPublico.guardarConId(uid, {
            nombre: displayName ?? null,
            foto: null,
          })
          console.log('[GestorAuth] Perfil público creado exitosamente')
        } catch (e) {
          console.error(
            'Error creando perfil público inicial tras registro:',
            e
          )
          try {
            await ServicioUsuario.eliminar(uid)
          } catch (delErr) {
            console.error(
              'Rollback: error eliminando doc usuario tras fallo perfil:',
              delErr
            )
          }
          try {
            await deleteUser(userCredential.user)
          } catch (authDelErr) {
            console.error(
              'Rollback: error eliminando usuario en Auth tras fallo perfil:',
              authDelErr
            )
          }
          return { success: false, error: ERR.COMUN.ERROR_DESCONOCIDO }
        }
      } catch (e) {
        try {
          await deleteUser(userCredential.user)
        } catch (delErr) {
          console.error('Rollback: error eliminando usuario en Auth', delErr)
        }
        console.error('Error creando doc usuario tras registro:', e)
        return { success: false, error: ERR.COMUN.ERROR_DESCONOCIDO }
      }

      return {
        success: true,
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: displayName,
          photoURL: userCredential.user.photoURL ?? null,
          emailVerified: userCredential.user.emailVerified,
        },
      }
    } catch (error: any) {
      console.error('[GestorAuth] ❌ Error en registro:', error)
      return { success: false, error: mapFirebaseAuthError(error) }
    }
  },

  async ingresarConCorreo(
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
      const elapsed = endTime - startTime
      const minResponseTime = 1000
      if (elapsed < minResponseTime)
        await new Promise(r => setTimeout(r, minResponseTime - elapsed))

      return {
        success: true,
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL ?? null,
          emailVerified: userCredential.user.emailVerified,
        },
      }
    } catch (error: any) {
      console.error('Error en ingreso:', error)
      return { success: false, error: mapFirebaseAuthError(error) }
    }
  },

  async ingresarConGoogle(credential: any): Promise<AuthResult> {
    try {
      const userCredential = await signInWithCredential(auth, credential)
      const user = userCredential.user

      const docUser = await ServicioUsuario.obtenerPorId(user.uid)
      if (!docUser.success || !docUser.data) {
        const nuevoUsuario = {
          nombre: user.displayName || 'Usuario',
          correo: user.email || '',
          celular: '',
          roles: ['tutor'],
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
        } else {
          try {
            await ServicioPerfilPublico.guardarConId(user.uid, {
              nombre: nuevoUsuario.nombre ?? null,
              foto: nuevoUsuario.foto ?? null,
            })
          } catch (e) {
            console.error(
              'Error creando perfil público inicial tras Google Auth:',
              e
            )
            try {
              await ServicioUsuario.eliminar(user.uid)
            } catch (delErr) {
              console.error(
                'Rollback: error eliminando doc usuario tras fallo perfil (Google):',
                delErr
              )
            }
            try {
              await deleteUser(user)
            } catch (authDelErr) {
              console.error(
                'Rollback: error eliminando usuario en Auth tras fallo perfil (Google):',
                authDelErr
              )
            }
            return { success: false, error: ERR.COMUN.ERROR_DESCONOCIDO }
          }
        }
      }

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL ?? null,
          emailVerified: user.emailVerified,
        },
      }
    } catch (error: any) {
      console.error('Error en ingreso Google:', error)
      return { success: false, error: mapFirebaseAuthError(error) }
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
