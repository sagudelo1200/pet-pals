import { BaseCrudService } from './crud'
import { Usuario } from '../../models/Usuario'
import { CrudResult } from './types'
import { db } from '@/firebase.config'
import { doc, setDoc } from 'firebase/firestore'
import { toDb } from './converters'
import { AuthService } from './auth'
import { ERR } from '@/constants'
import { mapFirebaseError } from './errors'

export class UsuarioService {
  private static readonly COLLECTION = 'usuarios'

  static async create(
    data: Omit<
      Usuario,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
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
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Usuario>> {
    try {
      const currentUser = AuthService.getCurrentUser()
      const uid = currentUser?.uid
      if (!uid) return { success: false, error: ERR.NO_AUTENTICADO }

      const base = {
        // use client timestamp here to satisfy security rules that expect a
        // timestamp value (some environments send serverTimestamp sentinel
        // which may be rejected by strict rules). Using Date ensures the
        // request.resource contains an actual timestamp.
        creado_en: new Date(),
        actualizado_en: new Date(),
        creado_por: uid,
        actualizado_por: uid,
      }

      const ref = doc(db, this.COLLECTION, uid)
      await setDoc(ref, toDb({ ...data, ...base }))

      // Leer de vuelta usando el CRUD para convertir a dominio
      return BaseCrudService.getById<Usuario>(this.COLLECTION, uid)
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.code === 'permission-denied'
            ? ERR.PERMISOS_INSUFICIENTES
            : error?.code === 'unauthenticated'
              ? ERR.NO_AUTENTICADO
              : ERR.ERROR_DESCONOCIDO,
      }
    }
  }

  /**
   * Crear documento de usuario usando un UID explícito.
   * Útil como fallback justo después de registro cuando `auth.currentUser` puede
   * no estar todavía disponible en algunos entornos.
   */
  static async createWithUid(
    uid: string,
    data: Omit<
      Usuario,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Usuario>> {
    try {
      const base = {
        // use client timestamp as above for consistency with security rules
        creado_en: new Date(),
        actualizado_en: new Date(),
        creado_por: uid,
        actualizado_por: uid,
      }

      const ref = doc(db, this.COLLECTION, uid)
      await setDoc(ref, toDb({ ...data, ...base }))

      return BaseCrudService.getById<Usuario>(this.COLLECTION, uid)
    } catch (error: any) {
      return {
        success: false,
        error: mapFirebaseError(error),
      }
    }
  }

  static async getById(id: string): Promise<CrudResult<Usuario>> {
    return BaseCrudService.getById<Usuario>(this.COLLECTION, id)
  }

  static async update(
    id: string,
    data: Partial<Omit<Usuario, 'id' | 'creado_en' | 'creado_por'>>
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
