import { Ubicacion } from '@/models/Ubicacion'
import { esCoordenadaValida } from '@/helpers/ubicacion'

export function validarPayload(
  payload: Omit<
    Ubicacion,
    'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
  >
): string | null {
  const proveedoresSoportados = ['google', 'mapbox']
  if (!payload.proveedor || !proveedoresSoportados.includes(payload.proveedor))
    return 'PROVEEDOR_INVALIDO'

  if (
    !payload.proveedor_place_id ||
    String(payload.proveedor_place_id).trim() === ''
  )
    return 'PROVEEDOR_O_PLACE_ID_REQUERIDO'

  if (!payload.coordenadas) return 'COORDENADAS_REQUERIDAS'
  if (!esCoordenadaValida(payload.coordenadas)) return 'COORDENADAS_INVALIDAS'

  if (
    !payload.direccion_formateada ||
    String(payload.direccion_formateada).trim() === ''
  )
    return 'DIRECCION_FORMATO_REQUERIDO'

  const raw = (payload as any).componentes_raw ?? (payload as any).componentes
  if (Array.isArray(raw) && raw.length > 200) return 'COMPONENTES_TOO_LARGE'

  return null
}
