import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { GestorUbicacionFisica, GestorUbicaciones } from '@/logic/ubicaciones'
import * as Location from 'expo-location'

export function useUbicacionDispositivo() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const chequearYObtenerPosicion =
    useCallback(async (): Promise<Location.LocationObject | null> => {
      setLoading(true)
      setError(null)
      setErrorMessage(null)

      try {
        const posicion = await GestorUbicacionFisica.obtenerPosicionActual()
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

  const limpiarError = () => {
    setError(null)
    setErrorMessage(null)
  }

  return {
    loading,
    error,
    errorMessage,
    chequearYObtenerPosicion,
    limpiarError,
  }
}
