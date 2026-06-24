import { useState, useEffect } from 'react'
import { ServicioMascota } from '@/services/firebase/firestore/colecciones/mascota'
import type { Mascota } from '@/models/Mascota'

interface UseMascotasRealtimeResult {
  mascotas: Mascota[]
  loading: boolean
  error: string | null
}

/**
 * Hook para suscribirse a mascotas de un usuario en tiempo real desde Firestore.
 * Maneja automáticamente el ciclo de vida de la suscripción.
 *
 * @param userId - ID del usuario propietario de las mascotas
 * @returns Objeto con mascotas, loading y error
 *
 * @example
 * const { mascotas, loading, error } = useMascotasRealtime(user?.uid)
 */
export function useMascotasRealtime(
  userId: string | null | undefined
): UseMascotasRealtimeResult {
  const [mascotas, setMascotas] = useState<Mascota[]>([])
  const [loading, setLoading] = useState<boolean>(!!userId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Si no hay userId, no iniciamos la suscripción
    if (!userId) {
      setMascotas([])
      setLoading(false)
      setError(null)
      return () => {}
    }

    setLoading(true)
    setError(null)

    // Establecer listener en tiempo real
    const unsubscribe = ServicioMascota.escucharPorUsuario(
      userId,
      (mascotasData: Mascota[]) => {
        setMascotas(mascotasData)
        setLoading(false)
      },
      (mensajeError: string) => {
        setError(mensajeError)
        setLoading(false)
      }
    )

    // Limpieza al desmontar el componente o cambiar el userId
    return unsubscribe
  }, [userId])

  return {
    mascotas,
    loading,
    error,
  }
}
