import { useEffect, useRef, useState, useCallback } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import * as Location from 'expo-location'
import { GestorSeguimiento } from '@/logic/paseos/seguimiento'
import { ESTADOS_PASEO } from '@/models/Paseo'
import { GestorUbicacionFisica, GestorUbicaciones } from '@/logic/ubicaciones'
import { useTranslation } from 'react-i18next'

/**
 * Hook para que el cuidador publique su ubicación en tiempo real durante un paseo.
 */
export function usePublicarUbicacion(
  idPaseo: string | undefined,
  estadoPaseo: ESTADOS_PASEO | undefined
): { error: string | null; errorMessage: string | null } {
  const subscription = useRef<Location.LocationSubscription | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { t } = useTranslation()

  const detenerTracking = useCallback(() => {
    if (subscription.current) {
      subscription.current.remove()
      subscription.current = null
    }
  }, [])

  const iniciarTracking = useCallback(async () => {
    try {
      // Si ya hay suscripción activa, no reiniciamos a menos que sea necesario
      if (subscription.current) return

      setError(null)
      setErrorMessage(null)

      // 1. Verificar integridad (GPS ON + Permisos)
      await GestorUbicacionFisica.verificarIntegridad()

      // 2. Iniciar seguimiento
      subscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
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
      console.warn('[GPS] Error en tracking:', code)
      detenerTracking()
    }
  }, [idPaseo, estadoPaseo, t, detenerTracking])

  // Efecto principal: Iniciar/Detener según estado del paseo
  useEffect(() => {
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
  }, [idPaseo, estadoPaseo, iniciarTracking, detenerTracking])

  // Re-intentar automáticamente o detectar fallos cada pocos segundos
  useEffect(() => {
    const estadosActivos = [ESTADOS_PASEO.EN_CAMINO, ESTADOS_PASEO.EN_PROGRESO]
    const debeEstarMonitoreando =
      idPaseo && estadoPaseo && estadosActivos.includes(estadoPaseo)

    if (!debeEstarMonitoreando) return undefined

    const monitorizar = async () => {
      try {
        await GestorUbicacionFisica.verificarIntegridad()
        // Si llegamos aquí, el GPS está OK.
        // Si no hay suscripción activa, la iniciamos.
        if (!subscription.current) {
          iniciarTracking()
        }
      } catch (err: any) {
        // El GPS se apagó o se quitaron permisos en caliente
        const code = err.message
        if (code !== error) {
          const key = GestorUbicaciones.obtenerClaveI18nErrorUbicacion(code)
          setError(code)
          setErrorMessage(key ? t(key) : t('ubicaciones:errores.generico'))
          detenerTracking()
        }
      }
    }

    // Chequeo inicial
    monitorizar()

    // Polling de seguridad cada 4 segundos para detectar cambios del sistema
    const interval = setInterval(monitorizar, 4000)

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        monitorizar()
      }
    }

    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    )

    return () => {
      appStateSubscription.remove()
      if (interval) clearInterval(interval)
    }
  }, [idPaseo, estadoPaseo, error, iniciarTracking, detenerTracking, t])

  return { error, errorMessage }
}
