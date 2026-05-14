import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { LogicMatching } from '@/logic/paseos/matching'
import { coordsAH3, distanciaKmEntreH3 } from '@/services/geo'

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
  duracionMinutos?: number | null,
  coordenadasTutor?: { latitude: number; longitude: number } | null
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
  }, [fecha, hora, duracionMinutos, coordenadasTutor])

  const cargarCuidadores = async () => {
    setCargando(true)
    setError(null)

    try {
      // Búsqueda geoespacial O(1) si tenemos coordenadas del tutor;
      // fallback a búsqueda global verificados cuando no hay ubicación.
      let fuente: any[] = []
      let indiceCeldaTutor: string | null = null

      if (coordenadasTutor) {
        indiceCeldaTutor = coordsAH3(
          coordenadasTutor.latitude,
          coordenadasTutor.longitude
        )
        const resultado =
          await GestorPerfilPublico.obtenerCuidadoresPorH3(indiceCeldaTutor)
        if (resultado.success && resultado.data) {
          fuente = resultado.data
        }
      } else {
        const resultado =
          await GestorPerfilPublico.obtenerCuidadoresDisponibles()
        if (resultado.success && resultado.data) {
          fuente = resultado.data
        }
      }

      let filtrados = fuente.filter((p: any) => (p.id ?? p.uid) !== user?.uid)

      // Aplicar MATCHING si tenemos los parámetros necesarios
      if (fecha && hora && duracionMinutos) {
        filtrados = LogicMatching.filtrarDisponibles(filtrados as any, {
          fecha,
          hora,
          duracion: duracionMinutos,
        })
      } else if (fecha) {
        filtrados = filtrados.filter((p: any) =>
          LogicMatching.esCuidadorDisponible(p as any, {
            fecha,
            hora: p.horario_laboral?.hora_inicio || '00:00',
            duracion: 0,
          })
        )
      }

      // Mapear a CuidadorListItem calculando distancia real desde H3
      const cuidadoresMapeados: CuidadorListItem[] = filtrados.map(
        (perfil: any) => {
          const id = perfil.id ?? perfil.uid
          const ratingNum = Number(perfil.rating_promedio)
          const cal = !isNaN(ratingNum) ? ratingNum : 0

          let distanciaTexto = '—'
          if (indiceCeldaTutor && perfil.h3_home) {
            const km = distanciaKmEntreH3(perfil.h3_home, indiceCeldaTutor)
            distanciaTexto = `${km.toFixed(1)} km`
          } else if (indiceCeldaTutor && perfil.h3_origen) {
            const km = distanciaKmEntreH3(perfil.h3_origen, indiceCeldaTutor)
            distanciaTexto = `${km.toFixed(1)} km`
          }

          return {
            id,
            nombre: perfil.nombre,
            imagen: perfil.foto || 'https://via.placeholder.com/69',
            calificacion: cal,
            distancia: distanciaTexto,
            tarifa: perfil.tarifa_por_hora
              ? `$${perfil.tarifa_por_hora.toLocaleString()}/hr`
              : 'A consultar',
            insignias:
              perfil.verificacion === 'verificado' ? ['verificado'] : [],
            horario_laboral: perfil.horario_laboral,
          }
        }
      )

      setCuidadores(cuidadoresMapeados)
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
