import { BaseModel } from './BaseModel';

/**
 * Estados que puede tener la mascota dentro de un paseo.
 * Ayuda a controlar la logística desde el inicio hasta la devolución.
 */
export type EstadoMascotaPaseo = 'pendiente' | 'en_paseo' | 'entregada' | 'cancelada';

/**
 * Enlaza una mascota con un paseo, permitiendo registrar el estado y datos específicos por mascota.
 */
export interface PaseoMascota extends BaseModel {
  /** ID del paseo al que pertenece esta entrada. */
  id_paseo: string;
  /** ID de la mascota participante. */
  id_mascota: string;
  /** Observaciones hechas por el paseador o dueño durante el servicio. */
  observaciones?: string;
  /** Código que verifica la recogida de la mascota. */
  codigo_recogida?: string;
  /** Código que verifica la entrega de la mascota. */
  codigo_entrega?: string;
  /** Estado actual de la mascota en el paseo. */
  estado_mascota: EstadoMascotaPaseo;
}
