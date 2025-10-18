import { BaseModel } from './BaseModel';

/**
 * Tipos de especie permitidas para mascotas.
 * Por ahora sólo se soporta 'perro'.
 */
export type EspecieMascota = 'perro';

/**
 * Género de la mascota.
 */
export type GeneroMascota = 'macho' | 'hembra';

/**
 * Tamaño de la mascota, usado para ajustar precios y disponibilidad del paseador.
 */
export type TamanoMascota = 'muy pequeño' | 'pequeño' | 'mediano' | 'grande' | 'gigante';

/**
 * Nivel de energía general de la mascota, influye en las recomendaciones de duración y tipo de paseo.
 */
export type NivelEnergia = 'bajo' | 'medio' | 'alto';

/**
 * Detalle de una vacuna aplicada a la mascota.
 */
export interface VacunaMascota {
  /** Nombre de la vacuna. */
  nombre: string;
  /** Fecha en que se aplicó la vacuna. */
  fecha?: Date;
}

/**
 * Representa los datos de una mascota de un usuario.
 * Incluye información de identificación, características físicas, salud, historial médico y preferencias de paseo.
 */
export interface Mascota extends BaseModel {
  /** ID del usuario propietario de la mascota. */
  id_usuario: string;
  /** Nombre dado a la mascota. */
  nombre: string;
  /** URL o ruta de la imagen de la mascota. */
  foto?: string;

  /** Especie de la mascota. */
  especie: EspecieMascota;
  /** Raza específica (opcional). */
  raza?: string;
  /** Fecha de nacimiento. */
  fecha_nacimiento?: Date;
  /** Género de la mascota. */
  genero?: GeneroMascota;
  /** Tamaño físico de la mascota. */
  tamano?: TamanoMascota;
  /** Peso en kilogramos. */
  peso?: number;

  /** Indica si la mascota está esterilizada. */
  esterilizado?: boolean;
  /** Registro de vacunas aplicadas. */
  vacunas?: VacunaMascota[];
  /** Condiciones de salud relevantes. */
  condiciones_salud?: string[];
  /** Condiciones de comportamiento a considerar. */
  condiciones_comportamiento?: string[];
  /** Resumen del historial médico. */
  historial_medico?: string;

  /** Nivel de energía para recomendaciones de paseo. */
  nivel_energia?: NivelEnergia;
  /** Preferencias específicas de la mascota durante el paseo. */
  preferencias_paseo?: string[];

  /** Descripción adicional o notas especiales. */
  descripcion?: string;
}
