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

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Hook personalizado para usar el contexto
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider')
  }
  return context
}

// Props del provider
interface AuthProviderProps {
  children: ReactNode
}

// Provider del contexto
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [cargando, setCargando] = useState<boolean>(true)
  const [roles, setRoles] = useState<RolUsuario[] | undefined>(undefined)
  const [profile, setProfile] = useState<Usuario | null | undefined>(undefined)

  // Escuchar cambios de autenticación cuando se monta el componente
  useEffect(() => {
    const unsubscribe = ServicioAuth.escucharEstadoAuth(
      async (firebaseUser: User | null) => {
        setCargando(true)
        if (firebaseUser) {
          // Si hay usuario, crear el objeto AuthUser
          const authUser: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          }
          setUser(authUser)

          // Cargar el perfil desde Firestore por UID (usuarios/{uid})
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

    // Cleanup: desuscribirse cuando se desmonte el componente
    return unsubscribe
  }, [])

  // Función para ingresar
  const ingresar = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    setCargando(true)
    const result = await ServicioAuth.ingresarConCorreo(email, password)
    // Si falla, liberamos cargando; si no, escucharEstadoAuth se encargará de bajarlo
    if (!result.success) setCargando(false)
    return result
  }

  // Función para registrar
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

  // Función para cerrar sesión
  const cerrarSesion = async (): Promise<AuthResult> => {
    setCargando(true)
    const result = await ServicioAuth.cerrarSesion()
    if (!result.success) setCargando(false)
    return result
  }

  // Recargar perfil/roles bajo demanda (por ejemplo, tras crear el documento de usuario)
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

  // Valor que se pasa al contexto
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
