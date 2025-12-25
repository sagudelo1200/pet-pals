import { GeoPoint } from 'firebase/firestore'

export function geoPointToCoords(gp: any) {
  if (!gp) return undefined
  if (gp.latitude !== undefined && gp.longitude !== undefined)
    return { latitude: gp.latitude, longitude: gp.longitude }
  if (gp.lat !== undefined && gp.lng !== undefined)
    return { latitude: gp.lat, longitude: gp.lng }
  return undefined
}

export function coordsToGeoPoint(
  coords:
    | { latitude?: number; longitude?: number }
    | { lat?: number; lng?: number }
) {
  const lat = (coords as any).latitude ?? (coords as any).lat
  const lng = (coords as any).longitude ?? (coords as any).lng
  return new GeoPoint(lat || 0, lng || 0)
}

export function esCoordenadaValida(
  c?: { lat?: number; lng?: number } | { latitude?: number; longitude?: number }
) {
  if (!c) return false
  const lat = (c as any).latitude ?? (c as any).lat
  const lng = (c as any).longitude ?? (c as any).lng
  if (typeof lat !== 'number' || typeof lng !== 'number') return false
  if (lat < -90 || lat > 90) return false
  if (lng < -180 || lng > 180) return false
  return true
}

/** Normalizaciones simples para LATAM/Colombia */
export function normalizeComponentsForLATAM(
  components: Record<string, any> | undefined
) {
  if (!components) return {}
  return {
    pais: components.pais || components.country || undefined,
    departamento:
      components.departamento ||
      components.administrative_area_level_1 ||
      undefined,
    ciudad: components.ciudad || components.locality || undefined,
    localidad: components.localidad || components.sublocality || undefined,
    barrio: components.barrio || components.neighborhood || undefined,
    codigo_postal:
      components.codigo_postal || components.postal_code || undefined,
    ruta: components.ruta || components.route || undefined,
    numero: components.numero || components.street_number || undefined,
  }
}
