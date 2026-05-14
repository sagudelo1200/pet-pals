import { latLngToCell, gridDisk, cellToLatLng } from 'h3-js'

// Resolución estándar: nivel 8 ≈ celdas de ~460m de radio, idóneo para paseos urbanos
export const RESOLUCION_H3_DEFAULT = 8
// Radio de cobertura: gridDisk(k=2) = 19 celdas ≈ 2 km de cobertura efectiva
export const RADIO_COBERTURA_DEFAULT = 2

/** Estado operativo de una zona H3 */
export type EstadoZona =
  | 'sin_actividad' // Sin cuidadores ni demanda — zona durmiente
  | 'disponible' // Cuidadores registrados, sin solicitudes pendientes
  | 'sin_cobertura' // Hay demanda pero ningún cuidador en la zona
  | 'activa' // Cuidadores y demanda presentes, sin paseo en curso
  | 'en_operacion' // Hay al menos un paseo activo en este momento

export interface CoordenadaGeo {
  latitude: number
  longitude: number
}

/**
 * Convierte coordenadas geográficas a un índice H3.
 * Usa resolución 8 por defecto (≈460m de radio por celda).
 */
export function coordsAH3(
  latitud: number,
  longitud: number,
  resolucion = RESOLUCION_H3_DEFAULT
): string {
  return latLngToCell(latitud, longitud, resolucion)
}

/**
 * Devuelve las celdas H3 que componen el área de cobertura de un walker.
 * Con radio=2: 19 celdas que cubren ≈2 km alrededor del origen.
 */
export function celdasDeCobertura(
  indiceCelda: string,
  radio = RADIO_COBERTURA_DEFAULT
): string[] {
  return gridDisk(indiceCelda, radio)
}

/**
 * Distancia en kilómetros entre los centros de dos celdas H3.
 */
export function distanciaKmEntreH3(celdaA: string, celdaB: string): number {
  const [latA, lonA] = cellToLatLng(celdaA)
  const [latB, lonB] = cellToLatLng(celdaB)
  return (
    haversineMetros(
      { latitude: latA, longitude: lonA },
      { latitude: latB, longitude: lonB }
    ) / 1000
  )
}

/**
 * Distancia en metros entre dos coordenadas usando la fórmula Haversine.
 * Función pura extraída de ControlPaseo y PaseoActivo para eliminar duplicación.
 */
export function haversineMetros(a: CoordenadaGeo, b: CoordenadaGeo): number {
  const R = 6371000
  const aRad = (v: number) => (v * Math.PI) / 180
  const dLat = aRad(b.latitude - a.latitude)
  const dLon = aRad(b.longitude - a.longitude)
  const lat1 = aRad(a.latitude)
  const lat2 = aRad(b.latitude)
  const sinDlat = Math.sin(dLat / 2)
  const sinDlon = Math.sin(dLon / 2)
  const q =
    sinDlat * sinDlat + sinDlon * sinDlon * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q))
  return R * c
}

function interpolarSegmento(
  a: CoordenadaGeo,
  b: CoordenadaGeo,
  separacionMetros = 8
): CoordenadaGeo[] {
  const d = haversineMetros(a, b)
  const pasos = Math.min(Math.ceil(d / separacionMetros), 20)
  const puntos: CoordenadaGeo[] = []
  for (let i = 1; i <= pasos; i++) {
    const t = i / (pasos + 1)
    puntos.push({
      latitude: a.latitude + (b.latitude - a.latitude) * t,
      longitude: a.longitude + (b.longitude - a.longitude) * t,
    })
  }
  return puntos
}

/**
 * Densifica una ruta insertando puntos intermedios entre cada par de coordenadas.
 * Reduce los saltos visuales en la polyline del mapa durante el paseo.
 */
export function densificarRuta(ruta: CoordenadaGeo[]): CoordenadaGeo[] {
  if (!ruta || ruta.length < 2) return ruta
  const resultado: CoordenadaGeo[] = [ruta[0]]
  for (let i = 1; i < ruta.length; i++) {
    const intermedios = interpolarSegmento(ruta[i - 1], ruta[i])
    resultado.push(...intermedios)
    resultado.push(ruta[i])
  }
  return resultado
}

/**
 * Calcula el estado operativo de una zona a partir de sus contadores.
 * Usado para escribir el campo `estado` en `/h3_zonas/{celda}`.
 */
export function calcularEstadoZona(zona: {
  cuidadores_count: number
  demanda_total: number
  paseos_activos: number
}): EstadoZona {
  if (zona.paseos_activos > 0) return 'en_operacion'
  if (zona.cuidadores_count === 0 && zona.demanda_total === 0)
    return 'sin_actividad'
  if (zona.cuidadores_count === 0 && zona.demanda_total > 0)
    return 'sin_cobertura'
  if (zona.cuidadores_count > 0 && zona.demanda_total === 0) return 'disponible'
  return 'activa'
}
