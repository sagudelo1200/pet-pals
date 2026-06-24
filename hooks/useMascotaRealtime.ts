import { useState, useEffect } from 'react'
import { ServicioMascota } from '@/services/firebase/firestore/colecciones/mascota'
import type { Mascota } from '@/models/Mascota'

interface UseMascotaRealtimeResult {
  mascota: Mascota | null
  loading: boolean
  error: string | null
}

/**
 * Hook para suscribirse a una mascota específica en tiempo real desde Firestore.
 * Maneja automáticamente el ciclo de vida de la suscripción.
 *
 * @param mascotaId - ID de la mascota a escuchar
 * @returns Objeto con mascota, loading y error
 *
 * @example
 * const { mascota, loading, error } = useMascotaRealtime(mascotaId)
 */
export function useMascotaRealtime(
  mascotaId: string | null | undefined
): UseMascotaRealtimeResult {
  const [mascota, setMascota] = useState<Mascota | null>(null)
  const [loading, setLoading] = useState<boolean>(!!mascotaId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Si no hay mascotaId, no iniciamos la suscripción
    if (!mascotaId) {
      setMascota(null)
      setLoading(false)
      setError(null)
      return () => {}
    }

    setLoading(true)
    setError(null)

    // Establecer listener en tiempo real
    const unsubscribe = ServicioMascota.escucharPorId(
      mascotaId,
      (mascotaData: Mascota) => {
        setMascota(mascotaData)
        setLoading(false)
      },
      (mensajeError: string) => {
        setError(mensajeError)
        setLoading(false)
      }
    )

    // Limpieza al desmontar el componente o cambiar el mascotaId
    return unsubscribe
  }, [mascotaId])

  return {
    mascota,
    loading,
    error,
  }
}
