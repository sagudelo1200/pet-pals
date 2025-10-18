import { BaseModel } from './BaseModel';

/**
 * Representa una valoración de un servicio de paseo.
 * Incluye calificación numérica, comentario opcional y referencia a paseo y usuarios.
 */
export interface Valoracion extends BaseModel {
  /** ID del paseo valorado. */
  id_paseo: string;
  /** ID del usuario que realiza la valoración. */
  id_usuario: string;
  /** ID del paseador que recibe la valoración. */
  id_paseador: string;

  /** Calificación del servicio en una escala de 1 a 5. */
  rating: number;
  /** Comentario adicional sobre la experiencia. */
  comentario?: string;
  /** Fecha en que se publicó la valoración. */
  fecha: Date;
}
