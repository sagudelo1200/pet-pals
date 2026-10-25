/**
 * Celda de cobertura (R8) de la dirección principal de una persona. La usan el
 * perfil del cuidador, su mapa de cobertura y el aviso de si se atiende su zona.
 */
import { coordsAH3 } from '@/services/geo/h3Utils'
import type { UbicacionRef } from '@/models/Ubicacion'

/**
 * @param usuario Sus ubicaciones y cuál es la principal.
 * @returns La celda guardada con la ubicación o, si falta (datos viejos), la de
 *   sus coordenadas; null si no tiene dirección principal.
 */
export function celdaPrincipalDe(
  usuario?: {
    ubicaciones?: UbicacionRef[]
    id_ubicacion_principal?: string
  } | null
): string | null {
  const ubicaciones = usuario?.ubicaciones ?? []
  const principal =
    ubicaciones.find(u => u.es_principal) ??
    ubicaciones.find(u => u.ubicacion_id === usuario?.id_ubicacion_principal)
  if (principal?.h3_r8) return principal.h3_r8
  if (!principal?.coordenadas) return null
  return coordsAH3(principal.coordenadas.latitude, principal.coordenadas.longitude)
}
