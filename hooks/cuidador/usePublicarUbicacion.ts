import { useEffect, useRef, useState } from 'react'
import * as Location from 'expo-location'
import { GestorSeguimiento } from '@/logic/paseos/seguimiento'
import { ESTADOS_PASEO } from '@/models/Paseo'
import { GestorUbicacionFisica, GestorUbicaciones } from '@/logic/ubicaciones'
import { useTranslation } from 'react-i18next'

/**
 * Hook para que el cuidador publique su ubicación en tiempo real durante un paseo.
 *
 * @param idPaseo - ID del paseo actual.
 * @param estadoPaseo - Estado actual del paseo para determinar si se debe trackear.
 */
export function usePublicarUbicacion(
  idPaseo: string | undefined,
  estadoPaseo: ESTADOS_PASEO | undefined
): { error: string | null; errorMessage: string | null } {
  const subscription = useRef<Location.LocationSubscription | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { t } = useTranslation()

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
      setError(null)
      setErrorMessage(null)

      // Usamos el gestor para verificar integridad (GPS ON + Permisos)
      await GestorUbicacionFisica.verificarIntegridad()

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
    } catch (err: any) {
      const code = err.message
      const key = GestorUbicaciones.obtenerClaveI18nErrorUbicacion(code)
      setError(code)
      setErrorMessage(key ? t(key) : t('ubicaciones:errores.generico'))
      console.error('[GPS] Error al iniciar tracking:', code)
    }
  }

  const detenerTracking = () => {
    if (subscription.current) {
      subscription.current.remove()
      subscription.current = null
    }
  }

  return { error, errorMessage }
}
