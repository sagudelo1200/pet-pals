/**
 * Constantes H3 - Sistema de resoluciones geoespaciales
 *
 * H3 es un índice hexagonal jerárquico que divide la Tierra en celdas hexagonales.
 * Cada resolución (0-15) tiene un tamaño diferente.
 *
 * Paw-Path usa dos resoluciones primarias:
 * - R8 (~460m): Resolución predeterminada para paseos, cobertura, territorios
 * - R9 (~174m): Microzoning, clustering, observaciones detalladas
 *
 * @see https://h3geo.org/docs/core-concepts/resolution-table
 */

/**
 * Resoluciones H3 soportadas
 */
export const H3_RESOLUTIONS = {
  /** Resolución 8: ~460m de radio. Celdas grandes para cobertura y territorios. */
  R8: 8,
  /** Resolución 9: ~174m de radio. Celdas medianas para microzoning. */
  R9: 9,
  /** Resolución 7: ~1.2km de radio. Para análisis macro territorial (futuro). */
  R7: 7,
} as const

/**
 * Tipo para resoluciones de H3
 */
export type H3Resolution = (typeof H3_RESOLUTIONS)[keyof typeof H3_RESOLUTIONS]

/**
 * Tipo para nombres de campos H3 en documentos
 * Convencionalmente: h3_r8, h3_r9, h3_r7, etc.
 */
export type H3FieldName = 'h3_r8' | 'h3_r9' | 'h3_r7'

/**
 * Mapa de resolución -> nombre de campo
 * Útil para código dinámico que necesita mapear resoluciones a nombres de campos
 */
export const H3_FIELD_NAMES: Record<H3Resolution, H3FieldName> = {
  [H3_RESOLUTIONS.R8]: 'h3_r8',
  [H3_RESOLUTIONS.R9]: 'h3_r9',
  [H3_RESOLUTIONS.R7]: 'h3_r7',
} as const

/**
 * Descripción legible de resoluciones (para UI y logs)
 */
export const H3_RESOLUTION_LABELS: Record<H3Resolution, string> = {
  [H3_RESOLUTIONS.R7]: 'R7 (~1.2km)',
  [H3_RESOLUTIONS.R8]: 'R8 (~460m)',
  [H3_RESOLUTIONS.R9]: 'R9 (~174m)',
} as const
