import { useState, useEffect } from 'react'
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

export const useSeleccionarCuidador = (initialWalkerId: string | null = null) => {
  const [cuidadores, setCuidadores] = useState<CuidadorListItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cuidadorSeleccionado, setCuidadorSeleccionado] = useState<string | null>(initialWalkerId)

  useEffect(() => {
    cargarCuidadores()
  }, [])

  const cargarCuidadores = async () => {
    setCargando(true)
    setError(null)

    try {
      const resultado = await ServicioPerfilPublico.obtenerCuidadoresDisponibles()

      if (resultado.success && resultado.data) {
        // Mapear PerfilPublico a CuidadorListItem
        const cuidadoresMapeados: CuidadorListItem[] = resultado.data.map(perfil => ({
          id: perfil.id,
          nombre: perfil.nombre,
          imagen: perfil.foto || 'https://via.placeholder.com/60',
          calificacion: perfil.rating_promedio || 0,
          distancia: '2.5 km', // TODO: Calcular distancia real con geolocalización
          tarifa: perfil.tarifa_por_hora 
            ? `$${perfil.tarifa_por_hora.toLocaleString()}/hr` 
            : 'A consultar',
          insignias: perfil.verificacion === 'verificado' ? ['verificado'] : [],
        }))

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
