import { BaseCrudService } from './crud'
import { Mascota } from '../../models/Mascota'
import { CrudResult } from './types'

export class MascotaService {
  private static readonly COLLECTION = 'mascotas'

  static async create(
    data: Omit<
      Mascota,
      'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
    >
  ): Promise<CrudResult<Mascota>> {
    return BaseCrudService.create<Mascota>(this.COLLECTION, data)
  }

  static async getById(id: string): Promise<CrudResult<Mascota>> {
    return BaseCrudService.getById<Mascota>(this.COLLECTION, id)
  }

  static async update(
    id: string,
    data: Partial<Omit<Mascota, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<CrudResult<Mascota>> {
    return BaseCrudService.update<Mascota>(this.COLLECTION, id, data)
  }

  static async delete(id: string): Promise<CrudResult<boolean>> {
    return BaseCrudService.delete(this.COLLECTION, id)
  }

  static async getAll(): Promise<CrudResult<Mascota[]>> {
    return BaseCrudService.getAll<Mascota>(this.COLLECTION)
  }

  // Métodos específicos
  static async getByUsuario(userId: string): Promise<CrudResult<Mascota[]>> {
    return BaseCrudService.getWhere<Mascota>(
      this.COLLECTION,
      'id_usuario',
      userId
    )
  }

  static async getByTamano(tamano: string): Promise<CrudResult<Mascota[]>> {
    return BaseCrudService.getWhere<Mascota>(this.COLLECTION, 'tamano', tamano)
  }
}
