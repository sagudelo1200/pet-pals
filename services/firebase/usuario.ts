import { BaseCrudService } from './crud'
import { Usuario } from '../../models/Usuario'
import { CrudResult } from './types'

export class UsuarioService {
  private static readonly COLLECTION = 'usuarios'

  static async create(
    data: Omit<
      Usuario,
      'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
    >
  ): Promise<CrudResult<Usuario>> {
    return BaseCrudService.create<Usuario>(this.COLLECTION, data)
  }

  static async getById(id: string): Promise<CrudResult<Usuario>> {
    return BaseCrudService.getById<Usuario>(this.COLLECTION, id)
  }

  static async update(
    id: string,
    data: Partial<Omit<Usuario, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<CrudResult<Usuario>> {
    return BaseCrudService.update<Usuario>(this.COLLECTION, id, data)
  }

  static async delete(id: string): Promise<CrudResult<boolean>> {
    return BaseCrudService.delete(this.COLLECTION, id)
  }

  static async getAll(): Promise<CrudResult<Usuario[]>> {
    return BaseCrudService.getAll<Usuario>(this.COLLECTION)
  }

  // Métodos específicos
  static async getByEmail(email: string): Promise<CrudResult<Usuario[]>> {
    return BaseCrudService.getWhere<Usuario>(this.COLLECTION, 'correo', email)
  }

  static async getByEstado(estado: string): Promise<CrudResult<Usuario[]>> {
    return BaseCrudService.getWhere<Usuario>(this.COLLECTION, 'estado', estado)
  }
}
