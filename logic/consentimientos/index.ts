/**
 * Índice de exportaciones para lógica de consentimientos
 *
 * Centraliza las importaciones de:
 * - GestorConsentimientos: Orquestación de servicios
 * - Evaluadores puros: evaluarVigencia(), evaluarAlerta()
 */

export { GestorConsentimientos } from './gestor'
export { evaluarVigencia, evaluarAlerta } from './evaluador'
export type { ResultadoVigencia, ResultadoAlerta } from './evaluador'
