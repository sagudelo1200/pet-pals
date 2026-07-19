import { BaseModel } from './BaseModel'

/** Tipo de punto territorial observado */
export type TipoPunto = 'parque' | 'calle' | 'comercio' | 'conjunto' | 'otro'

/** Nivel de flujo o intensidad observable */
export type NivelObservable = 'bajo' | 'medio' | 'alto'

/** Estado de validación de la exploración */
export type EstadoExploracion = 'pendiente' | 'validada' | 'rechazada'

/**
 * Captura territorial individual realizada por un explorador.
 * MVP simplificado: máximo 8 campos para captura rápida (< 2 min).
 */
export interface ExploracionTerritorial extends BaseModel {
  /** ID del explorador que realizó la captura (heredado de creado_por) */
  id_explorador: string

  /** Índice H3 de resolución 8 (~460m). Indexación primaria y cobertura. */
  h3_r8: string

  /** Índice H3 de resolución 9 (~174m). Microzoning y clustering de observaciones. */
  h3_r9: string

  /** Coordenadas exactas de la observación */
  coordenadas: {
    latitude: number
    longitude: number
  }

  /** Tipo de punto territorial observado */
  tipo_punto: TipoPunto

  /** Cantidad de mascotas visibles (0-100) */
  mascotas_visibles: number

  /** Nivel de flujo peatonal percibido */
  flujo_peatonal: NivelObservable

  /** Estado de validación */
  estado: EstadoExploracion

  /** Huellas otorgadas si estado = 'validada' */
  huellas_otorgadas?: number

  /** Huellas inmediatas (siempre 5 por exploración) */
  huellas_inmediatas: number

  /** Observaciones textuales libres (opcional, ≤ 250 chars) */
  observaciones?: string

  /** URL de foto del entorno (opcional) */
  foto_url?: string

  /** Razón del rechazo si estado = 'rechazada' */
  razon_rechazo?: string
}
