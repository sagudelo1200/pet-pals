import { useState, useEffect } from 'react'
import { ServicioRealtime } from '@/services/firebase'

/**
 * Hook para suscribirse a una ruta de Firebase Realtime Database en tiempo real.
 * Maneja automáticamente el ciclo de vida de la suscripción y los estados de la UI.
 *
 * @param ruta - La ruta del nodo a escuchar (se recomienda usar RUTAS_REALTIME).
 *               Si es null, el hook no iniciará la suscripción.
 * @returns Un objeto con los datos, el estado de carga y posibles errores.
 */
export function useTiempoReal<T = any>(ruta: string | null) {
  const [datos, setDatos] = useState<T | null>(null)
  const [cargando, setCargando] = useState<boolean>(!!ruta)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Si no hay ruta, no hacemos nada
    if (!ruta) {
      setDatos(null)
      setCargando(false)
      setError(null)
      return undefined
    }

    setCargando(true)
    setError(null)

    // Iniciamos la escucha en tiempo real
    const cancelarSuscripcion = ServicioRealtime.escuchar<T>(
      ruta,
      (nuevosDatos: T | null) => {
        setDatos(nuevosDatos)
        setCargando(false)
      },
      (mensajeError: string) => {
        setError(mensajeError)
        setCargando(false)
      }
    )

    // Limpieza al desmontar el componente o cambiar la ruta
    return () => {
      cancelarSuscripcion()
    }
  }, [ruta])

  return {
    datos,
    cargando,
    error,
  }
}
