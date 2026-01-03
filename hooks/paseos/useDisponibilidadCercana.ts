import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import type { PerfilPublico } from '@/models/PerfilPublico'

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

  const parseDias = (diasRaw: any): number[] => {
    if (!diasRaw) return []
    if (Array.isArray(diasRaw)) {
      const out: number[] = []
      for (const v of diasRaw) {
        if (typeof v === 'number') out.push(v)
        else if (typeof v === 'string') out.push(Number(v))
        else if (typeof v === 'object' && v !== null) {
          const keys = Object.keys(v)
          if (keys.length === 1 && !isNaN(Number(v[keys[0]]))) {
            out.push(Number(v[keys[0]]))
          } else {
            for (const val of Object.values(v)) {
              const n = Number(val as any)
              if (!isNaN(n)) out.push(n)
            }
          }
        }
      }
      return out
    }

    if (typeof diasRaw === 'object') {
      return Object.keys(diasRaw)
        .map(k => Number(k))
        .filter(n => !isNaN(n))
    }

    return []
  }

  const calcularDisponibilidad = useCallback(
    (perfiles: PerfilPublico[]) => {
      const resultados: DisponibilidadItem[] = []
      const hoy = new Date()

      for (let offset = 0; offset < maxWindowDays; offset++) {
        const fecha = new Date(hoy)
        fecha.setDate(hoy.getDate() + offset)
        const diaSemana = fecha.getDay()

        const candidatos = perfiles.filter(p => {
          const h = p.horario_laboral
          if (!h || !h.dias) return false

          const dias = parseDias(h.dias)
          return dias.includes(diaSemana)
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
