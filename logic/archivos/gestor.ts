import { prepararImagen, type DimensionesImagen } from '@/services/imagen/preparar'
import { ServicioArchivos } from '@/services/firebase/storage/archivos'
import type { CrudResult } from '@/services/firebase/comun'
import {
  PERFILES_ARCHIVO,
  type TipoPerfilArchivo,
} from '@/functions/src/compartido/archivos'
import { bytesDeBase64, cabeEnLimite } from './tamano'

/** Códigos de error de los archivos (la pantalla los traduce). */
export const ERRORES_ARCHIVO = {
  IMAGEN_ILEGIBLE: 'ARCHIVO_IMAGEN_ILEGIBLE',
  MUY_GRANDE: 'ARCHIVO_MUY_GRANDE',
  SUBIDA_FALLIDA: 'ARCHIVO_SUBIDA_FALLIDA',
} as const

/**
 * Archivos en Storage, para cualquier uso: sube una foto (reducida y
 * comprimida según su perfil) a la ruta que se le diga, la borra o pide su
 * dirección. No decide qué se sube ni a dónde: eso es de quien lo llama y de
 * storage.rules. Devuelve códigos de error (ERRORES_ARCHIVO), no mensajes.
 */
export const GestorArchivos = {
  async subirImagen(
    ruta: string,
    uri: string,
    perfil: TipoPerfilArchivo,
    dimensiones?: DimensionesImagen
  ): Promise<CrudResult<{ ruta: string }>> {
    const limites = PERFILES_ARCHIVO[perfil]

    let foto
    try {
      foto = await prepararImagen(uri, {
        ladoMaximo: limites.lado_max,
        calidad: limites.calidad,
        dimensiones,
      })
    } catch {
      return { success: false, error: ERRORES_ARCHIVO.IMAGEN_ILEGIBLE }
    }
    if (!cabeEnLimite(bytesDeBase64(foto.base64), limites.max_mb)) {
      return { success: false, error: ERRORES_ARCHIVO.MUY_GRANDE }
    }

    const subida = await ServicioArchivos.subirBase64(
      ruta,
      foto.base64,
      foto.contentType
    )
    return subida.success
      ? subida
      : { success: false, error: ERRORES_ARCHIVO.SUBIDA_FALLIDA }
  },

  borrar(ruta: string): Promise<CrudResult<void>> {
    return ServicioArchivos.borrar(ruta)
  },

  obtenerUrl(ruta: string): Promise<CrudResult<{ url: string }>> {
    return ServicioArchivos.obtenerUrl(ruta)
  },
}
