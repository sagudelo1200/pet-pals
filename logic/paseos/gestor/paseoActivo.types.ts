import type { Paseo, ESTADOS_PASEO } from '@/models/Paseo'
import type { Usuario } from '@/models/Usuario'

/**
 * Códigos de error para operaciones del gestor de paseo activo
 */
export type CodigoErrorPaseo =
  | 'NO_HAY_PASEO_ACTIVO'
  | 'TRANSICION_INVALIDA'
  | 'ESTADO_INCORRECTO'
  | 'SIN_PERMISOS'
  | 'ERROR_RED'
  | 'ERROR_VALIDACION'
  | 'MOTIVO_REQUERIDO'

/**
 * Timestamps relevantes del ciclo de vida de un paseo
 */
export interface PaseoActivoTimestamps {
  /** Fecha de creación del paseo */
  creado?: Date
  /** Fecha cuando el cuidador aceptó el paseo */
  confirmado?: Date
  /** Fecha cuando el cuidador inició la ruta hacia el punto de encuentro */
  enCamino?: Date
  /** Fecha cuando el paseo comenzó realmente */
  iniciado?: Date
  /** Fecha cuando el paseo finalizó */
  finalizado?: Date
  /** Fecha cuando el paseo fue cancelado */
  cancelado?: Date
  /** Fecha cuando el tutor confirmó la finalización */
  completado?: Date
}

/**
 * Representación simplificada del paseo activo para el gestor
 */
export interface PaseoActivo {
  /** ID único del paseo */
  id: string
  /** Estado actual del paseo */
  estado: ESTADOS_PASEO
  /** Información del tutor */
  tutor: Partial<Usuario>
  /** Información del cuidador (si está asignado) */
  cuidador?: Partial<Usuario>
  /** IDs de las mascotas participantes */
  mascota_ids?: string[]
  /** Dirección de inicio del paseo */
  direccion?: string
  /** Timestamps del ciclo de vida */
  timestamps: PaseoActivoTimestamps
  /** Indica si el paseo está activo (no finalizado/cancelado) */
  esActivo: boolean
  /** Referencia al objeto Paseo original completo */
  original?: Partial<Paseo>
}

/**
 * Resultado de una acción síncrona del gestor
 */
export type ResultadoAccion =
  | { ok: true }
  | { ok: false; error: CodigoErrorPaseo; detalles?: string }

