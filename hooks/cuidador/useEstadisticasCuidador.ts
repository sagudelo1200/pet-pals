import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ServicioPaseo } from '@/services/firebase/paseo'
import { PaseoStatus } from '@/models/Paseo'

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
      // Solicitudes disponibles (sin cuidador asignado)
      const solicitudesRes = await ServicioPaseo.obtenerPorEstado(
        PaseoStatus.PENDIENTE
      )
      const solicitudes = solicitudesRes.success
        ? solicitudesRes.data || []
        : []
      const solicitudesSinAsignar = solicitudes.filter(p => !p.id_cuidador)

      // Optimización: Consultar todos los paseos del cuidador en una sola query
      const todosRes = await ServicioPaseo.obtenerPorCuidadorYEstado(user.uid, [
        PaseoStatus.ACEPTADO,
        PaseoStatus.EN_RUTA,
        PaseoStatus.EN_PROGRESO,
        PaseoStatus.COMPLETADO,
        PaseoStatus.FINALIZADO,
      ])
      const todos = todosRes.success ? todosRes.data || [] : []

      const activos = todos.filter(p =>
        [
          PaseoStatus.ACEPTADO,
          PaseoStatus.EN_RUTA,
          PaseoStatus.EN_PROGRESO,
        ].includes(p.estado)
      )
      const completados = todos.filter(
        p =>
          p.estado === PaseoStatus.COMPLETADO ||
          p.estado === PaseoStatus.FINALIZADO
      )

      setEstadisticas({
        solicitudesPendientes: solicitudesSinAsignar.length,
        paseosActivos: activos.length,
        paseosCompletados: completados.length,
        valoracionPromedio: 0, // TODO: Implementar cuando exista sistema de valoraciones
        cargando: false,
      })
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
