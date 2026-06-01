import { BaseModel } from './BaseModel'

/** Tipo de punto territorial observado */
export type TipoPunto =
  | 'parque'
  | 'calle'
  | 'comercio'
  | 'conjunto'
  | 'nodo_social'
  | 'otro'

/** Nivel de flujo o intensidad observable */
export type NivelObservable = 'bajo' | 'medio' | 'alto'

/** Nivel de recurrencia observada */
export type NivelRecurrencia = 'baja' | 'media' | 'alta'

/**
 * Captura territorial individual realizada por un explorador.
 * Representa una observación de campo en una celda H3 específica.
 */
export interface ExploracionTerritorial extends BaseModel {
  /** ID del explorador que realizó la captura */
  id_explorador: string

  /** Índice H3 de la celda observada (resolución 8) */
  h3_index: string

  /** Coordenadas exactas de la observación */
  coordenadas: {
    latitude: number
    longitude: number
  }

  /** Dirección formateada legible (opcional) */
  direccion_formateada?: string

  /** Tipo de punto territorial observado */
  tipo_punto: TipoPunto

  /** Cantidad de mascotas visibles en el momento */
  mascotas_visibles: number

  /** Cantidad de personas con mascota observadas */
  personas_con_mascota: number

  /** Nivel de flujo peatonal */
  flujo_peatonal: NivelObservable

  /** Nivel de recurrencia observada en la zona */
  recurrencia_observada: NivelRecurrencia

  /** Nivel de seguridad percibida */
  seguridad_percibida: NivelObservable

  /** Nivel pet-friendly del entorno */
  pet_friendly: NivelObservable

  /** Disposición percibida de uso de la app */
  disposicion_uso_app: NivelObservable

  /** Cantidad de comercios pet-friendly observados */
  comercios_pet_friendly: number

  /** Cantidad de personas que manifestaron interés */
  interesados_count: number

  /** Teléfonos de interesados (con consentimiento) */
  telefonos_interesados?: string[]

  /** Horarios activos observados (formato HH:mm) */
  horarios_activos?: string[]

  /** Observaciones textuales libres */
  observaciones?: string

  /** URL de foto del entorno (opcional) */
  foto_url?: string

  /** Indica si fue sincronizada con el servidor */
  sincronizado: boolean
}
