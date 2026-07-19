import { BaseModel } from './BaseModel'
import type { UbicacionSnapshot } from '@/models/Ubicacion'

/**
 * Tipos de paseo disponibles.
 * 'solicitado' para paseos a demanda, 'programado' para paseos con horario fijo.
 */
export type TipoPaseo = 'solicitado' | 'programado'

/**
 * Estados posibles de un paseo.
 * Controla el flujo desde solicitud hasta conclusión o cancelación.
 */
/* eslint-disable no-unused-vars */
// Los valores del enum `ESTADOS_PASEO` se usan en múltiples módulos del proyecto.
export enum ESTADOS_PASEO {
  PENDIENTE = 'PENDIENTE',
  CONFIRMADO = 'CONFIRMADO',
  EN_CAMINO = 'EN_CAMINO',
  EN_PUNTO_RECOGIDA = 'EN_PUNTO_RECOGIDA',
  EN_PROGRESO = 'EN_PROGRESO',
  FINALIZADO = 'FINALIZADO',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO',
  ERROR = 'ERROR',
}

/**
 * Modalidad del paseo que define si acepta mascotas de otros tutores.
 * 'privado' = Solo las mascotas del tutor que creó el paseo
 * 'compartido' = Acepta que otros tutores unan sus mascotas (paseo grupal)
 */
export type ModalidadPaseo = 'privado' | 'compartido'

/**
 * Tipos de eventos que ocurren durante un paseo.
 * La bitácora es la secuencia cronológica de eventos que cuentan la historia del paseo.
 */
export type TipoEventoPaseo =
  | 'bitacora' // Momento registrado por cuidador (acciones mascota, lugares, recuerdos)
  | 'incidente' // Alerta/problema durante el paseo
  | 'estado' // Cambio de estado (CONFIRMADO → EN_CAMINO)
  | 'gps' // Actualización de ubicación
  | 'codigo' // Validación de código de recogida
  | 'sistema' // Otros eventos técnicos

/**
 * Estructura base para todos los eventos que ocurren en un paseo.
 * Vive en la subcollection paseos/{id}/eventos
 *
 * ARQUITECTURA DE CAPAS:
 * - Capa 1 (Hecho): Datos automáticos, nunca cambian
 * - Capa 2 (Contexto): Enriquecimiento automático (Fase 2)
 * - Capa 3 (Interpretación): IA aprende patrones (Cloud Function)
 */
export interface EventoPaseo extends BaseModel {
  /** Tipo de evento (bitácora, incidente, estado, etc) */
  tipoEvento: TipoEventoPaseo

  /** Payload específico según el tipo de evento */
  payload: any

  /** Usuario que generó el evento (cuidador, sistema, etc) */
  actor?: string

  /** Capa 1 — Hecho Territorial: datos automáticos, nunca cambian */
  hechoTerritorial?: CapaTerritorialHecho

  /** Capa 2 — Contexto Territorial: enriquecimiento del entorno (Fase 2) */
  contextoTerritorial?: CapaContextoTerritorial

  /** Capa 3a — Patrón Inferido: detectado en cliente (secuencias simples) */
  patron_inferido?: string
}

/**
 * Payload específico para eventos tipo 'bitacora' (observación pura)
 * Solo lo que el cuidador observó. Sin interpretación.
 * Fase 1: Datos simples. El enriquecimiento automático va en hechoTerritorial.
 */
export interface PayloadObservacion {
  /** Acción observada (jugó, corrió, tomo_agua, etc) */
  accion: string
  /** Nota adicional del cuidador (máx 200 chars) */
  nota?: string
  /** Ubicación GPS donde ocurrió */
  ubicacion: {
    lat: number
    lng: number
  }
}

/**
 * Compatibilidad: alias para migraciones posteriores
 */
export type PayloadBitacora = PayloadObservacion

/**
 * Capa 1 — Hecho Territorial
 * Datos automáticos, nunca cambian, capturados al momento del evento.
 * Responden: ¿dónde, cuándo, con qué precisión?
 */
export interface CapaTerritorialHecho {
  /** Indexación geoespacial H3 */
  h3_r8: string
  h3_r9: string

  /** Timing absoluto */
  timestamp: number

  /** Duración desde inicio del paseo (segundos) */
  duracion_desde_inicio_paseo_segundos: number

  /** Medidas automáticas del GPS */
  gps_accuracy_metros?: number

  /** Elevación y topografía (null en Fase 1, enriquecerá en Fase 2) */
  elevacion_metros?: number
  pendiente_grados?: number

  /** Velocidad promedio reciente (km/h, calculada desde puntos GPS) */
  velocidad_media_reciente_kmh?: number
}

/**
 * Capa 2 — Contexto Territorial
 * Datos enriquecidos del entorno en el momento del evento.
 * Fase 2: Con APIs públicas gratuitas (Open-Elevation, Open-Meteo, Nominatim)
 * Responden: ¿qué había alrededor?
 */
export interface CapaContextoTerritorial {
  /** Hora local derivada del timestamp */
  hora_local?: string

  /** Tipo de zona según OSM (parque, acera, sendero, agua, comercio, etc) */
  tipo_zona_osm?:
    | 'parque'
    | 'acera'
    | 'sendero'
    | 'agua'
    | 'comercio'
    | 'residencial'
    | 'desconocido'

  /** Distancia a punto de interés conocido (metros) */
  distancia_a_punto_interes_metros?: number

  /** Tipo de superficie donde ocurrió */
  tipo_superficie?:
    'pasto' | 'tierra' | 'arena' | 'asfalto' | 'piedra' | 'desconocido'

  /** Nivel de sombra estimado */
  sombra?: 'soleado' | 'mixto' | 'sombra'

  /** Visibilidad del entorno */
  visibilidad?: 'abierta' | 'moderada' | 'restringida'

  /** Ruido ambiental en dB (future: sensor de device) */
  ruido_db?: number

  /** Clima actual (soleado, nublado, lluvia, nieve) — Open-Meteo API */
  clima_actual?: 'soleado' | 'nublado' | 'lluvia' | 'nieve' | 'desconocido'

  /** Temperatura en Celsius — Open-Meteo API */
  temperatura_c?: number

  /** Precipitación en mm — Open-Meteo API */
  precipitacion_mm?: number

  /** Nombre de calle/zona — Nominatim OSM reverse geocoding */
  nombre_ubicacion?: string

  /** Barrio/localidad — Nominatim OSM */
  nombre_barrio?: string

  /** Si hay cuerpo de agua cercano (ríos, lagos, parques con agua) */
  tiene_agua_cercana?: boolean

  /** Elevación en metros — Open-Elevation API */
  elevacion_metros?: number

  /** Pendiente promedio en grados — Open-Elevation API */
  pendiente_grados?: number
}

/**
 * Payload específico para eventos tipo 'incidente'
 * Representa un problema o alerta durante el paseo
 */
export interface PayloadIncidente {
  /** Tipo de incidente (asustó, lastimó, pelea, lluvia, etc) */
  tipo: string
  /** Nivel de severidad */
  severidad: 'baja' | 'media' | 'critica'
  /** Descripción detallada del incidente */
  descripcion?: string
  /** Ubicación donde ocurrió */
  ubicacion?: {
    lat: number
    lng: number
    h3_r8?: string
    h3_r9?: string
  }
  /** Timestamp del evento */
  timestamp: number
}

/**
 * Representa un servicio de paseo de mascota.
 * Contiene información sobre quién solicita, quién pasea, duración, precio y localización.
 */
export interface Paseo extends BaseModel {
  /** ID del cuidador asignado al servicio (puede no estar asignado inicialmente). */
  id_cuidador?: string

  /**
   * Modalidad del paseo: 'privado' (solo mis mascotas) o 'compartido' (acepta otros tutores).
   * Define si el paseo permite que otros tutores unan sus mascotas.
   */
  modalidad?: ModalidadPaseo

  /** Cupo máximo de mascotas TOTALES para este paseo (incluyendo de todos los tutores). */
  cupo_maximo_mascotas?: number
  /** Contador actual de mascotas unidas a este paseo (subcolección). */
  mascotas_count?: number
  /** IDs de las mascotas participantes (para optimización de consultas). */
  mascota_ids?: string[]
  /** IDs de los tutores participantes (para paseos compartidos). */
  tutor_ids?: string[]
  /** Tipo de paseo (a demanda o programado). */
  tipo_paseo: TipoPaseo
  /** Fecha y hora de inicio del paseo. */
  fecha_hora_inicio: Date
  /** Duración estimada en minutos. */
  duracion_estimada: number
  /** Duración real */
  duracion_real?: number
  /** Costo del servicio en la moneda local. */
  precio: number
  /** Estado actual del paseo. */
  estado: ESTADOS_PASEO
  /** Fecha y hora real de inicio del paseo (cuando pasa a EN_PROGRESO). */
  fecha_inicio_real?: Date
  /** Fecha y hora real de fin del paseo (cuando pasa a FINALIZADO). */
  fecha_fin_real?: Date
  /** Ubicación de inicio (dirección o coordenadas). */
  ubicacion_inicio?: UbicacionSnapshot | string
  /** Texto legible de la ubicación de inicio (ej. "Casa", "Trabajo") para listas. */
  ubicacion_inicio_txt?: string
  /** Ubicación de término (dirección o coordenadas). */
  ubicacion_fin?: UbicacionSnapshot | string
  /** Texto legible de la ubicación de fin para listas. */
  ubicacion_fin_txt?: string
  /** Referencia al documento de tracking GPS si aplica. */
  tracking_gps?: string
  /** Nombre de la primera mascota para visualización en listas. */
  mascota_nombre_visual?: string
  /** Foto de la primera mascota para visualización en listas. */
  mascota_foto_visual?: string
  /** Lista de fotos (hasta 4) para paseos múltiples. */
  mascotas_fotos_visual?: string[]
  /** Nombre del cuidador para visualización en listas. */
  cuidador_nombre_visual?: string
  /** Foto del cuidador para visualización en listas. */
  cuidador_foto_visual?: string
  /** Tipo de solicitud: DIRECTA (a un cuidador) o ABIERTA (visible a varios cuidadores). */
  tipo_solicitud?: 'DIRECTA' | 'ABIERTA'

  /** Modo de transporte seleccionado por el cuidador durante EN_CAMINO: 'walking' o 'driving'. */
  modo_transporte_actual?: 'walking' | 'driving'

  /**
   * VALIDACIÓN DE RECOGIDA (POR TUTOR)
   * En paseos compartidos, cada tutor tiene su propio código.
   * En paseos privados, hay un único código.
   */
  /** Códigos de recogida por tutor: { [tutorId]: codigo_6_digitos }. */
  codigos_recogida_por_tutor?: Record<string, string>
  /** Códigos validados por tutor: { [tutorId]: boolean }. */
  codigo_recogida_validado_por_tutor?: Record<string, boolean>
  /** Timestamp de validación de recogida por tutor: { [tutorId]: Date }. */
  timestamp_validacion_recogida_por_tutor?: Record<string, Date>
  /** Intentos fallidos de recogida por tutor: { [tutorId]: number }. */
  intentos_fallidos_recogida_por_tutor?: Record<string, number>

  /**
   * VALIDACIÓN DE ENTREGA (POR TUTOR)
   * Similar a recogida: cada tutor valida la entrega de sus mascotas.
   */
  /** Códigos de entrega por tutor: { [tutorId]: codigo_6_digitos }. */
  codigos_entrega_por_tutor?: Record<string, string>
  /** Códigos de entrega validados por tutor: { [tutorId]: boolean }. */
  codigo_entrega_validado_por_tutor?: Record<string, boolean>
  /** Timestamp de validación de entrega por tutor: { [tutorId]: Date }. */
  timestamp_validacion_entrega_por_tutor?: Record<string, Date>
  /** Intentos fallidos de entrega por tutor: { [tutorId]: number }. */
  intentos_fallidos_entrega_por_tutor?: Record<string, number>
}
