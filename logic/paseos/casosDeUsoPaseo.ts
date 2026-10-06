/**
 * CASOS DE USO PASEO - LÓGICA ESPECIALIZADA
 *
 * Extiende CasosDeUsoOperacion con transiciones y lógica específica de paseos.
 * Define los estados adicionales: EN_CAMINO, EN_PUNTO_RECOGIDA.
 *
 * Estos estados NO existen en la máquina genérica de Operacion.
 * Son atajos para flujos comunes en paseos:
 * - EN_CAMINO: Cuidador en ruta hacia punto de recogida
 * - EN_PUNTO_RECOGIDA: Cuidador esperando mascota en el punto
 */

import { ESTADOS_PASEO } from '@/models/Paseo'
import { ESTADOS_OPERACION } from '@/models/Operacion'
import { ServicioPaseo } from '@/services/firebase/firestore/colecciones/paseo'
import { CasosDeUsoOperacion } from '../operaciones/casosDeUso'

/**
 * Transiciones válidas específicas para Paseo
 * Incluye los estados adicionales: EN_CAMINO y EN_PUNTO_RECOGIDA
 */
const TRANSICIONES_VALIDAS_PASEO: Record<string, string[]> = {
  [ESTADOS_OPERACION.PENDIENTE]: [
    ESTADOS_OPERACION.CONFIRMADO,
    ESTADOS_OPERACION.CANCELADO,
  ],
  [ESTADOS_OPERACION.CONFIRMADO]: [
    ESTADOS_PASEO.EN_CAMINO, // Cuidador saliendo hacia recogida
    ESTADOS_OPERACION.CANCELADO,
  ],
  [ESTADOS_PASEO.EN_CAMINO]: [
    ESTADOS_PASEO.EN_PUNTO_RECOGIDA, // Cuidador llegó a punto
    ESTADOS_OPERACION.CANCELADO,
  ],
  [ESTADOS_PASEO.EN_PUNTO_RECOGIDA]: [
    ESTADOS_OPERACION.EN_PROGRESO, // Mascota recogida, paseo iniciado
    ESTADOS_OPERACION.CANCELADO,
  ],
  [ESTADOS_OPERACION.EN_PROGRESO]: [
    ESTADOS_OPERACION.FINALIZADO, // Paseo completado, regresó
    ESTADOS_OPERACION.CANCELADO,
  ],
  [ESTADOS_OPERACION.FINALIZADO]: [
    ESTADOS_OPERACION.COMPLETADO, // Validado/revisado
    ESTADOS_OPERACION.CANCELADO,
  ],
  [ESTADOS_OPERACION.COMPLETADO]: [
    ESTADOS_OPERACION.LIQUIDADA, // Pagado
    ESTADOS_OPERACION.CANCELADO,
  ],
  [ESTADOS_OPERACION.LIQUIDADA]: [],
  [ESTADOS_OPERACION.CANCELADO]: [],
  [ESTADOS_OPERACION.ERROR]: [
    ESTADOS_OPERACION.PENDIENTE,
    ESTADOS_OPERACION.CANCELADO,
  ],
}

/**
 * Casos de uso específicos de Paseo
 * Extiende la lógica genérica de Operacion
 */
export class CasosDeUsoPaseo extends CasosDeUsoOperacion {
  /**
   * Validar si una transición de estado es permitida en un Paseo
   * Usa máquina de transiciones específica de paseo
   */
  static validarTransicionPaseo(
    estadoActual: string,
    estadoNuevo: string
  ): boolean {
    const permitidos = TRANSICIONES_VALIDAS_PASEO[estadoActual] || []
    return permitidos.includes(estadoNuevo)
  }

  /**
   * Obtener estados permitidos desde un estado actual en Paseo
   */
  static obtenerTransicionesPosiblesPaseo(estadoActual: string): string[] {
    return TRANSICIONES_VALIDAS_PASEO[estadoActual] || []
  }

  /**
   * Cambiar estado de un paseo de forma segura
   * Usa máquina de transiciones específica de paseo
   */
  static async cambiarEstadoPaseo(
    paseoId: string,
    nuevoEstado: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const paseo = await ServicioPaseo.obtenerPorId(paseoId)

      if (!paseo.success) {
        return { success: false, error: 'Paseo no encontrado' }
      }

      // Validar transición usando máquina de paseo
      if (!this.validarTransicionPaseo(paseo.data!.estado, nuevoEstado)) {
        return {
          success: false,
          error: `Transición no permitida: ${paseo.data!.estado} → ${nuevoEstado}`,
        }
      }

      // Actualizar
      const resultActualizar = await ServicioPaseo.actualizar(paseoId, {
        estado: nuevoEstado as any,
      })

      if (!resultActualizar.success) {
        return {
          success: false,
          error: resultActualizar.error || 'Error actualizando paseo',
        }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: `Error cambiando estado del paseo: ${String(error)}`,
      }
    }
  }

  /**
   * Cuidador inicia ruta hacia punto de recogida
   * CONFIRMADO → EN_CAMINO
   */
  static async iniciarRuta(paseoId: string): Promise<{
    success: boolean
    error?: string
  }> {
    return this.cambiarEstadoPaseo(paseoId, ESTADOS_PASEO.EN_CAMINO)
  }

  /**
   * Cuidador llega al punto de recogida
   * EN_CAMINO → EN_PUNTO_RECOGIDA
   */
  static async llegarAlPunto(paseoId: string): Promise<{
    success: boolean
    error?: string
  }> {
    return this.cambiarEstadoPaseo(paseoId, ESTADOS_PASEO.EN_PUNTO_RECOGIDA)
  }

  /**
   * Paseo activo (mascota recogida, iniciado)
   * EN_PUNTO_RECOGIDA → EN_PROGRESO
   */
  static async iniciarPaseo(paseoId: string): Promise<{
    success: boolean
    error?: string
  }> {
    return this.cambiarEstadoPaseo(paseoId, ESTADOS_OPERACION.EN_PROGRESO)
  }

  /**
   * Paseo completado (cuidador regresó)
   * EN_PROGRESO → FINALIZADO
   */
  static async finalizarPaseo(paseoId: string): Promise<{
    success: boolean
    error?: string
  }> {
    return this.cambiarEstadoPaseo(paseoId, ESTADOS_OPERACION.FINALIZADO)
  }

  /**
   * Validar código de recogida
   * Paso importante antes de EN_PUNTO_RECOGIDA → EN_PROGRESO
   *
   * TODO: Implementar con lógica de códigos (actualmente en servicios viejos)
   */
  static async validarCodigoRecogida(
    _paseoId: string,
    _tutorId: string,
    _codigo: string
  ): Promise<{ success: boolean; error?: string; validado?: boolean }> {
    return {
      success: false,
      error: 'validarCodigoRecogida aún no implementado en casosDeUsoPaseo',
    }
  }

  /**
   * Registrar evento en bitácora del paseo
   * TODO: Implementar con lógica de enriquecimiento territorial
   */
  static async registrarBitacora(
    _paseoId: string,
    _accion: string,
    _opciones?: {
      nota?: string
      ubicacion?: { lat: number; lng: number }
      horaLocal?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    return {
      success: false,
      error: 'registrarBitacora aún no implementado',
    }
  }

  /**
   * Registrar incidente durante paseo
   * TODO: Implementar con severidad y notificaciones
   */
  static async registrarIncidente(
    _paseoId: string,
    _tipo: string,
    _severidad: 'baja' | 'media' | 'critica',
    _opciones?: {
      descripcion?: string
      ubicacion?: { lat: number; lng: number }
      horaLocal?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    return {
      success: false,
      error: 'registrarIncidente aún no implementado',
    }
  }
}
