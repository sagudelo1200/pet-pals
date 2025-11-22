import { ServicioCrudBase } from './crud'
import { Usuario } from '../../models/Usuario'
import { CrudResult } from './types'
import { db } from '@/firebase.config'
import { doc, setDoc } from 'firebase/firestore'
import { toDb, nowServerTimestamp } from './converters'
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
      // Construir campos base del sistema. Si el llamador proporcionó
      // `fecha_registro` se respeta (será convertido por `toDb`). Si no,
      // usar `nowServerTimestamp()` para que el servidor asigne la fecha.
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
      // Importante: no ejecutar `toDb` sobre `base` porque contiene
      // sentinelas `serverTimestamp()` que deben escribirse tal cual.
      await setDoc(ref, { id: uid, ...toDb(data), ...base })

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
