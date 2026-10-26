/**
 * Prepara una foto para subirla: la reduce y la recomprime en JPEG, para que
 * pese poco (guardar y descargar cuesta por byte). No sabe para qué es la foto:
 * los límites los pone quien la llama (ver PERFILES_ARCHIVO).
 */
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'

export interface DimensionesImagen {
  ancho: number
  alto: number
}

export interface OpcionesImagen {
  /** Lado más largo permitido (px); si la foto es mayor, se reduce. */
  ladoMaximo: number
  /** Calidad JPEG (0-1). */
  calidad: number
  /** Medidas originales, si se conocen (las da el selector de fotos). */
  dimensiones?: DimensionesImagen
}

/**
 * Cómo reducir una foto para que su lado más largo no pase del máximo. Sin
 * medidas o ya pequeña no se toca (nunca se agranda).
 * @param ancho Ancho original.
 * @param alto Alto original.
 * @param maximo Lado más largo permitido.
 * @return Medida a pedir al reducir, o null si no hace falta.
 */
export function reduccionNecesaria(
  ancho: number | undefined,
  alto: number | undefined,
  maximo: number
): { width: number } | { height: number } | null {
  if (!ancho || !alto || Math.max(ancho, alto) <= maximo) return null
  return ancho >= alto ? { width: maximo } : { height: maximo }
}

/**
 * Reduce (si hace falta) y recomprime la foto.
 * @param uri Archivo local de la foto.
 * @param opciones Límites de la reducción y la compresión.
 * @return La foto lista, en base64 y JPEG.
 */
export async function prepararImagen(
  uri: string,
  opciones: OpcionesImagen
): Promise<{ base64: string; contentType: 'image/jpeg' }> {
  const { ladoMaximo, calidad, dimensiones } = opciones
  const reduccion = reduccionNecesaria(
    dimensiones?.ancho,
    dimensiones?.alto,
    ladoMaximo
  )
  const resultado = await manipulateAsync(
    uri,
    reduccion ? [{ resize: reduccion }] : [],
    { compress: calidad, format: SaveFormat.JPEG, base64: true }
  )
  if (!resultado.base64) throw new Error('No se pudo leer la imagen')
  return { base64: resultado.base64, contentType: 'image/jpeg' }
}
