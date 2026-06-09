/**
 * Módulo de generación de códigos de validación para paseos.
 * Genera códigos alfanuméricos únicos para recogida y entrega de mascotas.
 */

/**
 * Genera un código numérico de 6 dígitos único para validación de recogida/entrega.
 * Utiliza solo números (0-9) para facilitar entrada manual y evitar confusiones.
 *
 * @returns {string} Código de 6 dígitos numéricos (ej: "742851")
 *
 * @example
 * const codigo = generarCodigoRecogida()
 * // resultado: "742851"
 */
export function generarCodigoRecogida(): string {
  // Genera 6 dígitos aleatorios (0-9)
  let codigo = ''
  for (let i = 0; i < 6; i++) {
    codigo += Math.floor(Math.random() * 10).toString()
  }
  return codigo
}

/**
 * Valida que un código tenga el formato correcto (6 dígitos numéricos).
 *
 * @param codigo {string} Código a validar
 * @returns {boolean} True si es válido, false en otro caso
 *
 * @example
 * validarFormatoCodigo("742851") // true
 * validarFormatoCodigo("74285")  // false (5 dígitos)
 * validarFormatoCodigo("74285A") // false (contiene letra)
 */
export function validarFormatoCodigo(codigo: string): boolean {
  if (!codigo) return false
  const regex = /^\d{6}$/
  return regex.test(codigo.trim())
}

/**
 * Normaliza un código ingresado por el usuario (remueve espacios, convierte a mayúsculas si aplica).
 * Para códigos numéricos, simplemente remueve espacios.
 *
 * @param codigo {string} Código ingresado por usuario
 * @returns {string} Código normalizado
 *
 * @example
 * normalizarCodigo("7 4 2 8 5 1") // "742851"
 * normalizarCodigo("742851")      // "742851"
 */
export function normalizarCodigo(codigo: string): string {
  return codigo.replace(/\s/g, '').trim()
}

/**
 * Genera códigos de recogida por tutor.
 * Cada tutor en el paseo recibe un código único de 6 dígitos.
 * Útil para paseos compartidos donde múltiples tutores tienen mascotas.
 *
 * @param tutorIds {string[]} Array de IDs de tutores participantes
 * @returns {Record<string, string>} Mapa { tutorId -> codigo_6_digitos }
 *
 * @example
 * const codigos = generarCodigosRecogidaPorTutor(['tutor1', 'tutor2', 'tutor3'])
 * // resultado: { tutor1: "123456", tutor2: "789012", tutor3: "345678" }
 */
export function generarCodigosRecogidaPorTutor(
  tutorIds: string[]
): Record<string, string> {
  const codigos: Record<string, string> = {}
  for (const tutorId of tutorIds) {
    codigos[tutorId] = generarCodigoRecogida()
  }
  return codigos
}
