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

  /**
   * Coordenadas geográficas obligatorias — fuente de verdad para cualquier cálculo.
   * ESTÁNDAR: siempre usar {latitude, longitude}. NO usar {lat, lng}.
   * Los conversores de Firebase transforman automáticamente a/desde GeoPoint.
   */
  coordenadas: {
    latitude: number
    longitude: number
  }

  /**
   * Índice H3 de resolución 8 (~460m, calculado desde `coordenadas`).
   * Se almacena para evitar recalcular y permitir queries geoespaciales.
   */
  h3_r8?: string

  /**
   * Índice H3 de resolución 9 (~174m, opcional).
   * Se almacena cuando se requiere precisión fina para observaciones.
   */
  h3_r9?: string

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
  alias?: string
  direccion_formateada?: string
  es_principal?: boolean
  desde?: Date
  hasta?: Date
  /** Snapshot de coordenadas para preview rápido sin fetch */
  coordenadas?: {
    latitude: number
    longitude: number
  }
  /** Índice H3 resolución 8 (~460m) de la ubicación para matching geoespacial */
  h3_r8?: string
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
