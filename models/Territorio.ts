import { BaseModel } from './BaseModel'

/**
 * Agregación territorial a nivel H3 R9 (microzona ~460m)
 * Se actualiza automáticamente con cada evento registrado en ese territorio.
 *
 * Representa: "¿Qué pasa en este territorio?"
 * Preguntas que responde:
 * - ¿Cuántos eventos ocurrieron aquí?
 * - ¿Qué tipos de acciones son más comunes?
 * - ¿Cuál es el clima promedio?
 * - ¿Qué hora del día es más activa?
 */
export interface Territorio extends BaseModel {
  /** Indexación geoespacial H3 nivel 9 (única clave) */
  h3_r9: string

  /** Indexación H3 nivel 8 (ciudad/barrio) para agrupación */
  h3_r8: string

  /** Total de eventos registrados en este territorio */
  total_eventos: number

  /** Conteo de eventos por tipo de acción */
  eventos_por_tipo: {
    [accion: string]: number // "juego": 20, "tomo_agua": 15, "descanso": 10, etc
  }

  /** Acciones más comunes (top 3) */
  acciones_top: Array<{ accion: string; count: number; porcentaje: number }>

  /** Datos climáticos agregados */
  clima: {
    /** Clima más registrado */
    clima_predominante?:
      'soleado' | 'nublado' | 'lluvia' | 'nieve' | 'desconocido'

    /** Temperatura promedio registrada */
    temperatura_promedio?: number

    /** Temperatura máxima registrada */
    temperatura_max?: number

    /** Temperatura mínima registrada */
    temperatura_min?: number

    /** Precipitación acumulada (mm) */
    precipitacion_acumulada?: number
  }

  /** Distribución de actividad por hora del día (0-23) */
  actividad_por_hora: {
    [hora: string]: number // "14": 25 eventos a las 14h, etc
  }

  /** Hora pico de actividad */
  hora_pico?: number // 0-23

  /** Topografía agregada */
  topografia?: {
    elevacion_promedio?: number
    pendiente_promedio?: number
  }

  /** Nombre de la ubicación (desde último evento con Nominatim) */
  nombre_ubicacion?: string
  nombre_barrio?: string

  /** Próxima hora cuando debería recalcular estadísticas */
  proximo_recalculo_en?: number

  /** Timestamp de la última actualización */
  ultima_actualizacion_en: number
}

/**
 * Patrón territorial: secuencia de acciones detectada en cliente
 * Documentado para análisis y futuros Cloud Functions
 */
export interface PatronTerritorial {
  secuencia: string[] // ["tomo_agua", "descanso"]
  cant_ocurrencias: number
  ultima_vez_en: number // timestamp
  porcentaje: number // respecto al total de secuencias
}
