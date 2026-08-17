/**
 * Servicio de compresión y validación de imágenes.
 * Controla el tamaño máximo y comprime automáticamente si es necesario.
 */

// Límite de tamaño en bytes (~900KB para dejar margen)
const TAMAÑO_MAXIMO_BYTES = 900000 // ~900KB

// Calidad mínima y máxima para compresión
const _QUALITY_STEP = 0.1 // Pasos de 10% en calidad

interface ResultadoCompresion {
  success: boolean
  base64?: string
  tamaño?: number
  calidadFinal?: number
  error?: string
  mensaje?: string
}

/**
 * Valida si una imagen base64 está dentro del límite de tamaño.
 * Retorna información sobre el tamaño actual.
 */
export function validarTamañoImagen(base64: string): {
  valido: boolean
  tamaño: number
  tamañoMB: string
} {
  // Eliminar prefijo "data:image/...;base64," si existe
  const imagenSinPrefijo = base64.replace(/^data:image\/[^;]+;base64,/, '')
  // Base64 es ~33% más grande que el binario original
  const tamaño = Math.ceil((imagenSinPrefijo.length * 3) / 4)
  const tamañoMB = (tamaño / (1024 * 1024)).toFixed(2)

  return {
    valido: tamaño <= TAMAÑO_MAXIMO_BYTES,
    tamaño,
    tamañoMB,
  }
}

/**
 * Comprime una imagen base64 hasta que esté dentro del límite de tamaño.
 * Intenta primero con calidad 0.7, luego baja en pasos si es necesario.
 *
 * NOTA: Esta función es una simulación porque React Native / Expo
 * no tiene API nativa para recompresar JPEG en la app. La compresión real
 * ocurre en el servidor o durante la captura (quality param en ImagePicker).
 *
 * Para una compresión real, se requeriría:
 * - expo-image-manipulator (externa)
 * - Firebase Storage con reglas de resize
 * - Cloud Function en backend
 */
export async function comprimirImagen(
  base64: string,
  _calidadInicial: number = 0.7
): Promise<ResultadoCompresion> {
  const validacion = validarTamañoImagen(base64)

  // Si ya está dentro del límite, no comprimir
  if (validacion.valido) {
    return {
      success: true,
      base64,
      tamaño: validacion.tamaño,
      calidadFinal: 1.0,
      mensaje: `Imagen válida (${validacion.tamañoMB}MB)`,
    }
  }

  // Si está fuera del límite, intentar comprimir
  // En esta implementación simplificada, no podemos recompresar en el cliente
  // La solución real sería usar expo-image-manipulator
  return {
    success: false,
    tamaño: validacion.tamaño,
    error: `Imagen demasiado grande: ${validacion.tamañoMB}MB (máximo: ${(TAMAÑO_MAXIMO_BYTES / (1024 * 1024)).toFixed(2)}MB)`,
    mensaje: `La imagen debe tener menos de ${(TAMAÑO_MAXIMO_BYTES / (1024 * 1024)).toFixed(2)}MB. Intenta usar una imagen de menor resolución.`,
  }
}

/**
 * Obtiene el mensaje de error amigable para el usuario.
 */
export function obtenerMensajeErrorTamaño(
  tamaño: number,
  locale: 'es' | 'en' = 'es'
): string {
  const tamañoMB = (tamaño / (1024 * 1024)).toFixed(2)
  const maxMB = (TAMAÑO_MAXIMO_BYTES / (1024 * 1024)).toFixed(2)

  const mensajes = {
    es: `La foto es demasiado grande (${tamañoMB}MB). Debe ser menor a ${maxMB}MB. Intenta usar una foto de menor resolución o calidad.`,
    en: `Photo is too large (${tamañoMB}MB). Must be less than ${maxMB}MB. Try using a lower resolution or quality image.`,
  }

  return mensajes[locale]
}

/**
 * Obtiene el límite máximo de tamaño en MB (formateado).
 */
export function obtenerLimiteTamaño(): string {
  return (TAMAÑO_MAXIMO_BYTES / (1024 * 1024)).toFixed(2)
}

export { TAMAÑO_MAXIMO_BYTES }
