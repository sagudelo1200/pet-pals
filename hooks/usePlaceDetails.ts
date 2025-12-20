import { useState, useCallback } from 'react'
import { DetalleUbicacion } from '@/services/maps/types'
import { mapasService } from '@/services/maps'

// Inyectamos el servicio configurado
const provider = mapasService

export const usePlaceDetails = () => {
  const [detalles, setDetalles] = useState<DetalleUbicacion | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const obtenerDetalles = useCallback(async (placeId: string) => {
    setCargando(true)
    setError(null)
    try {
      const resultado = await provider.obtenerDetalles(placeId)
      setDetalles(resultado)
      return resultado
    } catch (err) {
      console.error(err)
      setError('Error al obtener detalles del lugar')
      return null
    } finally {
      setCargando(false)
    }
  }, [])

  const limpiar = useCallback(() => {
    setDetalles(null)
    setError(null)
  }, [])

  return {
    detalles,
    cargando,
    error,
    obtenerDetalles,
    limpiar,
  }
}
