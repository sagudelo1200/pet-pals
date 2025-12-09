import { BaseModel } from './BaseModel'

/**
 * Tipos de paseo disponibles.
 * 'solicitado' para paseos a demanda, 'programado' para paseos con horario fijo.
 */
export type TipoPaseo = 'solicitado' | 'programado'

/**
 * Estados posibles de un paseo.
 * Controla el flujo desde solicitud hasta conclusión o cancelación.
 */
export enum PaseoStatus {
  PENDIENTE = 'PENDIENTE',
  ACEPTADO = 'ACEPTADO',
  PROGRAMADO = 'PROGRAMADO',
  EN_RUTA = 'EN_RUTA',
  EN_PROGRESO = 'EN_PROGRESO',
  FINALIZADO = 'FINALIZADO',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO',
  RECHAZADO = 'RECHAZADO',
  ERROR = 'ERROR',
}

/**
 * Representa un servicio de paseo de mascota.
 * Contiene información sobre quién solicita, quién pasea, duración, precio y localización.
 */
export interface Paseo extends BaseModel {
  /** ID del cuidador asignado al servicio (puede no estar asignado inicialmente). */
  id_cuidador?: string
  /** Indica si el paseo admite múltiples mascotas. */
  es_multiple?: boolean
  /** Cupo máximo de mascotas para este paseo (no debe superar el límite global). */
  cupo_maximo_mascotas?: number
  /** Contador actual de mascotas unidas a este paseo (subcolección). */
  mascotas_count?: number
  /** IDs de las mascotas participantes (para optimización de consultas). */
  mascota_ids?: string[]
  /** Tipo de paseo (a demanda o programado). */
  tipo_paseo: TipoPaseo
  /** Fecha y hora de inicio del paseo. */
  fecha_hora_inicio: Date
  /** Duración estimada en minutos. */
  duracion_estimada: number
  /** Costo del servicio en la moneda local. */
  precio: number
  /** Estado actual del paseo. */
  estado: PaseoStatus
  /** Fecha y hora real de inicio del paseo (cuando pasa a EN_PROGRESO). */
  fecha_inicio_real?: Date
  /** Fecha y hora real de fin del paseo (cuando pasa a FINALIZADO). */
  fecha_fin_real?: Date
  /** Ubicación de inicio (dirección o coordenadas). */
  ubicacion_inicio?: string
  /** Ubicación de término (dirección o coordenadas). */
  ubicacion_fin?: string
  /** Referencia al documento de tracking GPS si aplica. */
  tracking_gps?: string
  /** Nombre de la primera mascota para visualización en listas. */
  mascota_nombre_visual?: string
  /** Foto de la primera mascota para visualización en listas. */
  mascota_foto_visual?: string
  /** Lista de fotos (hasta 4) para paseos múltiples. */
  mascotas_fotos_visual?: string[]
}
