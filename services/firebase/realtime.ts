import {
  ref,
  set,
  update,
  get,
  onValue,
  push,
  type DataSnapshot,
} from 'firebase/database'
import { rtdb } from '../../firebase.config'
import { mapFirebaseError } from './errors'
import { CrudResult } from './types'

/**
 * Servicio para interactuar con Firebase Realtime Database.
 * Ideal para datos de baja latencia como GPS, chat o presencia.
 */
export class ServicioRealtime {
  /**
   * Escribe datos en una ruta específica (sobrescribe).
   */
  static async guardar(path: string, data: any): Promise<CrudResult<void>> {
    try {
      const dbRef = ref(rtdb, path)
      await set(dbRef, data)
      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Actualiza campos específicos en una ruta.
   */
  static async actualizar(
    path: string,
    data: Record<string, any>
  ): Promise<CrudResult<void>> {
    try {
      const dbRef = ref(rtdb, path)
      await update(dbRef, data)
      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Agrega un nuevo elemento a una lista (push).
   * Genera una clave única basada en el tiempo.
   */
  static async agregarLista(
    path: string,
    data: any
  ): Promise<CrudResult<string>> {
    try {
      const dbRef = ref(rtdb, path)
      const newRef = await push(dbRef, data)
      return { success: true, data: newRef.key as string }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Obtiene datos de una ruta una sola vez.
   */
  static async obtener<T = any>(path: string): Promise<CrudResult<T>> {
    try {
      const dbRef = ref(rtdb, path)
      const snapshot = await get(dbRef)
      if (snapshot.exists()) {
        return { success: true, data: snapshot.val() as T }
      }
      return { success: true, data: null as any }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Escucha cambios en tiempo real en una ruta.
   * Retorna una función para cancelar la suscripción.
   */
  static escuchar<T = any>(
    path: string,
    callback: (data: T | null) => void,
    onError?: (error: string) => void
  ): () => void {
    const dbRef = ref(rtdb, path)
    const unsubscribe = onValue(
      dbRef,
      (snapshot: DataSnapshot) => {
        callback(snapshot.exists() ? (snapshot.val() as T) : null)
      },
      error => {
        if (onError) {
          onError(mapFirebaseError(error))
        }
      }
    )
    return unsubscribe
  }
}
