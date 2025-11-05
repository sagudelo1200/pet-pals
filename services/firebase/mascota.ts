import { BaseCrudService } from './crud'
import { Mascota } from '../../models/Mascota'
import { CrudResult } from './types'
import { AuthService } from './auth'
import { ERR } from '@/constants'

export class MascotaService {
  private static readonly COLLECTION = 'mascotas'

  static async create(
    data: Omit<
      Mascota,
      'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
    >
  ): Promise<CrudResult<Mascota>> {
    const currentUser = AuthService.getCurrentUser()
    const uid = currentUser?.uid
    if (!uid) {
      return { success: false, error: ERR.NO_AUTENTICADO }
    }

    // Alinear propiedad: id_usuario debe ser el dueño (uid actual)
    if (data.id_usuario && data.id_usuario !== uid) {
      return { success: false, error: ERR.DUENO_NO_COINCIDE }
    }

    // Ensure new mascotas are active by default unless explicitly set otherwise
    const payload = { ...data, id_usuario: uid, activo: data.activo ?? true }
    return BaseCrudService.create<Mascota>(this.COLLECTION, payload)
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
