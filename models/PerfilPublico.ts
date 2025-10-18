import { BaseModel } from './BaseModel';

export type EstadoVerificacion = 'pendiente' | 'verificado' | 'rechazado';

export interface PerfilPublico extends BaseModel {
  // Identificación
  id_usuario: string;

  // Datos básicos
  nombre: string;
  foto?: string;
  biografia?: string;
  experiencia?: string;

  // Servicio
  zonas_servicio?: string[];
  disponibilidad?: string;
  mascotas_aceptadas?: string[];
  max_mascotas?: number;

  // Reputación
  valoraciones?: string[]; // IDs de valoraciones recibidas
  rating_promedio?: number;
  cantidad_paseos_realizados?: number;

  // Seguridad y confianza
  verificacion: EstadoVerificacion;
}
