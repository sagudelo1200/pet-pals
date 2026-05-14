import { BaseModel } from './BaseModel'

/** Estado de verificación del perfil público */
export type EstadoVerificacion = 'pendiente' | 'verificado' | 'rechazado'

/** Perfil público que muestra la información visible para otros usuarios */
export interface PerfilPublico extends BaseModel {
  /** Nombre mostrado */
  nombre: string
  /** URL de la foto de perfil */
  foto?: string
  /** Biografía breve */
  biografia?: string
  /** Texto libre sobre experiencia o formación */
  experiencia?: string

  /**
   * Celda H3 de origen del cuidador (resolución 8, ≈460m de radio).
   * Se usa como origen para el índice de cobertura `/indice_cobertura/{celda}/cuidadores/{uid}`.
   * Reemplaza el campo `zonas_servicio` que nunca fue poblado ni consultado.
   */
  h3_home?: string

  /** Configuración de disponibilidad estructurada */
  horario_laboral?: {
    /** Días de la semana activos (0=Domingo, 1=Lunes, etc.) */
    dias: number[]
    /** Hora de inicio formato HH:mm (ej: "08:00") */
    hora_inicio: string
    /** Hora de fin formato HH:mm (ej: "18:00") */
    hora_fin: string
  }

  /** Tipos de mascotas aceptadas */
  mascotas_aceptadas?: string[]
  /** Número máximo de mascotas que acepta simultáneamente */
  max_mascotas?: number
  /** Calificación promedio calculada a partir de valoraciones */
  rating_promedio?: number
  /** Cantidad total de paseos realizados */
  cantidad_paseos_realizados?: number

  /** Tarifa por hora en la moneda local */
  tarifa_por_hora?: number

  /** Estado de verificación del perfil para confianza y seguridad */
  verificacion: EstadoVerificacion
}
