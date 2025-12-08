import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ServicioPaseo } from '@/services/firebase/paseo'
import { PaseoStatus } from '@/models/Paseo'

interface EstadisticasCuidador {
  solicitudesPendientes: number
  paseosActivos: number
  paseosCompletados: number
  valoracionPromedio: number
  cargando: boolean
}

export const useEstadisticasCuidador = (): EstadisticasCuidador => {
  const { user } = useAuth()
  const [estadisticas, setEstadisticas] = useState<EstadisticasCuidador>({
    solicitudesPendientes: 0,
    paseosActivos: 0,
    paseosCompletados: 0,
    valoracionPromedio: 0,
    cargando: true,
  })

  useEffect(() => {
    if (!user?.uid) return

    const cargarEstadisticas = async () => {
      try {
        // Solicitudes disponibles (sin cuidador asignado)
        const solicitudesRes = await ServicioPaseo.obtenerPorEstado(PaseoStatus.PENDIENTE)
        const solicitudes = solicitudesRes.success ? solicitudesRes.data || [] : []
        const solicitudesSinAsignar = solicitudes.filter(p => !p.id_cuidador)

        // Paseos activos del cuidador
        const activosRes = await ServicioPaseo.obtenerPorCuidadorYEstado(
          user.uid,
          [PaseoStatus.ACEPTADO, PaseoStatus.EN_RUTA, PaseoStatus.EN_PROGRESO]
        )
        const activos = activosRes.success ? activosRes.data || [] : []

        // Paseos completados del cuidador
        const completadosRes = await ServicioPaseo.obtenerPorCuidadorYEstado(
          user.uid,
          [PaseoStatus.COMPLETADO]
        )
        const completados = completadosRes.success ? completadosRes.data || [] : []

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
    }

    cargarEstadisticas()
  }, [user?.uid])

  return estadisticas
}
