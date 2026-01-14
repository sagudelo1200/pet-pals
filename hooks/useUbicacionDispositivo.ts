import { useState, useCallback, useEffect } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GestorUbicacionFisica, GestorUbicaciones } from '@/logic/ubicaciones'
import * as Location from 'expo-location'

export function useUbicacionDispositivo() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const chequearIntegridad = useCallback(async () => {
    try {
      await GestorUbicacionFisica.verificarIntegridad()
      setError(null)
      setErrorMessage(null)
      return true
    } catch (e: any) {
      const code = e.message
      const key = GestorUbicaciones.obtenerClaveI18nErrorUbicacion(code)
      setError(code)
      setErrorMessage(key ? t(key) : t('ubicaciones:errores.generico'))
      return false
    }
  }, [t])

  const obtenerPosicion =
    useCallback(async (): Promise<Location.LocationObject | null> => {
      setLoading(true)
      try {
        const posicion = await GestorUbicacionFisica.obtenerPosicionActual()
        setError(null)
        setErrorMessage(null)
        return posicion
      } catch (e: any) {
        const code = e.message
        const key = GestorUbicaciones.obtenerClaveI18nErrorUbicacion(code)
        setError(code)
        setErrorMessage(key ? t(key) : t('ubicaciones:errores.generico'))
        return null
      } finally {
        setLoading(false)
      }
    }, [t])

  // Re-chequear cuando vuelve a la app si había error
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && error) {
        chequearIntegridad()
      }
    }

    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    )

    return () => {
      appStateSubscription.remove()
    }
  }, [error, chequearIntegridad])

  return {
    loading,
    error,
    errorMessage,
    chequearIntegridad,
    obtenerPosicion,
    limpiarError: () => {
      setError(null)
      setErrorMessage(null)
    },
  }
}
