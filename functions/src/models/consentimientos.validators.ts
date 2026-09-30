/**
 * Validadores compartidos para consentimientos
 *
 * Fuente única de verdad para:
 * - Máquina de estados
 * - Transiciones válidas
 *
 * Importado por:
 * - models/Consentimiento.ts (frontend)
 * - functions/src/consentimientos/registrarConsentimiento.ts (backend)
 */

export type EstadoConsentimiento = 'ACEPTADO' | 'RECHAZADO' | 'REVOCADO'
export type EstadoBase = 'SIN_EVENTOS' | EstadoConsentimiento

/**
 * Matriz de transiciones válidas
 */
export const TRANSICIONES_VALIDAS: Record<EstadoBase, EstadoConsentimiento[]> =
  {
    SIN_EVENTOS: ['ACEPTADO', 'RECHAZADO'],
    ACEPTADO: ['REVOCADO', 'ACEPTADO'], // Puede re-aceptar la misma versión
    RECHAZADO: ['ACEPTADO'],
    REVOCADO: ['ACEPTADO'],
  };

/**
 * Validar si una transición de estado es permitida
 *
 * @param estadoActual - Estado actual del consentimiento
 * @param nuevoEstado - Estado al que se quiere pasar
 * @returns true si la transición es válida
 */
export function transicionValida(
  estadoActual: EstadoBase,
  nuevoEstado: EstadoConsentimiento
): boolean {
  const validas = TRANSICIONES_VALIDAS[estadoActual] || [];
  return validas.includes(nuevoEstado);
}
