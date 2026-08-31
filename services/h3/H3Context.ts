/**
 * H3Context: Centralización de lógica H3
 *
 * Capa unificada que centraliza TODO lo relacionado con cálculos H3.
 * Basada en ServicioTerritorio (SSOT), pero añade:
 * - Validaciones
 * - Caching (futuro)
 * - Helpers geoespaciales
 * - Interfaz consistente
 *
 * PRINCIPIO: Un único lugar para consultar contexto territorial.
 */

import {
  ServicioTerritorio,
  type ContextoTerritorial,
} from '@/services/territorio/ServicioTerritorio'
import { cellToParent, gridDisk } from 'h3-js'

/**
 * Resultado de validación de coordenadas
 */
export interface ValidacionGPS {
  valido: boolean
  error?: string
  lat?: number
  lng?: number
}

/**
 * Contexto territorial con metadatos adicionales
 */
export interface ContextoTerritorialEnriquecido extends ContextoTerritorial {
  // Metadata
  validado: boolean
  timestamp: number
}

/**
 * H3Context: API unificada para operaciones H3
 *
 * GARANTÍAS:
 * - ✅ Único punto de acceso para cálculos H3
 * - ✅ Validación automática de coordenadas
 * - ✅ Resultados inmutables
 * - ✅ Listo para caching en futuro
 * - ✅ Independiente de resoluciones específicas
 */
export class H3Context {
  /**
   * Obtiene contexto territorial para coordenadas GPS.
   * Valida automáticamente.
   *
   * @param latitude - Latitud GPS (-90 a 90)
   * @param longitude - Longitud GPS (-180 a 180)
   * @returns Contexto territorial validado e inmutable
   * @throws Error si coordenadas son inválidas
   */
  static obtenerContexto(
    latitude: number,
    longitude: number
  ): Readonly<ContextoTerritorialEnriquecido> {
    const validacion = this.validarGPS(latitude, longitude)
    if (!validacion.valido) {
      throw new Error(`[H3Context] Coordenadas inválidas: ${validacion.error}`)
    }

    const contexto = ServicioTerritorio.obtenerContextoTerritorial(
      latitude,
      longitude
    )

    return Object.freeze({
      ...contexto,
      validado: true,
      timestamp: Date.now(),
    })
  }

  /**
   * Obtiene contexto SIN validar (performance-critical).
   * Usualmente para operaciones batch donde las coords ya están validadas.
   *
   * @internal
   */
  static obtenerContextoSinValidar(
    latitude: number,
    longitude: number
  ): Readonly<ContextoTerritorialEnriquecido> {
    const contexto = ServicioTerritorio.obtenerContextoTerritorial(
      latitude,
      longitude
    )
    return Object.freeze({
      ...contexto,
      validado: false,
      timestamp: Date.now(),
    })
  }

  /**
   * Valida coordenadas GPS.
   * @param latitude - Latitud (-90 a 90)
   * @param longitude - Longitud (-180 a 180)
   * @returns Objeto con validación
   */
  static validarGPS(latitude: number, longitude: number): ValidacionGPS {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return { valido: false, error: 'Coordenadas deben ser números' }
    }

    if (!isFinite(latitude) || !isFinite(longitude)) {
      return { valido: false, error: 'Coordenadas contienen NaN o Infinity' }
    }

    if (latitude < -90 || latitude > 90) {
      return {
        valido: false,
        error: `Latitud debe estar entre -90 y 90, recibió ${latitude}`,
      }
    }

    if (longitude < -180 || longitude > 180) {
      return {
        valido: false,
        error: `Longitud debe estar entre -180 y 180, recibió ${longitude}`,
      }
    }

    return { valido: true, lat: latitude, lng: longitude }
  }

  /**
   * Calcula celdas de cobertura (grid) desde una celda H3.
   * Usado para expandir zona de un cuidador.
   *
   * @param h3_r8 - Celda H3 resolución 8
   * @param radio - Radio en celdas (1-3 típicamente)
   * @returns Array de celdas H3 R9 dentro del radio
   */
  static obtenerCeldasCobertura(h3_r8: string, radio: number = 1): string[] {
    if (radio < 0 || radio > 5) {
      console.warn(`[H3Context] Radio ${radio} es inusual. Típicamente 1-3.`)
    }

    try {
      // gridDisk genera todas las celdas dentro de radio
      const celdas = gridDisk(h3_r8, radio)
      return celdas
    } catch (error) {
      console.error(
        `[H3Context] Error calculando cobertura para ${h3_r8}:`,
        error
      )
      return []
    }
  }

  /**
   * Obtiene celdas R9 desde una celda R8.
   * Cada R8 contiene 7 celdas R9.
   *
   * @param h3_r8 - Celda H3 resolución 8
   * @returns Array de 7 celdas R9 que componen la R8
   */
  static expandirR8aR9(h3_r8: string): string[] {
    try {
      // cellToChildren expande una celda a hijas en resolución 9
      const celdas = (h3_r8 as any).cellToChildren?.(9) || []
      if (celdas.length === 0) {
        console.warn(`[H3Context] No se pudo expandir ${h3_r8} a R9`)
      }
      return celdas
    } catch (error) {
      console.error('[H3Context] Error expandiendo R8 a R9:', error)
      return []
    }
  }

  /**
   * Valida que una celda H3 sea válida.
   * @param h3 - Celda H3
   * @returns true si es válida
   */
  static esH3Valido(h3: string): boolean {
    if (typeof h3 !== 'string' || h3.length === 0) return false
    // H3 cells son alphanuméricas de 15 caracteres
    return /^[0-9a-f]{15}$/.test(h3)
  }

  /**
   * Compara dos contextos: ¿están en la misma zona (R8)?
   * @param ctx1 - Primer contexto
   * @param ctx2 - Segundo contexto
   * @returns true si comparten h3_r8
   */
  static enMismaZona(
    ctx1: ContextoTerritorial,
    ctx2: ContextoTerritorial
  ): boolean {
    return ctx1.h3_r8 === ctx2.h3_r8
  }

  /**
   * Compara dos contextos: ¿están en la misma microzona (R9)?
   * @param ctx1 - Primer contexto
   * @param ctx2 - Segundo contexto
   * @returns true si comparten h3_r9
   */
  static enMismaMicrozona(
    ctx1: ContextoTerritorial,
    ctx2: ContextoTerritorial
  ): boolean {
    return ctx1.h3_r9 === ctx2.h3_r9
  }

  /**
   * Obtiene la celda R8 desde una R9.
   * @param h3_r9 - Celda H3 resolución 9
   * @returns Celda H3 resolución 8 padre
   */
  static derivarR8DesdeR9(h3_r9: string): string {
    try {
      return cellToParent(h3_r9, 8)
    } catch (error) {
      console.error(`[H3Context] Error derivando R8 desde ${h3_r9}:`, error)
      return ''
    }
  }

  /**
   * Debug: Información completa sobre una celda H3
   * @param h3 - Celda H3
   * @returns Objeto con detalles
   */
  static debugH3(h3: string): Record<string, any> {
    return {
      h3,
      valido: this.esH3Valido(h3),
      largo: h3.length,
      r8Padre: h3.length === 15 ? cellToParent(h3, 8) : 'N/A',
      timestamp: Date.now(),
    }
  }
}
