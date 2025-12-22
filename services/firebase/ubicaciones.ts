import { ServicioCrudBase } from './crud'
import { Ubicacion } from '@/models/Ubicacion'
import { CrudResult } from './types'

export class ServicioUbicaciones {
  private static readonly COLLECTION = 'ubicaciones'

  static async crear(
    data: Omit<
      Ubicacion,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Ubicacion>> {
    return ServicioCrudBase.crear<Ubicacion>(this.COLLECTION, data)
  }

  static async obtenerPorId(id: string): Promise<CrudResult<Ubicacion>> {
    return ServicioCrudBase.obtenerPorId<Ubicacion>(this.COLLECTION, id)
  }

  static async actualizar(
    id: string,
    data: Partial<Ubicacion>
  ): Promise<CrudResult<Ubicacion>> {
    return ServicioCrudBase.actualizar<Ubicacion>(this.COLLECTION, id, data)
  }

  static async eliminar(id: string): Promise<CrudResult<boolean>> {
    return ServicioCrudBase.eliminar(this.COLLECTION, id)
  }
}
