import { BaseModel } from './BaseModel'

/** Estado de verificación del perfil público */
export type EstadoVerificacion = 'pendiente' | 'verificado' | 'rechazado'

/** Franja horaria con hora de inicio y fin en formato HH:mm */
export interface FranjaHoraria {
  inicio: string // "08:00"
  fin: string // "18:00"
}

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

  /**
   * Horario semanal recurrente del cuidador.
   * Clave: número de día como string ("0"=Dom, "1"=Lun, ..., "6"=Sáb).
   * Valor: franja horaria activa ese día. Si la clave no está presente, el día es inactivo.
   */
  horario_semanal?: Record<string, FranjaHoraria>

  /**
   * Celdas H3 de cobertura definidas manualmente por el cuidador (resolución 8).
   * Si está presente, reemplaza el gridDisk(h3_home, 2) automático en el índice.
   */
  celdas_cobertura?: string[]

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
