import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import { GestorSeguimiento } from './seguimiento'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_PETPALS'

/**
 * Tarea de segundo plano para el seguimiento de ubicación en PetPals.
 * Rectificada con manejo de errores robusto y validación de contexto.
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  // 1. Manejo de errores del sistema de ubicación
  if (error) {
    console.error(
      `[BackgroundTask] Error crítico del motor de ubicación: ${error.message}`
    )
    return
  }

  // 2. Si no hay datos de coordenadas, salimos temprano
  if (!data) return

  try {
    const { locations } = data as { locations: Location.LocationObject[] }
    const location = locations[0]

    if (!location?.coords) return

    // 3. Recuperar contexto del paseo (Fuente de verdad persistente)
    // Usamos AsyncStorage porque el estado de React no existe en este hilo de ejecución
    const rawData = await AsyncStorage.getItem('@task_active_ride')

    if (!rawData) {
      // El paseo probablemente ha terminado o el storage se limpió
      return
    }

    const { idPaseo, estadoPaseo } = JSON.parse(rawData)

    if (!idPaseo) return

    // 4. Publicación resiliente
    // Envolvemos la publicación en su propio bloque para que fallos de red
    // no interrumpan el flujo de la tarea de fondo.
    try {
      await GestorSeguimiento.publicarUbicacion(
        idPaseo,
        estadoPaseo,
        location.coords
      )
    } catch (publishErr) {
      // Fallo de red o Firebase: se ignora silenciosamente para reintentar en el siguiente tick
      console.debug(
        '[BackgroundTask] Error de publicación (red/firebase), se intentará de nuevo.'
      )
    }
  } catch (err: any) {
    // Manejo de errores de parsing o lógica interna
    console.error(
      '[BackgroundTask] Error inesperado en ejecución de fondo:',
      err?.message || err
    )
  }
})
