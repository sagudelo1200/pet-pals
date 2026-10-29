/**
 * Foto del grupo que el cuidador sube al terminar un paseo (evidencia de la
 * entrega). Usa el motor de archivos: aquí solo se decide a qué ruta va y qué
 * se devuelve. Las reglas de Storage (perfil `foto_entrega`) solo dejan subirla
 * al cuidador asignado mientras el paseo está en curso o recién finalizado.
 */
import { GestorArchivos } from '@/logic/archivos/gestor'
import type { DimensionesImagen } from '@/services/imagen/preparar'

export type ResultadoFotoEntrega =
  { success: true; url: string } | { success: false; error: string }

/** Ruta de la foto del grupo de un paseo (un solo archivo, se reemplaza). */
export const rutaFotoEntrega = (paseoId: string): string =>
  `paseos/${paseoId}/entrega/grupo`

/**
 * Sube la foto del grupo y devuelve la dirección con la que se guarda en el
 * paseo (`foto_entrega_grupo`).
 * @param paseoId Paseo.
 * @param uri Archivo local de la foto.
 * @param dimensiones Medidas de la foto, si se conocen.
 * @return La dirección de la foto, o el código de error de ARCHIVO_*.
 */
export async function subirFotoEntrega(
  paseoId: string,
  uri: string,
  dimensiones?: DimensionesImagen
): Promise<ResultadoFotoEntrega> {
  const ruta = rutaFotoEntrega(paseoId)
  const subida = await GestorArchivos.subirImagen(
    ruta,
    uri,
    'foto_entrega',
    dimensiones
  )
  if (!subida.success) {
    return { success: false, error: subida.error ?? 'ARCHIVO_SUBIDA_FALLIDA' }
  }
  const direccion = await GestorArchivos.obtenerUrl(ruta)
  if (!direccion.success || !direccion.data) {
    return { success: false, error: 'ARCHIVO_SUBIDA_FALLIDA' }
  }
  return { success: true, url: direccion.data.url }
}
