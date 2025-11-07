import { ServicioCrudBase } from './crud'
import { Usuario } from '../../models/Usuario'
import { CrudResult } from './types'
import { db } from '@/firebase.config'
import { doc, setDoc } from 'firebase/firestore'
import { toDb, nowServerTimestamp } from './converters'
// AuthService removed: profile creation should happen at registration via AuthService
import { mapFirebaseError } from './errors'

export class ServicioUsuario {
  private static readonly COLLECTION = 'usuarios'

  static async crear(
    data: Omit<
      Usuario,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Usuario>> {
    return ServicioCrudBase.crear<Usuario>(this.COLLECTION, data)
  }

  // Nota: la creación del documento `usuarios/{uid}` se realiza ahora
  // durante el flujo de registro en `AuthService.registerWithEmail`.

  /**
   * Crear documento de usuario usando un UID explícito.
   * Útil como fallback justo después de registro cuando `auth.currentUser` puede
   * no estar todavía disponible en algunos entornos.
   */
  static async crearConUid(
    uid: string,
    data: Omit<
      Usuario,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Usuario>> {
    try {
      // Build base system fields. If caller provided `fecha_registro` we
      // respect it (it will be converted by toDb). Otherwise, set it to
      // serverTimestamp sentinel so the server assigns the registration time.
      const base: any = {
        creado_en: nowServerTimestamp(),
        actualizado_en: nowServerTimestamp(),
        creado_por: uid,
        actualizado_por: uid,
      }
      if (!(data as any).fecha_registro) {
        base.fecha_registro = nowServerTimestamp()
      }

      const ref = doc(db, this.COLLECTION, uid)
      // Important: do not run `toDb` over `base` because it contains
      // serverTimestamp() sentinels which must be written as-is.
      await setDoc(ref, { ...toDb(data), ...base })

      return ServicioCrudBase.obtenerPorId<Usuario>(this.COLLECTION, uid)
    } catch (error: any) {
      return {
        success: false,
        error: mapFirebaseError(error),
      }
    }
  }

  static async obtenerPorId(id: string): Promise<CrudResult<Usuario>> {
    return ServicioCrudBase.obtenerPorId<Usuario>(this.COLLECTION, id)
  }

  static async actualizar(
    id: string,
    data: Partial<Omit<Usuario, 'id' | 'creado_en' | 'creado_por'>>
  ): Promise<CrudResult<Usuario>> {
    return ServicioCrudBase.actualizar<Usuario>(this.COLLECTION, id, data)
  }
  static async eliminar(id: string): Promise<CrudResult<boolean>> {
    return ServicioCrudBase.eliminar(this.COLLECTION, id)
  }

  static async obtenerTodos(): Promise<CrudResult<Usuario[]>> {
    return ServicioCrudBase.obtenerTodos<Usuario>(this.COLLECTION)
  }

  // Métodos específicos
  static async obtenerPorCorreo(email: string): Promise<CrudResult<Usuario[]>> {
    return ServicioCrudBase.buscar<Usuario>(this.COLLECTION, 'correo', email)
  }

  static async obtenerPorEstado(
    estado: string
  ): Promise<CrudResult<Usuario[]>> {
    return ServicioCrudBase.buscar<Usuario>(this.COLLECTION, 'estado', estado)
  }
}
