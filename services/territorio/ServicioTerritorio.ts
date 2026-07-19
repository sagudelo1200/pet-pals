import { latLngToCell } from 'h3-js'

/**
 * Resoluciones H3 estándar para Paw-Path
 * Centralizadas aquí para evitar números mágicos distribuidos por el código
 *
 * @internal
 */
const H3_RESOLUTIONS = {
  /** Resolución 8: ~460m de radio. Indexación primaria y cobertura de cuidadores. */
  TERRITORIAL: 8,
  /** Resolución 9: ~174m de radio. Microzoning y clustering de observaciones. */
  OBSERVACION: 9,
} as const

/**
 * ServicioTerritorio: Single Source of Truth para decisiones territoriales
 *
 * Centraliza TODA la lógica de mapeo geográfico—desde coordenadas GPS a contexto
 * territorial. Agnóstico respecto a resoluciones específicas, permitiendo expansión
 * futura (ciudad, barrio, timezone, clima, etc.) sin tocar callers.
 *
 * Principio: UI e infraestructura ignorantes de detalles territoriales.
 * Toda complejidad se localiza aquí.
 *
 * ARQUITECTURA FUTURA (NO IMPLEMENTAR HASTA DEMANDA REAL):
 * - Esta clase podría depender de una abstracción ITerritorialProvider
 *   para permitir swappear H3 por S2, Geohash, u otro sistema sin modificar callers.
 * - ContextoTerritorial podría evolucionar a Value Object con comportamiento:
 *   contexto.esMismaZona(), contexto.distancia(), etc.
 * - Agregar ContextoTerritorialCache cuando geocodificación reversa sea necesaria.
 *
 * @example
 * const contexto = ServicioTerritorio.obtenerContextoTerritorial(lat, lng)
 * // retorna:
 * // {
 * //   h3_r8: "892834829",              // R8 (~460m)
 * //   h3_r9: "892834829a",       // R9 (~174m)
 * //   precision_gps: 'alta'               // future
 * //   ciudad: 'Bogotá'                    // future
 * //   barrio: 'La Candelaria'             // future
 * //   timezone: 'America/Bogota'          // future
 * // }
 */

export interface ContextoTerritorial {
  // H3 actual (Multi-resolución)
  /** Celda H3 resolución 8 (~460m). Indexación primaria, queries de cobertura. */
  h3_r8: string
  /** Celda H3 resolución 9 (~174m). Microzoning, clustering de observaciones. */
  h3_r9: string

  // FUTURO (Expansion fields - comentarios muestran donde crece)
  // precision_gps?: 'alta' | 'media' | 'baja'
  // ciudad?: string
  // barrio?: string
  // timezone?: string
  // clima?: { temperatura: number; humedad: number; precipitacion: number }
  // zona_segura?: boolean
  // proveedor_mapa?: 'google' | 'osm'
}

export class ServicioTerritorio {
  /**
   * Obtiene contexto territorial completo para coordenadas GPS.
   *
   * ÚNICO punto de cálculo H3 en toda la aplicación.
   * Llamadores (Hooks, Services) nunca calculan H3 directamente—siempre
   * delegan aquí.
   *
   * Mañana: devuelve 20 campos sin tocar ni un caller.
   *
   * @param latitude - Latitud GPS (-90 a 90)
   * @param longitude - Longitud GPS (-180 a 180)
   * @returns Contexto territorial inmutable con H3 R8 + R9
   */
  static obtenerContextoTerritorial(
    latitude: number,
    longitude: number
  ): Readonly<ContextoTerritorial> {
    return Object.freeze({
      h3_r8: latLngToCell(latitude, longitude, H3_RESOLUTIONS.TERRITORIAL),
      h3_r9: latLngToCell(latitude, longitude, H3_RESOLUTIONS.OBSERVACION),
      // FUTURE: zona_segura, ciudad, barrio, timezone, clima, precision_gps...
    })
  }

  /**
   * Calcula índice H3 para una resolución específica.
   * Mantiene compatibilidad backward con código existente.
   *
   * Expresa propósito: "obtener una celda" — no implementación técnica.
   *
   * @deprecated Para nuevos desarrollos, usar obtenerContextoTerritorial()
   * @param latitude - Latitud GPS
   * @param longitude - Longitud GPS
   * @param resolucion - Resolución H3 (default: 8 para TERRITORIAL)
   * @returns Índice H3 en resolución especificada
   */
  static coordsAH3(
    latitude: number,
    longitude: number,
    resolucion: number = H3_RESOLUTIONS.TERRITORIAL
  ): string {
    return latLngToCell(latitude, longitude, resolucion)
  }

  /**
   * Calcula el índice H3 en una resolución específica.
   * Usado internamente cuando se necesita un nivel específico fuera del standard.
   *
   * @internal
   * @param latitude - Latitud GPS
   * @param longitude - Longitud GPS
   * @param resolucion - Resolución H3 (0-15)
   * @returns Índice H3
   */
  static calcularH3(
    latitude: number,
    longitude: number,
    resolucion: number
  ): string {
    return latLngToCell(latitude, longitude, resolucion)
  }
}

/**
 * NOTAS ARQUITECTÓNICAS PARA EVOLUCIÓN FUTURA
 * ============================================
 *
 * 1. ABSTRACCIÓN DE PROVEEDOR (NO IMPLEMENTAR AÚN)
 *    Si en el futuro necesitas experimentar con S2, Geohash, u otro sistema:
 *    - Introduce interfaz ITerritorialProvider
 *    - Delega H3 a una implementación H3Provider
 *    - ServicioTerritorio solo conoce la interfaz
 *    - Permite coexistencia de tecnologías sin modificar callers
 *
 * 2. VALUE OBJECT (NO IMPLEMENTAR AÚN)
 *    ContextoTerritorial podría ganar comportamiento:
 *    - contexto.esMismaZona(otro): boolean
 *    - contexto.esMismaMicrozona(otro): boolean
 *    - contexto.distancia(otro): number
 *    - contexto.esAdyacente(otro): boolean
 *    Hoy es suficiente como interfaz; espera demanda real.
 *
 * 3. CACHING (NO IMPLEMENTAR AÚN)
 *    Cuando geocodificación reversa sea necesaria:
 *    - Agregar ContextoTerritorialCache
 *    - H3 es barato, pero ciudad/barrio/timezone no
 *    - Evita queries repetidas a APIs externas
 *    Diseño actual lo permite fácilmente.
 *
 * 4. RESOLUCIONES ADICIONALES
 *    H3_RESOLUTIONS puede crecer cuando casos reales lo justifiquen:
 *    - ZONE: 7 (cobertura muy amplia)
 *    - PRECISE: 10 (análisis detallado)
 *    Nunca agregues sin demanda de negocio.
 *
 * PRINCIPIO: Mantén esto simple hasta que la realidad pida complejidad.
 */
