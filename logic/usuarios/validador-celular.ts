/**
 * Validador robusto para números de celular colombianos.
 *
 * Formatos aceptados (todos se normalizan):
 * - 3001234567 (10 dígitos, empieza con 3)
 * - +573001234567 (con indicativo internacional)
 * - 573001234567 (con indicativo nacional)
 * - 300 123 4567 (con espacios)
 * - +57 300 123 4567 (con indicativo e espacios)
 *
 * Los mensajes de error retornan claves i18n (usuarios.validacion.celular.*)
 */

export interface ResultadoValidacionCelular {
  valido: boolean
  celularSanitizado?: string
  errorKey?: string // Clave i18n (ej: 'usuarios.validacion.celular.longitud_incorrecta')
  errorParams?: Record<string, any> // Parámetros para interpolar en la traducción (ej: { cantidad: 3 })
}

/**
 * Sanitiza un número de celular colombiano.
 * Remueve espacios, indicativos (+57, 57) y retorna solo los 10 dígitos.
 * @param celular - Número de celular a sanitizar
 * @returns Celular limpio (10 dígitos) o null si no es válido
 */
export function sanitizarCelular(celular: string): string | null {
  if (!celular || typeof celular !== 'string') {
    return null
  }

  // Remover espacios
  let limpio = celular.trim().replace(/\s+/g, '')

  // Remover indicativo internacional +57
  if (limpio.startsWith('+57')) {
    limpio = limpio.substring(3)
  } else if (limpio.startsWith('57')) {
    limpio = limpio.substring(2)
  }

  // Solo deben quedar dígitos
  if (!/^\d+$/.test(limpio)) {
    return null
  }

  return limpio
}

/**
 * Valida si un número de celular es válido para Colombia.
 *
 * Reglas:
 * - Exactamente 10 dígitos después de sanitizar
 * - Debe empezar con 3 (operadores móviles colombianos)
 *
 * @param celular - Número de celular a validar (puede tener espacios, indicativo, etc)
 * @returns Objeto con estado de validación, celular sanitizado y clave i18n de error si aplica
 */
export function validarCelularColombia(
  celular: string
): ResultadoValidacionCelular {
  // Sanitizar
  const sanitizado = sanitizarCelular(celular)

  if (!sanitizado) {
    return {
      valido: false,
      errorKey: 'usuarios.validacion.celular.caracteres_invalidos',
    }
  }

  // Validar longitud exacta
  if (sanitizado.length !== 10) {
    return {
      valido: false,
      errorKey: 'usuarios.validacion.celular.longitud_incorrecta',
      errorParams: { cantidad: sanitizado.length },
    }
  }

  // Validar que empieza con 3
  if (!sanitizado.startsWith('3')) {
    return {
      valido: false,
      errorKey: 'usuarios.validacion.celular.no_empieza_con_3',
    }
  }

  // Validar que todos sean dígitos (doble check)
  if (!/^\d{10}$/.test(sanitizado)) {
    return {
      valido: false,
      errorKey: 'usuarios.validacion.celular.contiene_no_numericos',
    }
  }

  return {
    valido: true,
    celularSanitizado: sanitizado,
  }
}

/**
 * Valida y sanitiza en un paso.
 * Útil para formularios que quieren obtener el valor limpio.
 *
 * @param celular - Número de celular a procesar
 * @returns Celular sanitizado si es válido, null si es inválido
 */
export function procesarCelular(celular: string): string | null {
  const resultado = validarCelularColombia(celular)
  return resultado.valido ? resultado.celularSanitizado || null : null
}

/**
 * Obtiene la clave i18n del error (sin traducir).
 * Útil para componentes que usan i18n hook.
 *
 * @param celular - Número de celular a validar
 * @returns Objeto con clave i18n y parámetros, o null si es válido
 */
export function obtenerErrorCelularI18n(
  celular: string
): { key: string; params?: Record<string, any> } | null {
  const resultado = validarCelularColombia(celular)
  if (resultado.valido) return null
  // Remover el prefijo 'usuarios.' si existe para usar con namespace
  const key = resultado.errorKey || 'errores.generico'
  const cleanKey = key.replace(/^usuarios\./, '')
  return {
    key: cleanKey,
    params: resultado.errorParams,
  }
}

/**
 * Helper para traducir el error de validación.
 * Úsalo si no tienes acceso al hook de i18n en tu contexto.
 *
 * Ejemplo en componente:
 * ```
 * import { useTranslation } from 'react-i18next'
 * const { t } = useTranslation()
 * const errorI18n = obtenerErrorCelularI18n(celular)
 * const errorMessage = errorI18n ? t(errorI18n.key, errorI18n.params) : null
 * ```
 */
