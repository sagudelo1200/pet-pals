import type { CodigoErrorPaseo } from './paseoActivo.types'

/**
 * Mapeo de códigos de error a claves de i18n
 * Permite traducir errores del gestor a mensajes legibles para el usuario
 */
export const CODIGOS_ERROR_PASEO: Record<CodigoErrorPaseo, string> = {
  NO_HAY_PASEO_ACTIVO: 'paseos:errores.NO_HAY_PASEO_ACTIVO',
  TRANSICION_INVALIDA: 'paseos:errores.transicion_invalida',
  ESTADO_INCORRECTO: 'paseos:errores.estado_incorrecto',
  SIN_PERMISOS: 'paseos:errores.sin_permisos',
  ERROR_RED: 'paseos:errores.error_red',
  ERROR_VALIDACION: 'paseos:errores.error_validacion',
  MOTIVO_REQUERIDO: 'paseos:errores.motivo_requerido',
} as const

/**
 * Obtiene la clave i18n para un código de error
 * @param codigo Código de error del gestor
 * @returns Clave i18n correspondiente
 */
export function obtenerClaveI18nError(codigo: CodigoErrorPaseo): string {
  return CODIGOS_ERROR_PASEO[codigo]
}

/**
 * Mensajes de error por defecto (fallback si i18n no está disponible)
 * Solo para debugging, la UI debe usar siempre i18n
 */
export const MENSAJES_ERROR_FALLBACK: Record<CodigoErrorPaseo, string> = {
  NO_HAY_PASEO_ACTIVO: 'No hay un paseo activo en este momento',
  TRANSICION_INVALIDA: 'Esta acción no está permitida en el estado actual',
  ESTADO_INCORRECTO: 'El paseo no está en el estado esperado',
  SIN_PERMISOS: 'No tienes permisos para realizar esta acción',
  ERROR_RED: 'Error de conexión. Verifica tu internet',
  ERROR_VALIDACION: 'Los datos proporcionados no son válidos',
  MOTIVO_REQUERIDO: 'Se requiere un motivo para esta acción',
} as const
