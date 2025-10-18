import { BaseModel } from './BaseModel';

/**
 * Tipos de paseo disponibles.
 * 'solicitado' para paseos a demanda, 'programado' para paseos con horario fijo.
 */
export type TipoPaseo = 'solicitado' | 'programado';

/**
 * Estados posibles de un paseo.
 * Controla el flujo desde solicitud hasta conclusión o cancelación.
 */
export type EstadoPaseo = 'pendiente' | 'confirmado' | 'en_progreso' | 'completado' | 'cancelado';

/**
 * Representa un servicio de paseo de mascota.
 * Contiene información sobre quién solicita, quién pasea, duración, precio y localización.
 */
export interface Paseo extends BaseModel {
  /** ID del dueño que solicitó el paseo. */
  creado_por: string;
  /** ID del paseador asignado al servicio. */
  id_paseador: string;
  /** ID de la mascota a pasear. */
  id_mascota: string;
  /** Tipo de paseo (a demanda o programado). */
  tipo_paseo: TipoPaseo;
  /** Fecha y hora de inicio del paseo. */
  fecha_hora_inicio: Date;
  /** Duración estimada en minutos. */
  duracion_estimada: number;
  /** Costo del servicio en la moneda local. */
  precio: number;
  /** Estado actual del paseo. */
  estado: EstadoPaseo;
  /** Ubicación de inicio (dirección o coordenadas). */
  ubicacion_inicio?: string;
  /** Ubicación de término (dirección o coordenadas). */
  ubicacion_fin?: string;
  /** Referencia al documento de tracking GPS si aplica. */
  tracking_gps?: string;
}
