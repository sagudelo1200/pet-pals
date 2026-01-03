import { useEffect, useRef } from 'react'
import * as Location from 'expo-location'
import { GestorSeguimiento } from '@/logic/paseos/seguimiento'
import { ESTADOS_PASEO } from '@/models/Paseo'

/**
 * Hook para que el cuidador publique su ubicación en tiempo real durante un paseo.
 *
 * @param idPaseo - ID del paseo actual.
 * @param estadoPaseo - Estado actual del paseo para determinar si se debe trackear.
 */
export function usePublicarUbicacion(
  idPaseo: string | undefined,
  estadoPaseo: ESTADOS_PASEO | undefined
): void {
  const subscription = useRef<Location.LocationSubscription | null>(null)

  useEffect(() => {
    // Solo trackeamos si el paseo está en un estado activo
    const estadosActivos = [ESTADOS_PASEO.EN_CAMINO, ESTADOS_PASEO.EN_PROGRESO]
    const debeTrackear =
      idPaseo && estadoPaseo && estadosActivos.includes(estadoPaseo)

    if (!debeTrackear) {
      detenerTracking()
      return undefined
    }

    iniciarTracking()

    return () => {
      detenerTracking()
    }
  }, [idPaseo, estadoPaseo])

  const iniciarTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        console.warn('[GPS] Permisos de ubicación denegados')
        return
      }

      // Detener suscripción previa si existe
      if (subscription.current) {
        subscription.current.remove()
      }

      // Iniciar seguimiento con alta precisión
      subscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Cada 5 segundos
          distanceInterval: 10, // O cada 10 metros
        },
        location => {
          if (idPaseo && estadoPaseo) {
            GestorSeguimiento.publicarUbicacion(
              idPaseo,
              estadoPaseo,
              location.coords
            )
          }
        }
      )
    } catch (error) {
      console.error('[GPS] Error al iniciar tracking:', error)
    }
  }

  const detenerTracking = () => {
    if (subscription.current) {
      subscription.current.remove()
      subscription.current = null
    }
  }
}
