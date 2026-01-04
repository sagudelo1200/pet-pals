export interface Coordenada {
  latitude: number
  longitude: number
}

export function convertirUbicacionRealtime(u: any): Coordenada | null {
  if (!u) return null
  const lat = Number(u.latitud ?? u.latitude ?? u.lat)
  const lng = Number(u.longitud ?? u.longitude ?? u.lng)
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return { latitude: lat, longitude: lng }
}

export function convertirRutaRealtime(
  rutaObj: Record<string, any> | null
): Coordenada[] {
  if (!rutaObj) return []
  return Object.values(rutaObj)
    .map(u => convertirUbicacionRealtime(u))
    .filter((c): c is Coordenada => c !== null)
}
