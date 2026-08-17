import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useCallback,
} from 'react'
import { User } from 'firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  ServicioAuth,
  ServicioUsuario,
  AuthUser,
  AuthContextType,
  AuthResult,
} from '@/services/firebase'
import { ServicioPerfilPublico } from '@/services/firebase/firestore/colecciones/perfiles_publicos'
import { GestorAuth } from '@/logic/auth'
import { RolUsuario, Usuario } from '@/models/Usuario'
import type { PerfilPublico } from '@/models/PerfilPublico'

const ROL_ACTIVO_KEY = '@pet_pals_rol_activo'

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
  const [roles, setRoles] = useState<RolUsuario[]>([])
  const [profile, setProfile] = useState<Usuario | null | undefined>(undefined)
  const [perfilPublico, setPerfilPublico] = useState<
    PerfilPublico | null | undefined
  >(undefined)

  // Estados para rol activo
  const [rolActivo, setRolActivo] = useState<RolUsuario | null>(null)
  const [activandoRol, setActivandoRol] = useState<boolean>(false)
  const [rolProvisional, setRolProvisional] = useState<RolUsuario | null>(null)

  // Ref para acceder a roles sin re-render en cambiarRolActivo
  const rolesRef = React.useRef<RolUsuario[] | undefined>(roles)
  React.useEffect(() => {
    rolesRef.current = roles
  }, [roles])

  // Ref para evitar setState en componentes desmontados
  const isMountedRef = React.useRef(true)
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Ref para bloquear múltiples cambios de rol simultáneos (race condition)
  const cambiarRolEnProgreso = React.useRef<string | null>(null)

  // Ref para rastrear si ya se intentó cargar el rol activo (evitar ciclos)
  const rolActivoCargadoRef = React.useRef(false)

  // Escuchar cambios de autenticación al montar el provider
  useEffect(() => {
    const unsubscribe = ServicioAuth.escucharEstadoAuth(
      async (firebaseUser: User | null) => {
        // Verificar si el provider aún está montado
        if (!isMountedRef.current) {
          return
        }

        try {
          if (!firebaseUser) {
            if (isMountedRef.current) {
              setUser(null)
              setProfile(null)
              setPerfilPublico(null)
              setRoles([])
              setRolActivo(null)
              rolActivoCargadoRef.current = false
              setCargando(false)
            }
            return
          }

          // Usuario autenticado: construir AuthUser
          const authUser: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
          }

          // Intentar cargar perfil (para usuarios nuevos podría no existir)
          let profile_data: Usuario | null = null
          let perfilPublico_data: PerfilPublico | null = null
          let roles_data: RolUsuario[] = []

          try {
            const res = await ServicioUsuario.obtenerPorId(firebaseUser.uid)
            if (res.success && res.data) {
              profile_data = res.data
              roles_data = Array.isArray(res.data.roles) ? res.data.roles : []
            }
          } catch (err) {
            // Esperado para usuarios nuevos - no resetear roles existentes
            console.warn('Error al cargar perfil de usuario:', err)
          }

          // Cargar PerfilPublico (para verificaciones, badges, etc)
          try {
            const resPerfilPublico = await ServicioPerfilPublico.obtenerPorId(
              firebaseUser.uid
            )
            if (resPerfilPublico.success && resPerfilPublico.data) {
              perfilPublico_data = resPerfilPublico.data
            }
          } catch (err) {
            // Silencioso si hay error
            console.warn('Error al cargar perfil público:', err)
          }

          // Verificar si el provider aún está montado después de fetch
          if (!isMountedRef.current) {
            return
          }

          // Actualizar estado - todo en un batch
          if (isMountedRef.current) {
            setUser(authUser)
            setProfile(profile_data)
            setPerfilPublico(perfilPublico_data)
            // Solo actualizar roles si se cargaron exitosamente (para evitar resetear)
            if (roles_data.length > 0 || profile_data === null) {
              setRoles(roles_data)
            }
            setCargando(false)

            // IMPORTANTE: Intentar cargar el rol activo solo UNA VEZ después de cargar los roles
            // Esto evita ciclos infinitos entre efectos
            if (!rolActivoCargadoRef.current && roles_data.length > 0) {
              rolActivoCargadoRef.current = true

              // Lógica de cargarRolActivo inline
              await new Promise(r => setTimeout(r, 50))

              if (!isMountedRef.current) return

              try {
                // SI HAY MÚLTIPLES ROLES: NO cargar automáticamente
                // Dejar rolActivo en null para OBLIGAR selección en modal
                if (roles_data.length > 1) {
                  if (isMountedRef.current) {
                    setRolActivo(null)
                  }
                  return
                }

                // SI HAY 1 ROL: cargar automáticamente desde AsyncStorage o usar el único
                const rolGuardado = await AsyncStorage.getItem(ROL_ACTIVO_KEY)

                if (!isMountedRef.current) return

                if (
                  rolGuardado &&
                  roles_data.includes(rolGuardado as RolUsuario)
                ) {
                  if (isMountedRef.current) {
                    setRolActivo(rolGuardado as RolUsuario)
                  }
                } else if (roles_data.length === 1) {
                  if (isMountedRef.current) {
                    setRolActivo(roles_data[0])
                  }
                }
              } catch (error) {
                // Silencioso en errores
                if (!isMountedRef.current) return
                if (roles_data.length === 1) {
                  setRolActivo(roles_data[0])
                }
              }
            }
          }
        } catch (_error) {
          if (isMountedRef.current) {
            setUser(null)
            setProfile(null)
            setRoles([])
            setRolActivo(null)
            rolActivoCargadoRef.current = false
            setCargando(false)
          }
        }
      }
    )

    return unsubscribe
  }, [])

  /** Función para iniciar sesión con email y contraseña */
  const ingresar = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (isMountedRef.current) setCargando(true)
      const result = await GestorAuth.ingresarConCorreo(email, password)
      // Si falla, desactivar cargando; en caso contrario, el listener bajará el flag
      if (!result.success && isMountedRef.current) setCargando(false)
      return result
    },
    []
  )

  /** Función para registrar un nuevo usuario con email/password */
  const registrar = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      fechaNacimiento?: Date
    ): Promise<AuthResult> => {
      if (isMountedRef.current) setCargando(true)
      const result = await GestorAuth.registrarConCorreo(
        email,
        password,
        displayName,
        fechaNacimiento
      )
      if (!result.success && isMountedRef.current) setCargando(false)
      return result
    },
    []
  )

  /** Función para cerrar la sesión actual */
  const cerrarSesion = useCallback(async (): Promise<AuthResult> => {
    if (isMountedRef.current) setCargando(true)
    const result = await GestorAuth.cerrarSesion()
    if (!result.success && isMountedRef.current) setCargando(false)
    return result
  }, [])
  /** Recarga el perfil y roles del usuario actual (útil tras crear el doc de usuario) */
  const recargarPerfil = useCallback(async (): Promise<void> => {
    const current = ServicioAuth.obtenerUsuarioActual()
    if (current?.uid) {
      const res = await ServicioUsuario.obtenerPorId(current.uid)
      if (res.success && res.data && isMountedRef.current) {
        setProfile(res.data)
        setRoles(res.data.roles)
      }
    }
  }, [])

  /** Recarga el perfil público del usuario actual (incluye insignias_verificacion) */
  const recargarPerfilPublico = useCallback(async (): Promise<void> => {
    const current = ServicioAuth.obtenerUsuarioActual()
    if (current?.uid) {
      try {
        const res = await ServicioPerfilPublico.obtenerPorId(current.uid)
        if (res.success && res.data && isMountedRef.current) {
          setPerfilPublico(res.data)
        }
      } catch (err) {
        // Silencioso en errores
      }
    }
  }, [])

  /** Función para iniciar sesión con Google */
  const ingresarConGoogle = useCallback(
    async (credential: any): Promise<AuthResult> => {
      if (isMountedRef.current) setCargando(true)
      const result = await GestorAuth.ingresarConGoogle(credential)
      if (!result.success && isMountedRef.current) setCargando(false)
      return result
    },
    []
  )

  /** Recarga el usuario actual desde Firebase Auth (sincroniza emailVerified, etc.) */
  const recargarUsuarioAuth = useCallback(async (): Promise<AuthResult> => {
    const result = await ServicioAuth.recargarUsuario()

    // Después de recargar, actualizar también el estado local del usuario
    // para que cambios como emailVerified se reflejen inmediatamente
    if (result.success && isMountedRef.current) {
      const currentUser = ServicioAuth.obtenerUsuarioActual()
      if (currentUser) {
        const updatedAuthUser: AuthUser = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          emailVerified: currentUser.emailVerified,
        }
        setUser(updatedAuthUser)
      }
    }

    return result
  }, [])

  /** Cambiar rol activo */
  const cambiarRolActivo = useCallback(
    async (nuevoRol: RolUsuario): Promise<boolean> => {
      // GUARD: Si ya hay un cambio de rol en progreso, rechazar este
      if (cambiarRolEnProgreso.current !== null) {
        return false
      }

      // Marcar que hay un cambio en progreso
      cambiarRolEnProgreso.current = nuevoRol

      if (isMountedRef.current) {
        setActivandoRol(true)
        setRolProvisional(nuevoRol)
      }

      try {
        if (typeof recargarPerfil === 'function') {
          await recargarPerfil()
        }

        const maxWait = 5000
        const interval = 300
        let elapsed = 0
        let confirmado = false
        while (elapsed < maxWait) {
          if (rolesRef.current && rolesRef.current.includes(nuevoRol)) {
            confirmado = true
            break
          }
          // eslint-disable-next-line no-await-in-loop
          await new Promise(r => setTimeout(r, interval))
          elapsed += interval
        }

        if (confirmado) {
          try {
            await AsyncStorage.setItem(ROL_ACTIVO_KEY, nuevoRol)
            if (isMountedRef.current) {
              setRolActivo(nuevoRol)
            }
            return true
          } catch (error) {
            return false
          }
        } else {
          return false
        }
      } catch (err) {
        return false
      } finally {
        cambiarRolEnProgreso.current = null
        if (isMountedRef.current) {
          setActivandoRol(false)
          setRolProvisional(null)
        }
      }
    },
    [recargarPerfil]
  )

  // Valor que se expone en el contexto - memoizado con dependencias mínimas
  const value: AuthContextType = useMemo(
    () => ({
      user,
      cargando,
      ingresar,
      registrar,
      cerrarSesion,
      roles,
      profile: profile ?? null,
      perfilPublico: perfilPublico ?? null,
      hasRole: (role: RolUsuario) => roles.includes(role),
      recargarPerfil,
      recargarPerfilPublico,
      recargarUsuarioAuth,
      ingresarConGoogle,
      rolActivo,
      cambiarRolActivo,
      tieneMultiplesRoles: (roles?.length ?? 0) > 1,
      rolesDisponibles: roles ?? [],
      activandoRol,
      rolProvisional,
    }),
    [
      user,
      cargando,
      roles,
      profile,
      perfilPublico,
      rolActivo,
      activandoRol,
      rolProvisional,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
