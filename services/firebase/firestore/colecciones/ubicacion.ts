import { collection, query, where, getDocs } from 'firebase/firestore'
import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { ServicioTerritorio } from '@/services/territorio'
import { mapFirebaseError, type CrudResult } from '@/services/firebase/comun'
import { Ubicacion } from '@/models/Ubicacion'
import { db } from '@/firebase.config'

/**
 * ServicioUbicacion: CRUD de ubicaciones + enriquecimiento territorial
 *
 * Delega operaciones CRUD básicas a ServicioCrudBase y añade:
 * - Enriquecimiento automático con contexto territorial (H3 R8, R9)
 * - Búsqueda especializada por proveedor de mapas
 */
export class ServicioUbicacion {
  private static readonly COLLECTION = 'ubicaciones'

  /**
   * Obtener ubicación por ID
   * Delegado a ServicioCrudBase (sin cambios de negocio)
   */
  static async obtenerPorId(id: string): Promise<CrudResult<Ubicacion>> {
    return ServicioCrudBase.obtenerPorId<Ubicacion>(this.COLLECTION, id)
  }

  /**
   * Obtener múltiples ubicaciones por IDs
   * Delega cada obtención a obtenerPorId
   */
  static async obtenerPorIds(ids: string[]): Promise<CrudResult<Ubicacion[]>> {
    try {
      const results = await Promise.all(ids.map(id => this.obtenerPorId(id)))
      const found: Ubicacion[] = []
      for (const r of results) {
        if (r.success && r.data) found.push(r.data)
      }
      return { success: true, data: found }
    } catch (err: any) {
      return { success: false, error: mapFirebaseError(err) }
    }
  }

  /**
   * Buscar ubicación por proveedor de mapas (Google Places, etc.)
   * Método especializado: no se generaliza en base CRUD
   */
  static async buscarPorProveedorPlaceId(
    proveedor: Ubicacion['proveedor'],
    proveedor_place_id: string
  ): Promise<CrudResult<Ubicacion | null>> {
    try {
      const col = collection(db, this.COLLECTION)
      const q = query(
        col,
        where('proveedor', '==', proveedor),
        where('proveedor_place_id', '==', proveedor_place_id)
      )
      const snaps = await getDocs(q)
      if (snaps.empty) return { success: true, data: null }

      const snap = snaps.docs[0]
      const domain = { id: snap.id, ...snap.data() } as Ubicacion
      return { success: true, data: domain }
    } catch (err: any) {
      return { success: false, error: mapFirebaseError(err) }
    }
  }

  /**
   * Crear ubicación con enriquecimiento automático de contexto territorial
   *
   * Enriquece el payload con H3 R8 y R9 antes de delegar a ServicioCrudBase.crear()
   * Esto garantiza que TODA ubicación tenga contexto territorial inyectado.
   */
  static async crear(
    payload: Omit<
      Ubicacion,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Ubicacion>> {
    try {
      // 1. Obtener contexto territorial desde coordenadas
      const contexto = ServicioTerritorio.obtenerContextoTerritorial(
        payload.coordenadas.latitude,
        payload.coordenadas.longitude
      )

      // 2. Enriquecer payload con H3 automático
      // Esto es transparente para el caller: la ubicación siempre quedará geotaggeada
      const payloadEnriquecido = {
        proveedor: payload.proveedor,
        proveedor_place_id: payload.proveedor_place_id,
        direccion_formateada: payload.direccion_formateada,
        coordenadas: payload.coordenadas,
        componentes_raw: (payload as any).componentes_raw ?? null,
        componentes: (payload as any).componentes ?? {},
        componentes_source:
          (payload as any).componentes_source ?? payload.proveedor,
        estado: payload.estado ?? 'pendiente',
        viewport: payload.viewport,
        alias: payload.alias,
        instrucciones: payload.instrucciones,
        metadata: (payload as any).metadata,
        h3_r8: contexto.h3_r8, // ← Inyectado automáticamente
        h3_r9: contexto.h3_r9, // ← Inyectado automáticamente
      }

      // 3. Delegar a base CRUD (maneja timestamps, auth, etc.)
      return ServicioCrudBase.crear<Ubicacion>(
        this.COLLECTION,
        payloadEnriquecido
      )
    } catch (err: any) {
      return { success: false, error: mapFirebaseError(err) }
    }
  }
}
