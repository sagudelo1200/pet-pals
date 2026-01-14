import * as Location from 'expo-location'
import { ERR } from '@/constants/errors'

export const GestorUbicacionFisica = {
  /**
   * Verifica si los servicios de ubicación están activos y si el usuario dio permisos.
   * Lanza un código de error de ERR.UBICACION si algo falla.
   */
  async verificarIntegridad(): Promise<void> {
    try {
      const enabled = await Location.hasServicesEnabledAsync()
      if (!enabled) {
        throw new Error(ERR.UBICACION.SERVICIOS_DESACTIVADOS)
      }

      const { status } = await Location.getForegroundPermissionsAsync()
      if (status === 'denied') {
        throw new Error(ERR.UBICACION.PERMISO_DENEGADO)
      }

      if (status !== 'granted') {
        const { status: newStatus } =
          await Location.requestForegroundPermissionsAsync()
        if (newStatus !== 'granted') {
          throw new Error(ERR.UBICACION.PERMISO_DENEGADO)
        }
      }
    } catch (error: any) {
      if (Object.values(ERR.UBICACION).includes(error.message)) {
        throw error
      }
      throw new Error(ERR.UBICACION.ERROR_DISPOSITIVO)
    }
  },

  /**
   * Obtiene la posición actual con manejo de errores y timeout.
   */
  async obtenerPosicionActual(
    timeoutMs: number = 18000
  ): Promise<Location.LocationObject> {
    await this.verificarIntegridad()

    try {
      // Intentamos obtener la última conocida para rapidez (opcional)
      // Pero para precisión solemos usar getCurrentPosition
      const position = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(ERR.UBICACION.TIMEOUT)), timeoutMs)
        ),
      ])

      return position
    } catch (error: any) {
      if (Object.values(ERR.UBICACION).includes(error.message)) {
        throw error
      }
      console.error('[GestorUbicacionFisica] Error al obtener posición:', error)
      throw new Error(ERR.UBICACION.ERROR_DISPOSITIVO)
    }
  },

  /**
   * Abre la configuración de la app para que el usuario active permisos.
   */
  async abrirConfiguracion() {
    await Location.enableNetworkProviderAsync().catch(() => {})
    // En Expo no hay una API directa simple para abrir 'ajustes de permisos' exacta
    // pero podemos sugerir el uso de Linking de react-native.
  },
}
