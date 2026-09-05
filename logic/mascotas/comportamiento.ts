/**
 * Instrumento de observación de la mascota: opciones ESTANDARIZADAS por eje.
 * El backend (callable crearEvaluacion) guarda estos valores; el expediente
 * (comportamiento_resumen) los agrega por chip para que sea comparable entre
 * cuidadores. El front solo traduce el valor con i18n (key `{eje}_{valor}`).
 */

export const OPCIONES_COMPORTAMIENTO = {
  ritmo: ['tranquilo', 'normal', 'energico'],
  compania: ['solo', 'confiado', 'sociable'],
  tolerancia: ['ignora', 'neutro', 'receptivo'],
} as const

export type EjeComportamiento = keyof typeof OPCIONES_COMPORTAMIENTO

/** Key i18n del chip (ej: ritmo_tranquilo). Si falta, el UI usa el valor crudo. */
export function keyI18nChip(eje: EjeComportamiento, valor: string): string {
  return `${eje}_${valor}`
}
