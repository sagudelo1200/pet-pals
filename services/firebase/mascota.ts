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
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Mascota>> {
    const currentUser = AuthService.getCurrentUser()
    const uid = currentUser?.uid
    if (!uid) {
      return { success: false, error: ERR.NO_AUTENTICADO }
    }

    // Alinear propiedad de ownership: creado_por debe ser el dueño (uid actual)
    if ((data as any).creado_por && (data as any).creado_por !== uid) {
      return { success: false, error: ERR.DUENO_NO_COINCIDE }
    }

    // Ensure new mascotas are active by default unless explicitly set otherwise
    const payload = { ...data, creado_por: uid, activo: data.activo ?? true }
    return BaseCrudService.create<Mascota>(this.COLLECTION, payload)
  }

  static async getById(id: string): Promise<CrudResult<Mascota>> {
    return BaseCrudService.getById<Mascota>(this.COLLECTION, id)
  }

  static async update(
    id: string,
    data: Partial<Omit<Mascota, 'id' | 'creado_en' | 'creado_por'>>
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
      'creado_por',
      userId
    )
  }

  static async getByTamano(tamano: string): Promise<CrudResult<Mascota[]>> {
    return BaseCrudService.getWhere<Mascota>(this.COLLECTION, 'tamano', tamano)
  }
}
