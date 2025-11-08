import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { User } from 'firebase/auth'
import { ServicioAuth } from '../firebase/auth'
import { AuthUser, AuthContextType, AuthResult } from '../firebase/types'
import { ServicioUsuario } from '../firebase/usuario'
import { RolUsuario, Usuario } from '../../models/Usuario'

/** Contexto de autenticación (provee user, roles y helpers). */
const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Hook para acceder al contexto de autenticación.
 * Lanza un error si se usa fuera de `AuthProvider`.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider')
  }
  return context
}

/** Props del proveedor de autenticación */
interface AuthProviderProps {
  children: ReactNode
}

/** Provider que expone información de autenticación y helpers a la app. */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [cargando, setCargando] = useState<boolean>(true)
  const [roles, setRoles] = useState<RolUsuario[] | undefined>(undefined)
  const [profile, setProfile] = useState<Usuario | null | undefined>(undefined)
  // Escuchar cambios de autenticación al montar el provider
  useEffect(() => {
    const unsubscribe = ServicioAuth.escucharEstadoAuth(
      async (firebaseUser: User | null) => {
        setCargando(true)
        if (firebaseUser) {
          // Si hay usuario, construir el objeto AuthUser
          const authUser: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          }
          setUser(authUser)
          // Cargar perfil desde Firestore por UID (usuarios/{uid})
          const res = await ServicioUsuario.obtenerPorId(firebaseUser.uid)
          if (res.success && res.data) {
            setProfile(res.data)
            setRoles(res.data.roles)
          } else {
            setProfile(null)
            setRoles([])
          }
        } else {
          // No hay usuario autenticado
          setUser(null)
          setProfile(null)
          setRoles([])
        }
        setCargando(false)
      }
    )
    // Cleanup: desuscribirse al desmontar el provider
    return unsubscribe
  }, [])

  /** Función para iniciar sesión con email y contraseña */
  const ingresar = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    setCargando(true)
    const result = await ServicioAuth.ingresarConCorreo(email, password)
    // Si falla, desactivar cargando; en caso contrario, el listener bajará el flag
    if (!result.success) setCargando(false)
    return result
  }
  /** Función para registrar un nuevo usuario con email/password */
  const registrar = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<AuthResult> => {
    setCargando(true)
    const result = await ServicioAuth.registrarConCorreo(
      email,
      password,
      displayName
    )
    if (!result.success) setCargando(false)
    return result
  }
  /** Función para cerrar la sesión actual */
  const cerrarSesion = async (): Promise<AuthResult> => {
    setCargando(true)
    const result = await ServicioAuth.cerrarSesion()
    if (!result.success) setCargando(false)
    return result
  }
  /** Recarga el perfil y roles del usuario actual (útil tras crear el doc de usuario) */
  const recargarPerfil = async (): Promise<void> => {
    const current = ServicioAuth.obtenerUsuarioActual()
    if (current?.uid) {
      const res = await ServicioUsuario.obtenerPorId(current.uid)
      if (res.success && res.data) {
        setProfile(res.data)
        setRoles(res.data.roles)
      }
    }
  }

  // Valor que se expone en el contexto
  const value: AuthContextType = {
    user,
    cargando,
    ingresar,
    registrar,
    cerrarSesion,
    roles,
    profile: profile ?? null,
    hasRole: (role: RolUsuario) => Array.isArray(roles) && roles.includes(role),
    recargarPerfil,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
