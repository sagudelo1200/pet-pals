/**
 * Constantes de dominio para Exploraciones Territoriales
 *
 * Centraliza valores fijos que definen comportamiento y validaciones
 * de capturas territoriales, para evitar números mágicos distribuidos.
 */

/** Huellas otorgadas inmediatamente al capturar una exploración */
export const HUELLAS_INMEDIATAS_POR_CAPTURA = 3

/** Estado inicial de toda exploración nueva */
export const ESTADO_INICIAL_EXPLORACION = 'pendiente' as const

/** Resoluciones H3 para contexto territorial (también en ServicioTerritorio) */
export const EXPLORACION_H3_RESOLUTIONS = {
  /** R8: ~460m. Indexación primaria y cobertura de cuidadores. */
  TERRITORIAL: 8,
  /** R9: ~174m. Microzoning y clustering de observaciones. */
  OBSERVACION: 9,
} as const
