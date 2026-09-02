// ---------- Errores / i18n map ----------
// Responsabilidad: tipos de error del dominio de paseos y su mapeo a claves i18n.

export type CodigoErrorPaseo =
  | 'NO_HAY_PASEO_ACTIVO'
  | 'TRANSICION_INVALIDA'
  | 'ESTADO_INCORRECTO'
  | 'SIN_PERMISOS'
  | 'ERROR_RED'
  | 'ERROR_VALIDACION'
  | 'MOTIVO_REQUERIDO'
  | 'PASEO_YA_ACEPTADO'
  | 'DOBLE_BOOKING_DETECTADO'
  | 'CUIDADOR_OCUPADO'

export const CODIGOS_ERROR_PASEO: Record<CodigoErrorPaseo, string> = {
  NO_HAY_PASEO_ACTIVO: 'paseos:errores.NO_HAY_PASEO_ACTIVO',
  TRANSICION_INVALIDA: 'paseos:errores.transicion_invalida',
  ESTADO_INCORRECTO: 'paseos:errores.estado_incorrecto',
  SIN_PERMISOS: 'paseos:errores.sin_permisos',
  ERROR_RED: 'paseos:errores.error_red',
  ERROR_VALIDACION: 'paseos:errores.error_validacion',
  MOTIVO_REQUERIDO: 'paseos:errores.motivo_requerido',
  PASEO_YA_ACEPTADO: 'paseos:errores.paseo_ya_aceptado',
  DOBLE_BOOKING_DETECTADO: 'paseos:errores.doble_booking_detectado',
  CUIDADOR_OCUPADO: 'paseos:errores.cuidador_ocupado',
} as const

export function obtenerClaveI18nError(codigo: CodigoErrorPaseo): string {
  return CODIGOS_ERROR_PASEO[codigo]
}

export const MENSAJES_ERROR_FALLBACK: Record<CodigoErrorPaseo, string> = {
  NO_HAY_PASEO_ACTIVO: 'No hay un paseo activo en este momento',
  TRANSICION_INVALIDA: 'Esta acción no está permitida en el estado actual',
  ESTADO_INCORRECTO: 'El paseo no está en el estado esperado',
  SIN_PERMISOS: 'No tienes permisos para realizar esta acción',
  ERROR_RED: 'Error de conexión. Verifica tu internet',
  ERROR_VALIDACION: 'Los datos proporcionados no son válidos',
  MOTIVO_REQUERIDO: 'Se requiere un motivo para esta acción',
  PASEO_YA_ACEPTADO: 'Este paseo ya fue aceptado por otro cuidador',
  DOBLE_BOOKING_DETECTADO: 'Ya tienes otro paseo en este horario',
  CUIDADOR_OCUPADO: 'No disponible en este horario',
} as const
