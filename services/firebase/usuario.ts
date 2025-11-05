import { BaseCrudService } from './crud'
import { Usuario } from '../../models/Usuario'
import { CrudResult } from './types'
import { db } from '@/firebase.config'
import { doc, setDoc } from 'firebase/firestore'
import { nowServerTimestamp, toDb } from './converters'
import { AuthService } from './auth'

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

  /**
   * Crea/actualiza el documento de usuario con ID = uid del usuario autenticado.
   * Requerido por las reglas de seguridad para `usuarios/{uid}`.
   */
  static async createForCurrentUser(
    data: Omit<
      Usuario,
      'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
    >
  ): Promise<CrudResult<Usuario>> {
    try {
      const currentUser = AuthService.getCurrentUser()
      const uid = currentUser?.uid
      if (!uid) return { success: false, error: 'NO_AUTENTICADO' }

      const base = {
        createdAt: nowServerTimestamp(),
        updatedAt: nowServerTimestamp(),
        createdBy: uid,
        updatedBy: uid,
      }

      const ref = doc(db, this.COLLECTION, uid)
      await setDoc(ref, toDb({ ...data, ...base }))

      // Leer de vuelta usando el CRUD para convertir a dominio
      return BaseCrudService.getById<Usuario>(this.COLLECTION, uid)
    } catch (error: any) {
      return { success: false, error: error?.message || 'ERROR_DESCONOCIDO' }
    }
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
