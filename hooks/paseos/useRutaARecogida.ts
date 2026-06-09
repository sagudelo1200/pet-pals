import { useEffect, useState, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { mapasService } from '@/services/maps'
import type { RutaDireccionamiento, Coordenadas } from '@/services/maps/types'

interface Props {
  paseoId: string
  coordCuidador: Coordenadas | null
  coordRecogida: Coordenadas | null
  habilitado: boolean // true cuando estado === EN_CAMINO
  modo?: 'walking' | 'driving' // Caminando (default) o en vehículo
}

export function useRutaARecogida({
  paseoId,
  coordCuidador,
  coordRecogida,
  habilitado = true,
  modo = 'walking',
}: Props) {
  const [ruta, setRuta] = useState<RutaDireccionamiento | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const yaIntentoRef = useRef(false) // Evitar reintentos mientras habilitado=true

  // Resetear yaIntentoRef cuando cambia modo O cuando cambia habilitado a true
  // Esto asegura que se recalcula al cambiar de modo Y cuando entra EN_CAMINO
  useEffect(() => {
    if (habilitado) {
      yaIntentoRef.current = false
    }
  }, [modo, habilitado])

  // Convertir coordenadas a strings para usarlas como dependencias
  // sin causar renders infinitos
  const coordCuidadorKey = coordCuidador
    ? `${coordCuidador.latitude},${coordCuidador.longitude}`
    : null
  const coordRecogidaKey = coordRecogida
    ? `${coordRecogida.latitude},${coordRecogida.longitude}`
    : null

  useEffect(() => {
    if (!habilitado || !paseoId || !coordCuidador || !coordRecogida) {
      // Si se deshabilita (sale de EN_CAMINO), resetear para próximo intento
      if (!habilitado && yaIntentoRef.current) {
        yaIntentoRef.current = false
      }
      return undefined
    }

    // Si ya intentamos cargar (habilitado seguía true), no reintentar
    if (yaIntentoRef.current) {
      return undefined
    }

    const cacheKey = `ruta_${paseoId}_${modo}`

    const cargarRuta = async () => {
      try {
        // 1. Intentar obtener del AsyncStorage (cache persistente)
        let usarCache = false
        try {
          const cached = await AsyncStorage.getItem(cacheKey)
          if (cached) {
            const data = JSON.parse(cached)
            const ahora = Date.now()
            const tiempoTranscurrido = ahora - (data.timestamp || 0)
            const CACHE_VALIDO_MS = 5 * 60 * 1000 // 5 minutos

            if (tiempoTranscurrido < CACHE_VALIDO_MS) {
              const { timestamp: _timestamp, ...rutaData } = data
              setRuta(rutaData)
              yaIntentoRef.current = true
              usarCache = true
              return
            } else {
              await AsyncStorage.removeItem(cacheKey)
            }
          }
        } catch {
          // Ignorar error de cache y proceder con API call
        }

        if (usarCache) return

        // 2. Llamar a API si no hay cache
        setCargando(true)
        setError(null)

        let nuevaRuta: RutaDireccionamiento | null = null

        try {
          nuevaRuta = await mapasService.obtenerRuta(
            coordCuidador,
            coordRecogida,
            modo
          )
        } catch (err) {
          console.error('[Ruta] Error obteniendo ruta:', err)
          throw err
        }

        if (!nuevaRuta) {
          throw new Error('No se pudo obtener la ruta')
        }

        console.log('[useRutaARecogida] Ruta obtenida exitosamente:', {
          distancia: nuevaRuta.distanciaFormato,
          duracion: nuevaRuta.duracionFormato,
          puntos: nuevaRuta.polyline.length,
        })

        // Guardar en AsyncStorage con timestamp
        try {
          const rutaConTimestamp = {
            ...nuevaRuta,
            timestamp: Date.now(), // Agregar timestamp para saber cuándo se guardó
          }
          await AsyncStorage.setItem(cacheKey, JSON.stringify(rutaConTimestamp))
          console.log(
            '[useRutaARecogida] Ruta guardada en cache (válida por 5 min)'
          )
        } catch {
          // Log silencioso si falla el cache
          console.log('Error cacheando ruta')
        }

        setRuta(nuevaRuta)
        yaIntentoRef.current = true
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'Error desconocido'
        setError(mensaje)
        yaIntentoRef.current = true
      } finally {
        setCargando(false)
      }
    }

    cargarRuta()
  }, [paseoId, habilitado, modo, coordCuidadorKey, coordRecogidaKey]) // Recalcula si cambia modo O cuando llegan coords

  return { ruta, cargando, error }
}
