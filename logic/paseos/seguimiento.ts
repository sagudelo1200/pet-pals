import {
  ServicioRealtime,
  RUTAS_REALTIME,
  ahoraRealtime,
} from '@/services/firebase'
import { UbicacionRealtime } from '@/models/Ubicacion'
import { ESTADOS_PASEO } from '@/models/Paseo'

/**
 * Lógica de negocio para el seguimiento de paseos en tiempo real.
 */
export const GestorSeguimiento = {
  /**
   * Publica la ubicación actual del cuidador y la agrega al historial si corresponde.
   */
  publicarUbicacion: async (
    idPaseo: string,
    estadoPaseo: ESTADOS_PASEO,
    coords: {
      latitude: number
      longitude: number
      speed?: number | null
      heading?: number | null
      accuracy?: number | null
    }
  ) => {
    const payload: UbicacionRealtime = {
      latitud: coords.latitude,
      longitud: coords.longitude,
      velocidad: coords.speed ?? undefined,
      rumbo: coords.heading ?? undefined,
      precision: coords.accuracy ?? undefined,
      actualizado_en: ahoraRealtime(),
    }

    // 1. Actualizar la ubicación actual (sobrescribir para el marcador en vivo)
    await ServicioRealtime.guardar(
      RUTAS_REALTIME.ubicacionActual(idPaseo),
      payload
    )

    // 2. Agregar al historial de la ruta (solo si el paseo está en progreso)
    if (estadoPaseo === ESTADOS_PASEO.EN_PROGRESO) {
      await ServicioRealtime.agregarLista(
        RUTAS_REALTIME.historialRuta(idPaseo),
        payload
      )
    }
  },
}
