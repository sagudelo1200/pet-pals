import { BaseModel } from './BaseModel'
import type { UbicacionSnapshot } from '@/models/Ubicacion'

/**
 * Tipos de paseo disponibles.
 * 'solicitado' para paseos a demanda, 'programado' para paseos con horario fijo.
 */
export type TipoPaseo = 'solicitado' | 'programado'

/**
 * Estados posibles de un paseo.
 * Controla el flujo desde solicitud hasta conclusión o cancelación.
 */
/* eslint-disable no-unused-vars */
// Los valores del enum `ESTADOS_PASEO` se usan en múltiples módulos del proyecto.
export enum ESTADOS_PASEO {
  PENDIENTE = 'PENDIENTE',
  CONFIRMADO = 'CONFIRMADO',
  EN_CAMINO = 'EN_CAMINO',
  EN_PUNTO_RECOGIDA = 'EN_PUNTO_RECOGIDA',
  EN_PROGRESO = 'EN_PROGRESO',
  FINALIZADO = 'FINALIZADO',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO',
  ERROR = 'ERROR',
}

/**
 * Modalidad del paseo que define si acepta mascotas de otros tutores.
 * 'privado' = Solo las mascotas del tutor que creó el paseo
 * 'compartido' = Acepta que otros tutores unan sus mascotas (paseo grupal)
 */
export type ModalidadPaseo = 'privado' | 'compartido'

/**
 * Representa un servicio de paseo de mascota.
 * Contiene información sobre quién solicita, quién pasea, duración, precio y localización.
 */
export interface Paseo extends BaseModel {
  /** ID del cuidador asignado al servicio (puede no estar asignado inicialmente). */
  id_cuidador?: string

  /**
   * Modalidad del paseo: 'privado' (solo mis mascotas) o 'compartido' (acepta otros tutores).
   * Define si el paseo permite que otros tutores unan sus mascotas.
   */
  modalidad?: ModalidadPaseo

  /** Cupo máximo de mascotas TOTALES para este paseo (incluyendo de todos los tutores). */
  cupo_maximo_mascotas?: number
  /** Contador actual de mascotas unidas a este paseo (subcolección). */
  mascotas_count?: number
  /** IDs de las mascotas participantes (para optimización de consultas). */
  mascota_ids?: string[]
  /** IDs de los tutores participantes (para paseos compartidos). */
  tutor_ids?: string[]
  /** Tipo de paseo (a demanda o programado). */
  tipo_paseo: TipoPaseo
  /** Fecha y hora de inicio del paseo. */
  fecha_hora_inicio: Date
  /** Duración estimada en minutos. */
  duracion_estimada: number
  /** Duración real */
  duracion_real?: number
  /** Costo del servicio en la moneda local. */
  precio: number
  /** Estado actual del paseo. */
  estado: ESTADOS_PASEO
  /** Fecha y hora real de inicio del paseo (cuando pasa a EN_PROGRESO). */
  fecha_inicio_real?: Date
  /** Fecha y hora real de fin del paseo (cuando pasa a FINALIZADO). */
  fecha_fin_real?: Date
  /** Ubicación de inicio (dirección o coordenadas). */
  ubicacion_inicio?: UbicacionSnapshot | string
  /** Texto legible de la ubicación de inicio (ej. "Casa", "Trabajo") para listas. */
  ubicacion_inicio_txt?: string
  /** Ubicación de término (dirección o coordenadas). */
  ubicacion_fin?: UbicacionSnapshot | string
  /** Texto legible de la ubicación de fin para listas. */
  ubicacion_fin_txt?: string
  /** Referencia al documento de tracking GPS si aplica. */
  tracking_gps?: string
  /** Nombre de la primera mascota para visualización en listas. */
  mascota_nombre_visual?: string
  /** Foto de la primera mascota para visualización en listas. */
  mascota_foto_visual?: string
  /** Lista de fotos (hasta 4) para paseos múltiples. */
  mascotas_fotos_visual?: string[]
  /** Nombre del cuidador para visualización en listas. */
  cuidador_nombre_visual?: string
  /** Foto del cuidador para visualización en listas. */
  cuidador_foto_visual?: string
  /** Tipo de solicitud: DIRECTA (a un cuidador) o ABIERTA (visible a varios cuidadores). */
  tipo_solicitud?: 'DIRECTA' | 'ABIERTA'

  /** Modo de transporte seleccionado por el cuidador durante EN_CAMINO: 'walking' o 'driving'. */
  modo_transporte_actual?: 'walking' | 'driving'

  /**
   * VALIDACIÓN DE RECOGIDA (POR TUTOR)
   * En paseos compartidos, cada tutor tiene su propio código.
   * En paseos privados, hay un único código.
   */
  /** Códigos de recogida por tutor: { [tutorId]: codigo_6_digitos }. */
  codigos_recogida_por_tutor?: Record<string, string>
  /** Códigos validados por tutor: { [tutorId]: boolean }. */
  codigo_recogida_validado_por_tutor?: Record<string, boolean>
  /** Timestamp de validación de recogida por tutor: { [tutorId]: Date }. */
  timestamp_validacion_recogida_por_tutor?: Record<string, Date>
  /** Intentos fallidos de recogida por tutor: { [tutorId]: number }. */
  intentos_fallidos_recogida_por_tutor?: Record<string, number>

  /**
   * VALIDACIÓN DE ENTREGA (POR TUTOR)
   * Similar a recogida: cada tutor valida la entrega de sus mascotas.
   */
  /** Códigos de entrega por tutor: { [tutorId]: codigo_6_digitos }. */
  codigos_entrega_por_tutor?: Record<string, string>
  /** Códigos de entrega validados por tutor: { [tutorId]: boolean }. */
  codigo_entrega_validado_por_tutor?: Record<string, boolean>
  /** Timestamp de validación de entrega por tutor: { [tutorId]: Date }. */
  timestamp_validacion_entrega_por_tutor?: Record<string, Date>
  /** Intentos fallidos de entrega por tutor: { [tutorId]: number }. */
  intentos_fallidos_entrega_por_tutor?: Record<string, number>
}
