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
