import { BaseModel } from './BaseModel'

/** Estado territorial de una celda H3 basado en evidencia acumulada */
export type EstadoTerritorial =
  | 'fria'
  | 'observacion'
  | 'prometedora'
  | 'lista_mvp'

/**
 * Resumen territorial agregado por celda H3.
 * Se construye automáticamente desde las exploraciones individuales.
 */
export interface ResumenTerritorial extends BaseModel {
  /** Índice H3 de la celda (resolución 8) */
  h3_index: string

  /** Cantidad total de capturas realizadas */
  capturas_count: number

  /** Cantidad de días únicos con capturas */
  dias_unicos_count: number

  /** Cantidad de horarios únicos observados */
  horarios_unicos_count: number

  /** Cantidad de exploradores únicos que capturaron */
  exploradores_unicos: number

  /** Total de mascotas visibles acumuladas */
  mascotas_visibles_total: number

  /** Total de personas con mascota acumuladas */
  personas_con_mascota_total: number

  /** Total de comercios pet-friendly observados */
  comercios_pet_friendly_total: number

  /** Total de interesados registrados */
  interesados_total: number

  /** Cantidad de validaciones reales de interés */
  validaciones_interes_count: number

  /** Cantidad de comercios validados */
  validaciones_comercio_count: number

  /** Score de densidad (0-100) */
  score_densidad: number

  /** Score de recurrencia (0-100) */
  score_recurrencia: number

  /** Score de confianza (0-100) */
  score_confianza: number

  /** Score de viabilidad general (0-100) */
  score_viabilidad: number

  /** Fecha de última captura */
  ultima_captura_en?: Date

  /** Estado territorial actual */
  estado: EstadoTerritorial
}
