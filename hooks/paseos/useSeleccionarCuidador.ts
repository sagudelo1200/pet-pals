import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ServicioPerfilPublico } from '@/services/firebase/perfil-publico'
import type { PerfilPublico } from '@/models/PerfilPublico'

interface CuidadorListItem {
  id: string
  nombre: string
  imagen: string
  calificacion: number
  distancia: string
  tarifa: string
  insignias: string[]
}

export const useSeleccionarCuidador = (
  initialWalkerId: string | null = null,
  fecha?: Date | null,
  hora?: string | null,
  duracionMinutos?: number | null
) => {
  const { user } = useAuth()
  const [cuidadores, setCuidadores] = useState<CuidadorListItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cuidadorSeleccionado, setCuidadorSeleccionado] = useState<
    string | null
  >(initialWalkerId)

  useEffect(() => {
    cargarCuidadores()
  }, [fecha, hora, duracionMinutos])

  // Helper para convertir HH:mm a minutos desde medianoche
  const timeToMinutes = (time: string) => {
    const [hh, mm] = time.split(':').map(Number)
    return hh * 60 + mm
  }

  const cargarCuidadores = async () => {
    setCargando(true)
    setError(null)

    try {
      const resultado =
        await ServicioPerfilPublico.obtenerCuidadoresDisponibles()

      if (resultado.success && resultado.data) {
        let filtrados = resultado.data.filter(perfil => perfil.id !== user?.uid)

        // Filtrar por disponibilidad si hay fecha y hora seleccionadas
        if (fecha && hora) {
          const diaSemana = fecha.getDay() // 0 = Domingo
          const horaSolicitada = hora // "HH:mm"
          const duracion = duracionMinutos || 60 // Default 1 hora si no viene

          filtrados = filtrados.filter(perfil => {
            // Si no tiene horario configurado, asumimos NO disponible
            if (!perfil.horario_laboral) return false

            const { dias, hora_inicio, hora_fin } = perfil.horario_laboral

            // 1. Verificar día
            if (!dias.includes(diaSemana)) return false

            // 2. Verificar rango horario completo
            const inicioSolicitud = timeToMinutes(horaSolicitada)
            const finSolicitud = inicioSolicitud + duracion

            const inicioTurno = timeToMinutes(hora_inicio)
            const finTurno = timeToMinutes(hora_fin)

            // El paseo debe empezar DESPUÉS del inicio del turno
            // Y terminar ANTES del fin del turno
            if (inicioSolicitud < inicioTurno || finSolicitud > finTurno) {
              return false
            }

            return true
          })
        }

        // Mapear PerfilPublico a CuidadorListItem
        const cuidadoresMapeados: CuidadorListItem[] = filtrados.map(
          perfil => ({
            id: perfil.id,
            nombre: perfil.nombre,
            imagen: perfil.foto || 'https://via.placeholder.com/69',
            calificacion: perfil.rating_promedio || 0,
            distancia: '2.5 km', // TODO: Calcular distancia real
            tarifa: perfil.tarifa_por_hora
              ? `$${perfil.tarifa_por_hora.toLocaleString()}/hr`
              : 'A consultar',
            insignias:
              perfil.verificacion === 'verificado' ? ['verificado'] : [],
          })
        )

        setCuidadores(cuidadoresMapeados)
      } else {
        setError(resultado.error || 'Error al cargar cuidadores')
      }
    } catch (err) {
      setError('Error inesperado al cargar cuidadores')
      console.error('Error cargando cuidadores:', err)
    } finally {
      setCargando(false)
    }
  }

  const seleccionarCuidador = (id: string) => {
    setCuidadorSeleccionado(id)
  }

  return {
    cuidadores,
    cargando,
    error,
    cuidadorSeleccionado,
    seleccionarCuidador,
    recargar: cargarCuidadores,
  }
}
