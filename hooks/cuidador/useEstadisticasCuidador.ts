import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { obtenerEstadisticasCuidador } from '@/logic/paseos/gestor'

interface EstadisticasCuidador {
  solicitudesPendientes: number
  paseosActivos: number
  paseosCompletados: number
  valoracionPromedio: number
  cargando: boolean
  refetch: () => Promise<void>
}

export const useEstadisticasCuidador = (): EstadisticasCuidador => {
  const { user } = useAuth()
  const [estadisticas, setEstadisticas] = useState<
    Omit<EstadisticasCuidador, 'refetch'>
  >({
    solicitudesPendientes: 0,
    paseosActivos: 0,
    paseosCompletados: 0,
    valoracionPromedio: 0,
    cargando: true,
  })

  const cargarEstadisticas = useCallback(async () => {
    if (!user?.uid) return

    setEstadisticas(prev => ({ ...prev, cargando: true }))
    try {
      const res = await obtenerEstadisticasCuidador(user.uid)

      if (res.success && res.data) {
        setEstadisticas({
          ...res.data,
          cargando: false,
        })
      } else {
        setEstadisticas(prev => ({ ...prev, cargando: false }))
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
      setEstadisticas(prev => ({ ...prev, cargando: false }))
    }
  }, [user?.uid])

  useEffect(() => {
    cargarEstadisticas()
  }, [cargarEstadisticas])

  return { ...estadisticas, refetch: cargarEstadisticas }
}
