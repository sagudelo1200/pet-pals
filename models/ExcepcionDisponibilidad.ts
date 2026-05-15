/** Override de disponibilidad para un día específico dentro de una semana */
export interface OverrideDia {
  /** Si el cuidador está disponible ese día (puede diferir del horario base) */
  activo: boolean
  /** Hora de inicio personalizada en formato HH:mm. Solo relevante si activo=true */
  inicio?: string
  /** Hora de fin personalizada en formato HH:mm. Solo relevante si activo=true */
  fin?: string
}

/**
 * Excepción semanal de disponibilidad de un cuidador.
 * Almacenado en: excepciones_disponibilidad/{uid_cuidador}/semanas/{isoWeek}
 *
 * Permite personalizar día a día el horario de una semana concreta,
 * sobreescribiendo el `horario_semanal` base del perfil.
 *
 * Regla de prioridad para el matching:
 *   1. Si existe override para el día → usar override.activo + override.inicio/fin
 *   2. Si no hay override para el día → usar horario_semanal del perfil
 */
export interface ExcepcionDisponibilidad {
  uid_cuidador: string
  /** Semana en formato ISO: "2026-W21" */
  semana: string
  /**
   * Overrides por día de la semana.
   * Clave: string "0"–"6" (0=Dom, 1=Lun, …, 6=Sáb).
   * Días ausentes = sin override, se usa el horario_semanal base.
   */
  overrides: Record<string, OverrideDia>
  actualizado_en?: unknown
}
