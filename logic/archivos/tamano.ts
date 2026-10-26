/**
 * Tamaño de archivos, sin depender de para qué se usan.
 */

/**
 * Bytes que ocupa un texto en base64 (con o sin prefijo "data:").
 * @param base64 Contenido en base64.
 * @return Tamaño del archivo original.
 */
export function bytesDeBase64(base64: string): number {
  const limpio = base64.replace(/^data:[^;]+;base64,/, '')
  const relleno = limpio.endsWith('==') ? 2 : limpio.endsWith('=') ? 1 : 0
  return Math.floor((limpio.length * 3) / 4) - relleno
}

/**
 * ¿El archivo cabe en el límite?
 * @param bytes Tamaño del archivo.
 * @param maxMb Límite en MB.
 * @return Si se puede subir (un archivo vacío no).
 */
export function cabeEnLimite(bytes: number, maxMb: number): boolean {
  return bytes > 0 && bytes <= maxMb * 1024 * 1024
}
