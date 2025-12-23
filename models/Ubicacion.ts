import { BaseModel } from './BaseModel'

/**
 * Modelo canónico de ubicación (dirección geocodificada).
 * - Nombres en español y snake_case para ser consistente con el repo.
 * - Nunca debe crearse sin `coordenadas` y `proveedor` + `proveedor_place_id`.
 */
/** Proveedores permitidos actualmente. Añadir nuevos proveedores requiere migración leve: agregar literal y manejar `provider` en backend. */
export type ProveedorMapa = 'google' | 'mapbox'

export interface Ubicacion extends BaseModel {
  /** proveedor del placeId (google | mapbox). Tipo estricto para evitar datos sueltos. */
  proveedor: ProveedorMapa

  /** identificador del lugar en el proveedor (place_id, id de lugar). Combinado con `proveedor` define unicidad lógica. */
  proveedor_place_id: string

  /** dirección formateada tal como la devuelve el proveedor */
  direccion_formateada: string

  /** coordenadas geográficas obligatorias — fuente de verdad para cualquier cálculo */
  coordenadas: {
    latitude: number
    longitude: number
  }

  /**
   * Componentes parseados (opcional). NO son la fuente de verdad — sólo ayudan a mostrar/filtrar.
   * En LATAM es común que muchos campos falten (sin numeración, barrios informales, "frente a...").
   */
  componentes?: {
    pais?: string
    departamento?: string // en Colombia: departamento (no "estado")
    ciudad?: string
    localidad?: string // alcaldías/localidades cuando aplique (p. ej. Bogotá)
    barrio?: string // muy relevante en LATAM
    codigo_postal?: string // dato débil, no crítico
    ruta?: string
    numero?: string
  }

  /** viewport o bounding box del place (opcional) */
  viewport?: {
    northeast: { lat: number; lng: number }
    southwest: { lat: number; lng: number }
  }

  /** alias legible por usuario (Casa, Trabajo) */
  alias?: string

  /** indicaciones humanas separadas de la dirección formal (ej: "Portón negro") */
  instrucciones?: string

  /** datos crudos del proveedor u otros metadatos */
  metadata?: Record<string, any>

  /**
   * Estado explícito de la ubicación: gestiona flujos de verificación y obsolescencia.
   * - 'pendiente': creada desde frontend pero no confirmada por usuario/admin.
   * - 'verificada': confirmada por el usuario (o proceso automático + validación).
   * - 'obsoleta': lugar marcado como inválido (por cambios, duplicados o reclamos).
   */
  estado: 'pendiente' | 'verificada' | 'obsoleta'
}

/**
 * Referencia de ubicación usada por `Usuario`, `Mascota` o `Cuidador`.
 * Permite múltiples enlaces a la misma `Ubicacion` y metadatos por relación.
 */
export interface UbicacionRef {
  ubicacion_id: string
  /** tipo semántico: 'domicilio' | 'sede' | 'punto_servicio' | 'vacacional' | ... */
  tipo?: string
  es_principal?: boolean
  desde?: Date
  hasta?: Date
  /** Snapshot de coordenadas para preview rápido sin fetch */
  coordenadas?: {
    latitude: number
    longitude: number
  }
}

/**
 * Snapshot de una ubicación para guardar en historiales (Paseos, Servicios).
 * Copia los datos esenciales para no depender de la referencia mutable `Ubicacion`.
 * Esto garantiza que si el usuario edita su dirección "Casa", el historial de paseos pasados
 * mantenga la dirección exacta donde ocurrió.
 */
export interface UbicacionSnapshot {
  direccion_formateada: string
  coordenadas: {
    latitude: number
    longitude: number
  }
  /** Opcional: ID de la ubicación original si existía */
  id_origen?: string
  /** Opcional: Alias en el momento del snapshot (ej. "Casa") */
  alias?: string
  /** Opcional: Instrucciones en el momento del servicio */
  instrucciones?: string
}

/**
 * Representa una actualización de ubicación en tiempo real (RTDB).
 * Optimizado para baja latencia y frecuencia alta de actualizaciones.
 */
export interface UbicacionRealtime {
  /** Latitud actual */
  latitud: number
  /** Longitud actual */
  longitud: number
  /** Velocidad en m/s (opcional) */
  velocidad?: number
  /** Rumbo/Dirección en grados (0-360) (opcional) */
  rumbo?: number
  /** Precisión en metros (opcional) */
  precision?: number
  /** Timestamp del servidor o local de la actualización */
  actualizado_en: number | any
}
