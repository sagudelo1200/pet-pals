import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { User } from 'firebase/auth'
import { AuthService } from '../firebase/auth'
import { AuthUser, AuthContextType, AuthResult } from '../firebase/types'
import { UsuarioService } from '../firebase/usuario'
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
  const [loading, setLoading] = useState<boolean>(true)
  const [roles, setRoles] = useState<RolUsuario[] | undefined>(undefined)
  const [profile, setProfile] = useState<Usuario | null | undefined>(undefined)

  // Escuchar cambios de autenticación cuando se monta el componente
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChange(
      async (firebaseUser: User | null) => {
        setLoading(true)
        if (firebaseUser) {
          // Si hay usuario, crear el objeto AuthUser
          const authUser: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          }
          setUser(authUser)

          // Cargar el perfil desde Firestore por correo (campo 'correo' según el modelo Usuario)
          if (firebaseUser.email) {
            const res = await UsuarioService.getByEmail(firebaseUser.email)
            if (res.success && res.data && res.data.length > 0) {
              const doc = res.data[0]
              setProfile(doc)
              setRoles(doc.roles)
            } else {
              setProfile(null)
              setRoles([])
            }
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
        setLoading(false)
      }
    )

    // Cleanup: desuscribirse cuando se desmonte el componente
    return unsubscribe
  }, [])

  // Función para login
  const login = async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    setLoading(true)
    const result = await AuthService.loginWithEmail(email, password)
    // Si falla, liberamos loading; si no, onAuthStateChange se encargará de bajarlo
    if (!result.success) setLoading(false)
    return result
  }

  // Función para registro
  const register = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<AuthResult> => {
    setLoading(true)
    const result = await AuthService.registerWithEmail(
      email,
      password,
      displayName
    )
    if (!result.success) setLoading(false)
    return result
  }

  // Función para logout
  const logout = async (): Promise<AuthResult> => {
    setLoading(true)
    const result = await AuthService.logout()
    if (!result.success) setLoading(false)
    return result
  }

  // Recargar perfil/roles bajo demanda (por ejemplo, tras crear el documento de usuario)
  const reloadProfile = async (): Promise<void> => {
    const current = AuthService.getCurrentUser()
    if (current?.email) {
      const res = await UsuarioService.getByEmail(current.email)
      if (res.success && res.data && res.data.length > 0) {
        const doc = res.data[0]
        setProfile(doc)
        setRoles(doc.roles)
      }
    }
  }

  // Valor que se pasa al contexto
  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    roles,
    profile: profile ?? null,
    hasRole: (role: RolUsuario) => Array.isArray(roles) && roles.includes(role),
    reloadProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
