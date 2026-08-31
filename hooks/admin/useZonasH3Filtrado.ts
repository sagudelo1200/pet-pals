import { useEffect, useState } from 'react'
import {
  ServicioZonasH3,
  type ZonaH3,
} from '@/services/firebase/firestore/colecciones/h3_zonas'

export function useZonasH3Filtrado() {
  const [todasLasZonas, setTodasLasZonas] = useState<ZonaH3[]>([])
  const [ciudades, setCiudades] = useState<string[]>([])
  const [ciudadSeleccionada, setCiudadSeleccionada] = useState<string>('')
  const [zonas, setZonas] = useState<ZonaH3[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Suscripción inicial a todas las zonas
  useEffect(() => {
    console.log('[useZonasH3Filtrado] 🔄 Iniciando suscripción a zonas...')
    const cancelar = ServicioZonasH3.suscribirATodas(
      nuevasZonas => {
        console.log(
          '[useZonasH3Filtrado] ✅ Zonas recibidas:',
          nuevasZonas.length
        )

        // Guardar todas las zonas
        setTodasLasZonas(nuevasZonas)

        // Detectar ciudades únicas (autodetección)
        const ciudadesDetectadas = Array.from(
          new Set(
            nuevasZonas
              .map(z => z.ciudad || 'sin_ciudad')
              .filter(c => c !== 'sin_ciudad')
          )
        ).sort()

        if (ciudadesDetectadas.length === 0) {
          // Si no hay ciudades, usar "sin_ciudad" como placeholder
          setCiudades(['sin_ciudad'])
          setCiudadSeleccionada('sin_ciudad')
        } else {
          setCiudades(ciudadesDetectadas)
          // Seleccionar la primera ciudad automáticamente
          if (
            !ciudadSeleccionada ||
            !ciudadesDetectadas.includes(ciudadSeleccionada)
          ) {
            setCiudadSeleccionada(ciudadesDetectadas[0])
          }
        }

        setCargando(false)
      },
      err => {
        console.error('[useZonasH3Filtrado] ❌ Error en suscripción:', err)
        setError(err.message)
        setCargando(false)
      }
    )

    return cancelar
  }, [])

  // Filtrar zonas según ciudad seleccionada
  useEffect(() => {
    if (ciudadSeleccionada && ciudadSeleccionada !== 'sin_ciudad') {
      const zonasFiltradas = todasLasZonas.filter(
        z => z.ciudad === ciudadSeleccionada
      )
      console.log(
        `[useZonasH3Filtrado] 🎯 Filtradas para ${ciudadSeleccionada}:`,
        zonasFiltradas.length
      )
      setZonas(zonasFiltradas)
    } else {
      // Si no hay ciudad válida, mostrar todas
      setZonas(todasLasZonas)
    }
  }, [ciudadSeleccionada, todasLasZonas])

  return {
    zonas,
    ciudades,
    ciudadSeleccionada,
    setCiudadSeleccionada,
    cargando,
    error,
    totalZonas: todasLasZonas.length,
  }
}
