/**
 * Firebase Storage: el ÚNICO punto de la app que habla con él. Solo sabe subir,
 * borrar y pedir la dirección de un archivo; qué se sube y a dónde lo deciden
 * la lógica (logic/evidencias) y las reglas (storage.rules).
 */
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadString,
} from 'firebase/storage'
import { storage } from '@/firebase.config'
import { CrudResult, mapFirebaseError } from '@/services/firebase/comun'

const NO_EXISTE = 'storage/object-not-found'

const codigoDe = (error: unknown): string | undefined =>
  (error as { code?: string } | null)?.code

export const ServicioArchivos = {
  /** Sube (o reemplaza) un archivo que llega en base64. */
  async subirBase64(
    ruta: string,
    base64: string,
    contentType: string
  ): Promise<CrudResult<{ ruta: string }>> {
    try {
      await uploadString(ref(storage, ruta), base64, 'base64', { contentType })
      return { success: true, data: { ruta } }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  },

  /** Borra un archivo; si ya no existe, también es éxito. */
  async borrar(ruta: string): Promise<CrudResult<void>> {
    try {
      await deleteObject(ref(storage, ruta))
      return { success: true }
    } catch (error) {
      if (codigoDe(error) === NO_EXISTE) return { success: true }
      return { success: false, error: mapFirebaseError(error) }
    }
  },

  /**
   * Dirección para mostrar un archivo (solo de quien puede leerlo). Que el
   * archivo no exista es normal (aún no se subió): responde sin ensuciar el log.
   */
  async obtenerUrl(ruta: string): Promise<CrudResult<{ url: string }>> {
    try {
      return { success: true, data: { url: await getDownloadURL(ref(storage, ruta)) } }
    } catch (error) {
      if (codigoDe(error) === NO_EXISTE) {
        return { success: false, error: NO_EXISTE }
      }
      return { success: false, error: mapFirebaseError(error) }
    }
  },
}
