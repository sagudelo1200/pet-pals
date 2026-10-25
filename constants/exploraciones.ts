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
