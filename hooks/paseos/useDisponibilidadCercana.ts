import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import type { PerfilPublico } from '@/models/PerfilPublico'
import { LogicMatching } from '@/logic/paseos/matching'

interface DisponibilidadItem {
  fecha: Date
  count: number
  horariosEjemplo: string[]
}

export const useDisponibilidadCercana = (opts?: {
  resultsCount?: number
  maxWindowDays?: number
}) => {
  const resultsCount = opts?.resultsCount ?? 6
  const maxWindowDays = opts?.maxWindowDays ?? 30
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fechas, setFechas] = useState<DisponibilidadItem[]>([])
  const { user } = useAuth()

  const calcularDisponibilidad = useCallback(
    (perfiles: PerfilPublico[]) => {
      const resultados: DisponibilidadItem[] = []
      const hoy = new Date()

      for (let offset = 0; offset < maxWindowDays; offset++) {
        const fecha = new Date(hoy)
        fecha.setDate(hoy.getDate() + offset)

        const candidatos = perfiles.filter(p => {
          // Si el cuidador no tiene horario configurado, no está disponible.
          if (!p.horario_laboral) return false

          // Usamos la lógica centralizada de matching.
          // Para esta vista general, verificamos si está disponible ese día
          // usando su propia hora de inicio configurada como referencia.
          return LogicMatching.esCuidadorDisponible(p, {
            fecha,
            hora: p.horario_laboral.hora_inicio,
            duracion: 0,
          })
        })

        if (candidatos.length > 0) {
          const horariosEjemplo = candidatos
            .slice(0, 3)
            .map(
              p =>
                `${p.horario_laboral!.hora_inicio}–${p.horario_laboral!.hora_fin}`
            )

          resultados.push({ fecha, count: candidatos.length, horariosEjemplo })
        }

        if (resultados.length >= resultsCount) break
      }

      setFechas(resultados)
    },
    [maxWindowDays, resultsCount]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await GestorPerfilPublico.obtenerCuidadoresDisponibles()
      if (res.success && res.data) {
        // Excluir el perfil del usuario actual para evitar que un tutor
        // se auto-selecione como cuidador en las sugerencias.
        const perfilesFiltrados = res.data.filter(p => p.id !== user?.uid)
        calcularDisponibilidad(perfilesFiltrados)
      } else {
        setError(res.error || 'ERROR_AL_CARGAR')
      }
    } catch (e) {
      console.error('Error cargando disponibilidad:', e)
      setError('ERROR_AL_CARGAR')
    } finally {
      setLoading(false)
    }
  }, [calcularDisponibilidad, user?.uid])

  useEffect(() => {
    void load()
  }, [load])

  return { loading, error, fechas, recargar: load }
}
