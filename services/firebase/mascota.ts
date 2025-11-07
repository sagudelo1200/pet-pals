import { ServicioCrudBase } from './crud'
import { Mascota } from '../../models/Mascota'
import { CrudResult } from './types'
import { AuthService } from './auth'
import { ERR } from '@/constants'

export class ServicioMascota {
  private static readonly COLLECTION = 'mascotas'

  static async crear(
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
    return ServicioCrudBase.crear<Mascota>(this.COLLECTION, payload)
  }

  static async obtenerPorId(id: string): Promise<CrudResult<Mascota>> {
    return ServicioCrudBase.obtenerPorId<Mascota>(this.COLLECTION, id)
  }

  static async actualizar(
    id: string,
    data: Partial<Omit<Mascota, 'id' | 'creado_en' | 'creado_por'>>
  ): Promise<CrudResult<Mascota>> {
    return ServicioCrudBase.actualizar<Mascota>(this.COLLECTION, id, data)
  }
  static async eliminar(id: string): Promise<CrudResult<boolean>> {
    return ServicioCrudBase.eliminar(this.COLLECTION, id)
  }

  static async obtenerTodos(): Promise<CrudResult<Mascota[]>> {
    return ServicioCrudBase.obtenerTodos<Mascota>(this.COLLECTION)
  }

  // Métodos específicos
  static async obtenerPorUsuario(
    userId: string
  ): Promise<CrudResult<Mascota[]>> {
    return ServicioCrudBase.buscar<Mascota>(
      this.COLLECTION,
      'creado_por',
      userId
    )
  }

  static async obtenerPorTamano(
    tamano: string
  ): Promise<CrudResult<Mascota[]>> {
    return ServicioCrudBase.buscar<Mascota>(this.COLLECTION, 'tamano', tamano)
  }
}
