import { ServicioUbicacion } from '@/services/firebase'
import { Ubicacion } from '@/models/Ubicacion'
import { CrudResult } from '@/services/firebase/comun'
import { validarPayload } from './validaciones'
import { normalizeComponentsForLATAM } from './normalizador'
import { coordsAH3 } from '@/services/geo'

type CrearPayload = Omit<
  Ubicacion,
  'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
>

// Mapeo de códigos de error a claves i18n. Las funciones de este gestor
// devuelven códigos de error (no mensajes) para permitir que la capa UI
// transforme dichos códigos en mensajes localizados.
export const GestorUbicaciones = {
  obtenerClaveI18nErrorUbicacion(error?: string | null) {
    if (!error) return null
    switch (error) {
      case 'PROVEEDOR_INVALIDO':
        return 'ubicaciones:errores.proveedor_invalido'
      case 'PROVEEDOR_O_PLACE_ID_REQUERIDO':
        return 'ubicaciones:errores.proveedor_o_place_id_requerido'
      case 'COORDENADAS_REQUERIDAS':
        return 'ubicaciones:errores.coordenadas_requeridas'
      case 'COORDENADAS_INVALIDAS':
        return 'ubicaciones:errores.coordenadas_invalidas'
      case 'DIRECCION_FORMATO_REQUERIDO':
        return 'ubicaciones:errores.direccion_formato_requerido'
      case 'COMPONENTES_TOO_LARGE':
        return 'ubicaciones:errores.componentes_demasiado_grandes'
      case 'PERMISO_UBICACION_DENEGADO':
        return 'ubicaciones:errores.permiso_denegado'
      case 'GPS_DESACTIVADO':
        return 'ubicaciones:errores.gps_desactivado'
      case 'TIMEOUT_UBICACION':
        return 'ubicaciones:errores.timeout'
      case 'ERROR_UBICACION_DISPOSITIVO':
        return 'ubicaciones:errores.error_dispositivo'
      case 'DIRECCION_NO_ENCONTRADA':
        return 'ubicaciones:errores.direccion_no_encontrada'
      default:
        return null
    }
  },

  async obtenerPorId(id: string): Promise<CrudResult<Ubicacion>> {
    return ServicioUbicacion.obtenerPorId(id)
  },

  async crearSiNoExiste(payload: CrearPayload): Promise<CrudResult<Ubicacion>> {
    try {
      // Validamos el payload; `validarPayload` devuelve un código de error
      // (string) o null. Devolvemos dicho código para que la UI lo mapee.
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
        h3_index: coordsAH3(
          (payload as any).coordenadas.latitude,
          (payload as any).coordenadas.longitude
        ),
      }

      return ServicioUbicacion.crear(dataToSave)
    } catch (err: any) {
      return { success: false, error: String(err) }
    }
  },
}
