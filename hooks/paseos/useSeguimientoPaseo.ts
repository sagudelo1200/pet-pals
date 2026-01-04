import { useState, useEffect } from 'react'
import { useTiempoReal } from '../useTiempoReal'
import { RUTAS_REALTIME } from '@/services/firebase'
import { UbicacionRealtime } from '@/models/Ubicacion'
import {
  convertirUbicacionRealtime,
  convertirRutaRealtime,
  Coordenada,
} from '@/services/firebase/comun/realtimeConversores'

/**
 * Hook para seguir la ubicación de un paseo en tiempo real.
 * Proporciona la ubicación actual y el historial de la ruta (polilínea).
 *
 * @param idPaseo - ID del paseo a seguir.
 */
export function useSeguimientoPaseo(idPaseo: string | undefined) {
  // 1. Suscripción a la ubicación actual (marcador en vivo)
  const {
    datos: ubicacionRT,
    cargando: cargandoActual,
    error: errorActual,
  } = useTiempoReal<UbicacionRealtime>(
    idPaseo ? RUTAS_REALTIME.ubicacionActual(idPaseo) : null
  )

  // 2. Suscripción al historial de ruta (polilínea completa)
  // Nota: useTiempoReal devuelve un objeto { key: value } para listas en RTDB
  const { datos: rutaRT, cargando: cargandoRuta } = useTiempoReal<
    Record<string, UbicacionRealtime>
  >(idPaseo ? RUTAS_REALTIME.historialRuta(idPaseo) : null)

  const [ubicacionActual, setUbicacionActual] = useState<Coordenada | null>(
    null
  )
  const [ruta, setRuta] = useState<Coordenada[]>([])

  // Procesar ubicación actual
  useEffect(() => {
    if (ubicacionRT) {
      const c = convertirUbicacionRealtime(ubicacionRT)
      setUbicacionActual(c)
    } else {
      setUbicacionActual(null)
    }
  }, [ubicacionRT])

  // Procesar ruta completa
  useEffect(() => {
    if (rutaRT) {
      const puntos = convertirRutaRealtime(rutaRT)
      setRuta(puntos)
    } else {
      setRuta([])
    }
  }, [rutaRT])

  return {
    ubicacionActual,
    ruta,
    cargando: cargandoActual || cargandoRuta,
    error: errorActual,
  }
}
