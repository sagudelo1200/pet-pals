import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { LogicMatching } from '@/logic/paseos/matching'

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
  >(cuidadorInicialId)

  useEffect(() => {
    cargarCuidadores()
  }, [fecha, hora, duracionMinutos])

  const cargarCuidadores = async () => {
    setCargando(true)
    setError(null)

    try {
      const resultado = await GestorPerfilPublico.obtenerCuidadoresDisponibles()

      if (resultado.success && resultado.data) {
        let filtrados = resultado.data.filter(perfil => perfil.id !== user?.uid)

        // Aplicar MATCHING si tenemos los parámetros necesarios
        if (fecha && hora && duracionMinutos) {
          filtrados = LogicMatching.filtrarDisponibles(filtrados, {
            fecha,
            hora,
            duracion: duracionMinutos,
          })
        } else if (fecha) {
          // Si solo hay fecha, al menos filtrar por día de la semana
          // (Podemos usar LogicMatching para esto también pasando duración 0)
          filtrados = filtrados.filter(p =>
            LogicMatching.esCuidadorDisponible(p, {
              fecha,
              hora: p.horario_laboral?.hora_inicio || '00:00',
              duracion: 0,
            })
          )
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
