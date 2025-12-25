import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from './AuthContext'
import type { RolUsuario } from '@/models/Usuario'

const ROL_ACTIVO_KEY = '@pet_pals_rol_activo'

interface RolContextType {
  rolActivo: RolUsuario | null
  // eslint-disable-next-line no-unused-vars
  cambiarRolActivo: (rol: RolUsuario) => Promise<void>
  tieneMultiplesRoles: boolean
  rolesDisponibles: RolUsuario[]
  cargando: boolean
  // Indicador de activación optimista en curso
  activandoRol: boolean
  // Rol que está en estado provisional hasta confirmación del servidor
  rolProvisional: RolUsuario | null
}

const RolContext = createContext<RolContextType | undefined>(undefined)

export const useRol = (): RolContextType => {
  const context = useContext(RolContext)
  if (!context) {
    throw new Error('useRol debe ser usado dentro de RolProvider')
  }
  return context
}

interface RolProviderProps {
  children: ReactNode
}

export const RolProvider: React.FC<RolProviderProps> = ({ children }) => {
  const { roles, recargarPerfil } = useAuth()
  const rolesRef = React.useRef<RolUsuario[] | undefined>(roles)
  React.useEffect(() => {
    rolesRef.current = roles
  }, [roles])
  const [rolActivo, setRolActivo] = useState<RolUsuario | null>(null)
  const [cargando, setCargando] = useState(true)
  const [activandoRol, setActivandoRol] = useState(false)
  const [rolProvisional, setRolProvisional] = useState<RolUsuario | null>(null)

  // Cargar rol activo guardado al montar
  useEffect(() => {
    cargarRolActivo()
  }, [])

  // Actualizar rol activo cuando cambien los roles del usuario
  useEffect(() => {
    if (roles && roles.length > 0) {
      // Si no hay rol activo o el rol activo ya no está en la lista
      if (!rolActivo || !roles.includes(rolActivo)) {
        // Intentar cargar el guardado, o usar el primero disponible
        cargarRolActivo()
      }
    } else {
      setRolActivo(null)
    }
  }, [roles])

  const cargarRolActivo = async () => {
    setCargando(true)
    try {
      const rolGuardado = await AsyncStorage.getItem(ROL_ACTIVO_KEY)

      if (rolGuardado && roles?.includes(rolGuardado as RolUsuario)) {
        setRolActivo(rolGuardado as RolUsuario)
      } else if (roles && roles.length > 0) {
        // Si no hay guardado o no es válido, usar el primero
        setRolActivo(roles[0])
      }
    } catch (error) {
      console.error('Error cargando rol activo:', error)
      if (roles && roles.length > 0) {
        setRolActivo(roles[0])
      }
    } finally {
      setCargando(false)
    }
  }

  const cambiarRolActivo = async (nuevoRol: RolUsuario) => {
    // Activación optimista: permitimos activar inmediatamente y luego
    // verificamos contra el servidor (perfil) que el rol quedó registrado.
    const previo = rolActivo
    if (!roles?.includes(nuevoRol)) {
      console.warn('Activando rol no listado todavía en roles:', nuevoRol)
    }

    setActivandoRol(true)
    setRolProvisional(nuevoRol)

    try {
      await AsyncStorage.setItem(ROL_ACTIVO_KEY, nuevoRol)
      setRolActivo(nuevoRol)
    } catch (error) {
      console.error('Error guardando rol activo:', error)
      setActivandoRol(false)
      setRolProvisional(null)
      return
    }

    // Forzar recarga del perfil (una sola lectura) y esperar a que `roles`
    // en `AuthContext` se actualice para confirmar el nuevo rol. Esto evita
    // múltiples lecturas al backend (solo hicimos la recarga explícita).
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

      if (!confirmado) {
        console.warn('No se confirmó el rol en backend, revirtiendo:', nuevoRol)
        try {
          if (previo) {
            await AsyncStorage.setItem(ROL_ACTIVO_KEY, previo)
          } else {
            await AsyncStorage.removeItem(ROL_ACTIVO_KEY)
          }
        } catch (_err) {
          // ignore
        }
        setRolActivo(previo)
      }
    } catch (err) {
      console.error('Error verificando rol en backend:', err)
    } finally {
      setActivandoRol(false)
      setRolProvisional(null)
    }
  }

  const value: RolContextType = {
    rolActivo,
    cambiarRolActivo,
    tieneMultiplesRoles: (roles?.length ?? 0) > 1,
    rolesDisponibles: roles ?? [],
    cargando,
    activandoRol,
    rolProvisional,
  }

  return <RolContext.Provider value={value}>{children}</RolContext.Provider>
}
