import { useEffect, useRef, useState, useCallback } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { GestorSeguimiento } from '@/logic/paseos/seguimiento'
import { ESTADOS_PASEO } from '@/models/Paseo'
import { GestorUbicacionFisica, GestorUbicaciones } from '@/logic/ubicaciones'
import { LOCATION_TASK_NAME } from '@/logic/paseos/backgroundTask'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'

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

  const detenerTracking = useCallback(async () => {
    if (subscription.current) {
      subscription.current.remove()
      subscription.current = null
    }
    // Detener tarea de fondo
    try {
      const isRegistered =
        await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
      }
    } catch (err: any) {
      if (err.message?.includes('Task not found')) {
        console.debug('[GPS] La tarea de fondo ya estaba detenida.')
      } else {
        console.warn('[GPS] Error deteniendo tracking de fondo:', err)
      }
    } finally {
      await AsyncStorage.removeItem('@task_active_ride').catch(() => {})
    }
  }, [])

  const iniciarTracking = useCallback(async () => {
    try {
      // 1. Evitar duplicidad si ya está activo
      const isRunningBg =
        await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
      if (isRunningBg && subscription.current) return

      setError(null)
      setErrorMessage(null)

      // 2. Integridad de Hardware/Sistema (GPS ON + Permisos Foreground)
      await GestorUbicacionFisica.verificarIntegridad()

      // 3. Persistir contexto para la tarea de fondo inmediatamente
      if (idPaseo && estadoPaseo) {
        await AsyncStorage.setItem(
          '@task_active_ride',
          JSON.stringify({ idPaseo, estadoPaseo })
        )
      }

      // 4. Intento de inicio seguimiento Foreground (UI reactiva)
      if (!subscription.current) {
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
              ).catch(e =>
                console.debug('[GPS] Error publicación foreground:', e)
              )
            }
          }
        )
      }

      // 5. Gestión Seguimiento Background (Resiliencia)
      const { status: bgStatus } =
        await Location.getBackgroundPermissionsAsync()

      if (bgStatus === 'granted') {
        const isAlreadyTaskRunning =
          await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
        if (!isAlreadyTaskRunning) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000,
            distanceInterval: 20,
            foregroundService: {
              notificationTitle: t('paseos:control.notificacion_titulo'),
              notificationBody: t('paseos:control.notificacion_cuerpo'),
              notificationColor: COLOR.PRIMARIO,
            },
            pausesUpdatesAutomatically: false,
          })
        }
      } else {
        // Si no hay permisos de fondo, intentamos pedirlos una vez más
        const { status: newBgStatus } =
          await Location.requestBackgroundPermissionsAsync()
        if (newBgStatus !== 'granted') {
          console.warn(
            '[GPS] Seguimiento en segundo plano deshabilitado (sin permisos)'
          )
        }
      }
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
