import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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
  const [rolActivo, setRolActivo] = useState<RolUsuario | null>(null)
  const [cargando, setCargando] = useState(true)
  const [activandoRol, setActivandoRol] = useState(false)
  const [rolProvisional, setRolProvisional] = useState<RolUsuario | null>(null)

  // Ref para acceder a roles sin re-render en cambiarRolActivo
  const rolesRef = React.useRef<RolUsuario[] | undefined>(roles)
  React.useEffect(() => {
    rolesRef.current = roles
  }, [roles])

  // DEFINIR PRIMERO: Memoizar cargarRolActivo para evitar redefiniciones innecesarias
  const cargarRolActivo = useCallback(async () => {
    console.debug('[RolContext.cargarRolActivo] Starting')
    try {
      console.debug('[RolContext.cargarRolActivo] Calling setCargando(true)')
      setCargando(true)
      console.debug('[RolContext.cargarRolActivo] After setCargando(true)')
    } catch (e) {
      console.error(
        '[RolContext.cargarRolActivo] ERROR in setCargando(true):',
        e
      )
    }

    try {
      console.debug('[RolContext.cargarRolActivo] Getting from AsyncStorage')
      const rolGuardado = await AsyncStorage.getItem(ROL_ACTIVO_KEY)
      console.debug(
        '[RolContext.cargarRolActivo] Got from storage:',
        rolGuardado
      )

      // Usar rolesRef para evitar dependencia de roles
      const rolesActuales = rolesRef.current
      console.debug(
        '[RolContext.cargarRolActivo] rolesRef.current:',
        rolesActuales
      )

      if (rolGuardado && rolesActuales?.includes(rolGuardado as RolUsuario)) {
        console.debug(
          '[RolContext.cargarRolActivo] Setting saved rol:',
          rolGuardado
        )
        console.debug(
          '[RolContext.cargarRolActivo] Calling setRolActivo(saved)'
        )
        setRolActivo(rolGuardado as RolUsuario)
        console.debug('[RolContext.cargarRolActivo] After setRolActivo(saved)')
      } else if (rolesActuales && rolesActuales.length > 0) {
        console.debug(
          '[RolContext.cargarRolActivo] Setting first available rol:',
          rolesActuales[0]
        )
        console.debug(
          '[RolContext.cargarRolActivo] Calling setRolActivo(first)'
        )
        setRolActivo(rolesActuales[0])
        console.debug('[RolContext.cargarRolActivo] After setRolActivo(first)')
      } else {
        console.debug('[RolContext.cargarRolActivo] No roles available')
      }
    } catch (error) {
      console.error('[RolContext.cargarRolActivo] Error:', error)
      const rolesActuales = rolesRef.current
      if (rolesActuales && rolesActuales.length > 0) {
        console.debug(
          '[RolContext.cargarRolActivo] Fallback to first rol:',
          rolesActuales[0]
        )
        console.debug(
          '[RolContext.cargarRolActivo] Calling setRolActivo(fallback)'
        )
        try {
          setRolActivo(rolesActuales[0])
          console.debug(
            '[RolContext.cargarRolActivo] After setRolActivo(fallback)'
          )
        } catch (e2) {
          console.error(
            '[RolContext.cargarRolActivo] ERROR in fallback setRolActivo:',
            e2
          )
        }
      }
    } finally {
      console.debug(
        '[RolContext.cargarRolActivo] Finally block - calling setCargando(false)'
      )
      try {
        setCargando(false)
        console.debug(
          '[RolContext.cargarRolActivo] After setCargando(false) - SUCCESS'
        )
      } catch (e) {
        console.error(
          '[RolContext.cargarRolActivo] ERROR in setCargando(false):',
          {
            message: (e as any)?.message,
            stack: (e as any)?.stack,
            name: (e as any)?.name,
          }
        )
      }
    }
  }, [])

  // Cargar rol activo guardado al montar
  useEffect(() => {
    console.debug('[RolContext.mount] useEffect running on mount')
    cargarRolActivo()
  }, [cargarRolActivo])

  // Actualizar rol activo cuando cambien los roles del usuario
  useEffect(() => {
    console.debug('[RolContext] roles changed:', roles)
    if (Array.isArray(roles) && roles.length > 0) {
      console.debug('[RolContext] roles is array with length:', roles.length)
      if (!rolActivo || !roles.includes(rolActivo)) {
        console.debug('[RolContext] Need to load or update rolActivo')
        cargarRolActivo()
      } else {
        console.debug('[RolContext] rolActivo already valid')
      }
    } else {
      console.debug(
        '[RolContext] roles is empty or not array, setting rolActivo to null'
      )
      setRolActivo(null)
    }
  }, [roles, rolActivo])

  const cambiarRolActivo = async (nuevoRol: RolUsuario) => {
    console.debug('[RolContext.cambiarRolActivo] Starting with rol:', nuevoRol)
    setActivandoRol(true)
    setRolProvisional(nuevoRol)

    try {
      if (typeof recargarPerfil === 'function') {
        console.debug('[RolContext.cambiarRolActivo] Calling recargarPerfil')
        await recargarPerfil()
        console.debug('[RolContext.cambiarRolActivo] recargarPerfil done')
      }

      const maxWait = 5000
      const interval = 300
      let elapsed = 0
      let confirmado = false
      console.debug(
        '[RolContext.cambiarRolActivo] Polling for confirmation, maxWait:',
        maxWait
      )
      while (elapsed < maxWait) {
        if (rolesRef.current && rolesRef.current.includes(nuevoRol)) {
          console.debug(
            '[RolContext.cambiarRolActivo] Role confirmed in backend'
          )
          confirmado = true
          break
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, interval))
        elapsed += interval
      }

      if (confirmado) {
        try {
          console.debug('[RolContext.cambiarRolActivo] Saving to AsyncStorage')
          await AsyncStorage.setItem(ROL_ACTIVO_KEY, nuevoRol)
          console.debug(
            '[RolContext.cambiarRolActivo] Saved, calling setRolActivo'
          )
          setRolActivo(nuevoRol)
          console.debug('[RolContext.cambiarRolActivo] setRolActivo done')
        } catch (error) {
          console.error('[RolContext.cambiarRolActivo] Error guardando:', error)
        }
      } else {
        console.warn(
          '[RolContext.cambiarRolActivo] No se confirmó el rol en backend:',
          nuevoRol
        )
      }
    } catch (err) {
      console.error('[RolContext.cambiarRolActivo] Error verificando rol:', err)
    } finally {
      console.debug('[RolContext.cambiarRolActivo] Cleanup')
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
