import { useEffect, useRef } from 'react'
import * as Location from 'expo-location'
import {
  ServicioRealtime,
  RUTAS_REALTIME,
  ahoraRealtime,
} from '@/services/firebase'
import { UbicacionRealtime } from '@/models/Ubicacion'
import { PaseoStatus } from '@/models/Paseo'

/**
 * Hook para que el cuidador publique su ubicación en tiempo real durante un paseo.
 *
 * @param idPaseo - ID del paseo actual.
 * @param estadoPaseo - Estado actual del paseo para determinar si se debe trackear.
 */
export function usePublicarUbicacion(
  idPaseo: string | undefined,
  estadoPaseo: PaseoStatus | undefined
) {
  const subscription = useRef<Location.LocationSubscription | null>(null)

  useEffect(() => {
    // Solo trackeamos si el paseo está en un estado activo
    const estadosActivos = [PaseoStatus.EN_RUTA, PaseoStatus.EN_PROGRESO]
    const debeTrackear =
      idPaseo && estadoPaseo && estadosActivos.includes(estadoPaseo)

    if (!debeTrackear) {
      detenerTracking()
      return
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
          const { latitude, longitude, speed, heading, accuracy } =
            location.coords

          const payload: UbicacionRealtime = {
            latitud: latitude,
            longitud: longitude,
            velocidad: speed ?? undefined,
            rumbo: heading ?? undefined,
            precision: accuracy ?? undefined,
            actualizado_en: ahoraRealtime(),
          }

          if (idPaseo) {
            // 1. Actualizar la ubicación actual (sobrescribir para el marcador en vivo)
            ServicioRealtime.guardar(
              RUTAS_REALTIME.ubicacionActual(idPaseo),
              payload
            )

            // 2. Agregar al historial de la ruta (push para dibujar la línea completa)
            ServicioRealtime.agregarLista(
              RUTAS_REALTIME.historialRuta(idPaseo),
              payload
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
