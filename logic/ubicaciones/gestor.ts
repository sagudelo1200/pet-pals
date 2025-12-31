import { ServicioUbicacion } from '@/services/firebase'
import { Ubicacion } from '@/models/Ubicacion'
import { CrudResult } from '@/services/firebase/comun'
import { validarPayload } from './validaciones'
import { normalizeComponentsForLATAM } from '@/helpers/ubicacion'

type CrearPayload = Omit<
  Ubicacion,
  'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
>

export async function crearSiNoExiste(
  payload: CrearPayload
): Promise<CrudResult<Ubicacion>> {
  try {
    console.log('Crear ubicacion si no existe, payload:', payload)
    const validationError = validarPayload(payload)
    if (validationError) return { success: false, error: validationError }

    const existente = await ServicioUbicacion.buscarPorProveedorPlaceId(
      payload.proveedor,
      payload.proveedor_place_id
    )
    if (existente.success && existente.data)
      return { success: true, data: existente.data }

    const rawComponents: any =
      (payload as any).componentes_raw ?? (payload as any).componentes ?? null
    let componentes_raw_to_store: any = rawComponents
    if (Array.isArray(rawComponents)) {
      const map: Record<string, any> = {}
      for (const item of rawComponents) {
        const name = item.long_name ?? item.short_name
        if (!item.types) continue
        for (const t of item.types) {
          if (!map[t]) map[t] = name
        }
      }
      componentes_raw_to_store = map
    }

    const componentes_normalized = normalizeComponentsForLATAM(
      componentes_raw_to_store
    )

    const dataToSave: any = {
      proveedor: payload.proveedor,
      proveedor_place_id: payload.proveedor_place_id,
      direccion_formateada: payload.direccion_formateada,
      // coordenadas: must be plain lat/lng object here; service will convert to GeoPoint
      coordenadas: (payload as any).coordenadas,
      componentes_raw: componentes_raw_to_store ?? null,
      componentes: componentes_normalized ?? {},
      viewport: payload.viewport ?? null,
      alias: payload.alias ?? null,
      instrucciones: payload.instrucciones ?? null,
      metadata: payload.metadata ?? null,
      componentes_source:
        (payload as any).componentes_source ?? payload.proveedor,
      estado: payload.estado ?? 'pendiente',
    }

    return ServicioUbicacion.crear(dataToSave)
  } catch (err: any) {
    return { success: false, error: String(err) }
  }
}
