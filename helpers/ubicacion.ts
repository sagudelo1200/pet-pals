import { GeoPoint } from 'firebase/firestore'

export function geoPointToCoords(gp: any) {
  if (!gp) return undefined
  if (gp.latitude !== undefined && gp.longitude !== undefined)
    return { lat: gp.latitude, lng: gp.longitude }
  return undefined
}

export function coordsToGeoPoint(coords: { lat: number; lng: number }) {
  return new GeoPoint(coords.lat, coords.lng)
}

export function esCoordenadaValida(c?: { lat?: number; lng?: number }) {
  if (!c) return false
  const { lat, lng } = c as any
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
