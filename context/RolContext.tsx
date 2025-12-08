import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from './AuthContext'
import type { RolUsuario } from '@/models/Usuario'

const ROL_ACTIVO_KEY = '@pet_pals_rol_activo'

interface RolContextType {
  rolActivo: RolUsuario | null
  cambiarRolActivo: (rol: RolUsuario) => Promise<void>
  tieneMultiplesRoles: boolean
  rolesDisponibles: RolUsuario[]
  cargando: boolean
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
  const { roles } = useAuth()
  const [rolActivo, setRolActivo] = useState<RolUsuario | null>(null)
  const [cargando, setCargando] = useState(true)

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
    if (!roles?.includes(nuevoRol)) {
      console.warn('Intento de cambiar a un rol no disponible:', nuevoRol)
      return
    }

    try {
      await AsyncStorage.setItem(ROL_ACTIVO_KEY, nuevoRol)
      setRolActivo(nuevoRol)
    } catch (error) {
      console.error('Error guardando rol activo:', error)
    }
  }

  const value: RolContextType = {
    rolActivo,
    cambiarRolActivo,
    tieneMultiplesRoles: (roles?.length ?? 0) > 1,
    rolesDisponibles: roles ?? [],
    cargando,
  }

  return <RolContext.Provider value={value}>{children}</RolContext.Provider>
}
