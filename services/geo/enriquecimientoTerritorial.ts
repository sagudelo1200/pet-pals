/**
 * Servicios de enriquecimiento territorial con APIs públicas gratuitas
 *
 * APIs usadas:
 * - Open-Elevation: https://api.open-elevation.com (topografía, sin límites duros)
 * - Open-Meteo: https://api.open-meteo.com (clima, 10k req/día free)
 * - Nominatim: https://nominatim.openstreetmap.org (reverse geocoding, libre)
 *
 * Cache: En memoria local (Map) + validación TTL (30 min por defecto)
 */

import type { CapaContextoTerritorial } from '@/models/Paseo'

/**
 * Cache en memoria para evitar rate limiting
 * Clave: "lat,lng" o "tipoCoordenada"
 */
const cacheElevacion = new Map<
  string,
  { elevacion: number; pendiente: number; timestamp: number }
>()
const cacheClima = new Map<
  string,
  {
    clima_actual: string
    temperatura_c: number
    precipitacion_mm: number
    timestamp: number
  }
>()
const cacheDireccion = new Map<
  string,
  { nombre_ubicacion: string; nombre_barrio: string; timestamp: number }
>()

const TTL_CACHE_MS = 30 * 60 * 1000 // 30 minutos (elevacion y direccion)
const TTL_CACHE_CLIMA_MS = 5 * 60 * 1000 // 5 minutos para clima (más fresco)
const UMBRAL_PRECIPITACION_MM = 1.0 // umbral (mm) para considerar que realmente está lloviendo; subido para evitar falsos positivos por llovizna

/**
 * Obtiene elevación desde Open-Elevation API
 * @returns {elevacion_metros, pendiente_grados} o null si falla
 */
export async function fetchElevacion(
  lat: number,
  lng: number
): Promise<{ elevacion: number; pendiente: number } | null> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const cached = cacheElevacion.get(cacheKey)

  // Validar cache
  if (cached && Date.now() - cached.timestamp < TTL_CACHE_MS) {
    return { elevacion: cached.elevacion, pendiente: cached.pendiente }
  }

  try {
    const response = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`
    )

    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = (await response.json()) as any
    const result = data.results?.[0]

    if (!result) return null

    const elevacion = result.elevation || 0

    // Estimar pendiente como 0 (simplificado; en real usarías puntos cercanos)
    const pendiente = 0

    cacheElevacion.set(cacheKey, {
      elevacion,
      pendiente,
      timestamp: Date.now(),
    })

    return { elevacion, pendiente }
  } catch (error) {
    console.warn('[fetchElevacion] Error:', error)
    return null
  }
}

/**
 * Obtiene clima actual desde Open-Meteo API
 * @returns {clima_actual, temperatura_c, precipitacion_mm} o null si falla
 */
export async function fetchClima(
  lat: number,
  lng: number
): Promise<{
  clima_actual: string
  temperatura_c: number
  precipitacion_mm: number
} | null> {
  // Usar resolución más fina para clima y TTL más corto
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`
  const cached = cacheClima.get(cacheKey)

  // Validar cache específica para clima
  if (cached && Date.now() - cached.timestamp < TTL_CACHE_CLIMA_MS) {
    return {
      clima_actual: cached.clima_actual,
      temperatura_c: cached.temperatura_c,
      precipitacion_mm: cached.precipitacion_mm,
    }
  }

  try {
    // Pedimos current_weather y hourly.precipitation para obtener valor puntual
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=precipitation&temperature_unit=celsius&timezone=auto`
    const response = await fetch(url)

    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = (await response.json()) as any

    // Preferir current_weather cuando esté disponible
    const current = data.current_weather || data.current

    if (!current) return null

    const weatherCode = current.weathercode ?? current.weather_code ?? 0
    let clima_actual = mapWmoToDireccion(Number(weatherCode))

    // temperatura: preferir campo de current_weather
    const temperatura_c = current.temperature ?? current.temperature_2m ?? 0

    // Obtener precipitacion puntual buscando hora actual en hourly (si existe)
    let precipitacion_mm = 0
    try {
      if (
        data.hourly &&
        Array.isArray(data.hourly.time) &&
        Array.isArray(data.hourly.precipitation)
      ) {
        const times: string[] = data.hourly.time
        const prec: number[] = data.hourly.precipitation
        const currentTime = (
          current.time ||
          current.datetime ||
          new Date().toISOString()
        ).slice(0, 19)
        // Buscar índice exacto o aproximado (fecha ISO)
        let idx = times.indexOf(current.time)
        if (idx === -1) {
          // intentar buscar por hora (HH:MM)
          const currentHour = new Date(current.time || Date.now())
            .toISOString()
            .slice(0, 13)
          idx = times.findIndex(t => t.slice(0, 13) === currentHour)
        }
        if (idx >= 0) precipitacion_mm = Number(prec[idx] ?? 0)
      } else if (
        data.current &&
        typeof data.current.precipitation === 'number'
      ) {
        precipitacion_mm = data.current.precipitation
      }
    } catch (err) {
      console.warn('[fetchClima] Error extrayendo precipitacion hourly:', err)
    }

    // Consistencia: validar precipitacion junto con codigo meteorologico
    if (
      precipitacion_mm >= UMBRAL_PRECIPITACION_MM &&
      clima_actual !== 'lluvia'
    ) {
      console.warn(
        '[fetchClima] Consistencia clima: forzando "lluvia"; weathercode=',
        weatherCode,
        'precipitacion_mm=',
        precipitacion_mm
      )
      clima_actual = 'lluvia'
    } else {
      // Si la precipitacion es baja (< UMBRAL) pero existe, no forzamos 'lluvia'
      if (precipitacion_mm > 0 && precipitacion_mm < UMBRAL_PRECIPITACION_MM) {
        console.info(
          '[fetchClima] Precipitacion baja detectada; no se fuerza "lluvia"; weathercode=',
          weatherCode,
          'precipitacion_mm=',
          precipitacion_mm
        )
      }
    }

    cacheClima.set(cacheKey, {
      clima_actual,
      temperatura_c,
      precipitacion_mm,
      timestamp: Date.now(),
    })

    return { clima_actual, temperatura_c, precipitacion_mm }
  } catch (error) {
    console.warn('[fetchClima] Error al obtener clima:', error)
    return null
  }
}

/**
 * Mapea códigos WMO a descripción simple
 * https://open-meteo.com/en/docs
 */
function mapWmoToDireccion(code: number): string {
  if (code === 0 || code === 1) return 'soleado'
  if (code === 2) return 'mixto'
  if (code === 3) return 'nublado'
  if (code >= 45 && code <= 48) return 'nublado' // Niebla
  if (code >= 51 && code <= 67) return 'llovizna'
  if (code >= 71 && code <= 77) return 'nieve'
  if (code >= 80 && code <= 82) return 'lluvia'
  if (code >= 85 && code <= 86) return 'nieve'
  if (code >= 90 && code <= 99) return 'lluvia' // Tormenta

  return 'desconocido'
}

/**
 * Obtiene nombre de ubicación/calle desde Nominatim OSM (reverse geocoding)
 * @returns {nombre_ubicacion, nombre_barrio} o null si falla
 */
export async function fetchDireccion(
  lat: number,
  lng: number
): Promise<{ nombre_ubicacion: string; nombre_barrio: string } | null> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const cached = cacheDireccion.get(cacheKey)

  // Validar cache
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      nombre_ubicacion: cached.nombre_ubicacion,
      nombre_barrio: cached.nombre_barrio,
    }
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'Accept-Language': 'es',
          'User-Agent':
            'Paw-Path/1.0 (https://paw-path.com.co; info@paw-path.com.co)',
        },
      }
    )

    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = (await response.json()) as any

    // Extraer información de la dirección
    const address = data.address || {}
    let nombre_ubicacion = address.road || address.pedestrian || 'Desconocido'
    let nombre_barrio =
      address.neighbourhood || address.suburb || address.town || 'Desconocido'

    // Si Nominatim no entrega resultados claros y hay API Key de Google, intentar fallback
    if (
      (nombre_ubicacion === 'Desconocido' || nombre_barrio === 'Desconocido') &&
      process.env.GOOGLE_GEOCODING_API_KEY
    ) {
      try {
        const key = process.env.GOOGLE_GEOCODING_API_KEY
        const gResp = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}&language=es`
        )
        if (gResp.ok) {
          const gData = await gResp.json()
          const first = gData.results && gData.results[0]
          if (first) {
            const comps = first.address_components || []
            const route = comps.find((c: any) => c.types.includes('route'))
            const neighborhood = comps.find(
              (c: any) =>
                c.types.includes('neighborhood') ||
                c.types.includes('sublocality') ||
                c.types.includes('locality')
            )
            if (route && route.long_name) nombre_ubicacion = route.long_name
            if (neighborhood && neighborhood.long_name)
              nombre_barrio = neighborhood.long_name
            console.warn(
              '[fetchDireccion] Fallback Google Geocoding usado para mejores resultados'
            )
          }
        }
      } catch (gErr) {
        console.warn('[fetchDireccion] Error fallback Google Geocoding:', gErr)
      }
    }

    cacheDireccion.set(cacheKey, {
      nombre_ubicacion,
      nombre_barrio,
      timestamp: Date.now(),
    })

    return { nombre_ubicacion, nombre_barrio }
  } catch (error) {
    console.warn('[fetchDireccion] Error al obtener dirección:', error)
    return null
  }
}

/**
 * Enriquecimiento completo: llama todas las APIs con caché
 * Ejecuta en paralelo para minimizar latencia
 */
export async function enriquecerContextoConAPIs(
  lat: number,
  lng: number
): Promise<Partial<CapaContextoTerritorial>> {
  const resultado: Partial<CapaContextoTerritorial> = {}

  try {
    // Paralelo: ejecutar todas las promesas
    const elevacionProm = fetchElevacion(lat, lng).catch((): any => null)
    const climaProm = fetchClima(lat, lng).catch((): any => null)
    const direccionProm = fetchDireccion(lat, lng).catch((): any => null)

    const [elevacionRes, climaRes, direccionRes] = await Promise.all([
      elevacionProm,
      climaProm,
      direccionProm,
    ])

    // Procesar resultados (cada uno puede ser null si falló)
    if (elevacionRes) {
      resultado.elevacion_metros = elevacionRes.elevacion
      resultado.pendiente_grados = elevacionRes.pendiente
    }

    if (climaRes) {
      resultado.clima_actual = climaRes.clima_actual
      resultado.temperatura_c = climaRes.temperatura_c
      resultado.precipitacion_mm = climaRes.precipitacion_mm
    }

    if (direccionRes) {
      resultado.nombre_ubicacion = direccionRes.nombre_ubicacion
      resultado.nombre_barrio = direccionRes.nombre_barrio
    }
  } catch (error) {
    console.warn('[enriquecerContextoConAPIs] Error general:', error)
  }

  return resultado
}

/**
 * Limpia caché (para testing o cuando lo necesites)
 */
export function limpiarCacheEnriquecimiento() {
  cacheElevacion.clear()
  cacheClima.clear()
  cacheDireccion.clear()
}
