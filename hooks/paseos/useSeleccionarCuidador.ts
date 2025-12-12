import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ServicioPerfilPublico } from '@/services/firebase/perfil-publico'

interface CuidadorListItem {
  id: string
  nombre: string
  imagen: string
  calificacion: number
  distancia: string
  tarifa: string
  insignias: string[]
  horario_laboral?: {
    dias: number[]
    hora_inicio: string
    hora_fin: string
  }
}

export const useSeleccionarCuidador = (
  cuidadorInicialId: string | null = null,
  fecha?: Date | null
) => {
  const { user } = useAuth()
  const [cuidadores, setCuidadores] = useState<CuidadorListItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cuidadorSeleccionado, setCuidadorSeleccionado] = useState<
    string | null
  >(cuidadorInicialId)

  useEffect(() => {
    cargarCuidadores()
  }, [fecha])

  const cargarCuidadores = async () => {
    setCargando(true)
    setError(null)

    try {
      const resultado =
        await ServicioPerfilPublico.obtenerCuidadoresDisponibles()

      if (resultado.success && resultado.data) {
        let filtrados = resultado.data.filter(perfil => perfil.id !== user?.uid)

        // Filtrar por disponibilidad de DÍA si hay fecha seleccionada
        if (fecha) {
          const diaSemana = fecha.getDay() // 0 = Domingo

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

          filtrados = filtrados.filter(perfil => {
            // Si no tiene horario configurado, asumimos NO disponible
            if (!perfil.horario_laboral) return false

            const dias = parseDias(perfil.horario_laboral.dias)
            return dias.includes(diaSemana)
          })
        }

        // Mapear PerfilPublico a CuidadorListItem
        const cuidadoresMapeados: CuidadorListItem[] = filtrados.map(perfil => {
          const ratingNum = Number(perfil.rating_promedio)
          const cal = !isNaN(ratingNum) ? ratingNum : 0

          return {
            id: perfil.id,
            nombre: perfil.nombre,
            imagen: perfil.foto || 'https://via.placeholder.com/69',
            calificacion: cal,
            distancia: '2.5 km', // TODO: Calcular distancia real
            tarifa: perfil.tarifa_por_hora
              ? `$${perfil.tarifa_por_hora.toLocaleString()}/hr`
              : 'A consultar',
            insignias:
              perfil.verificacion === 'verificado' ? ['verificado'] : [],
            horario_laboral: perfil.horario_laboral,
          }
        })

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
