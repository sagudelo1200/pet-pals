/**
 * CASOS DE USO OPERACIÓN - LÓGICA GENÉRICA
 *
 * Contiene la lógica de negocio para operaciones genéricas.
 * Implementa la máquina de estados unificada.
 *
 * Tipos de operaciones concretas (Paseo, Guardería, Vet, etc.)
 * pueden heredar y especializar esta lógica.
 */

import { ESTADOS_OPERACION } from '@/models/Operacion'
import { ServicioOperacion } from '@/services/firebase/firestore/colecciones/operacion'
import { ServicioAuth } from '@/services/firebase/auth'
import { registrarAuditoria } from './auditoria'

/**
 * Transiciones válidas de estado para cada estado actual.
 * Define la máquina de estados unificada para CUALQUIER operación.
 *
 * Operaciones específicas (Paseo, Guardería, etc.) pueden extender esta
 * con sus propias transiciones y sub-estados.
 */
const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  [ESTADOS_OPERACION.PENDIENTE]: [
    ESTADOS_OPERACION.CONFIRMADO,
    ESTADOS_OPERACION.CANCELADO,
  ],
  [ESTADOS_OPERACION.CONFIRMADO]: [
    ESTADOS_OPERACION.EN_PROGRESO,
    ESTADOS_OPERACION.CANCELADO,
  ],
  [ESTADOS_OPERACION.EN_PROGRESO]: [
    ESTADOS_OPERACION.FINALIZADO,
    ESTADOS_OPERACION.CANCELADO,
  ],
  [ESTADOS_OPERACION.FINALIZADO]: [
    ESTADOS_OPERACION.COMPLETADO,
    ESTADOS_OPERACION.CANCELADO,
  ],
  [ESTADOS_OPERACION.COMPLETADO]: [
    ESTADOS_OPERACION.LIQUIDADA,
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
 * Casos de uso genéricos de Operación
 */
export class CasosDeUsoOperacion {
  /**
   * Validar si una transición de estado es permitida
   */
  static validarTransicion(estadoActual: string, estadoNuevo: string): boolean {
    const permitidos = TRANSICIONES_VALIDAS[estadoActual] || []
    return permitidos.includes(estadoNuevo)
  }

  /**
   * Obtener estados permitidos desde un estado actual
   */
  static obtenerTransicionesPosibles(estadoActual: string): string[] {
    return TRANSICIONES_VALIDAS[estadoActual] || []
  }

  /**
   * Cambiar estado de una operación de forma segura
   * Valida la transición antes de ejecutarla y registra auditoría
   */
  static async cambiarEstado(
    operacionId: string,
    nuevoEstado: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const operacion = await ServicioOperacion.obtener(operacionId)

      if (!operacion) {
        return { success: false, error: 'Operación no encontrada' }
      }

      const estadoAnterior = operacion.estado

      // Validar transición
      if (!this.validarTransicion(estadoAnterior, nuevoEstado)) {
        return {
          success: false,
          error: `Transición no permitida: ${estadoAnterior} → ${nuevoEstado}`,
        }
      }

      // Actualizar
      await ServicioOperacion.actualizar(operacionId, {
        estado: nuevoEstado as any,
      })

      // Registrar auditoría: cambio de estado
      const currentUser = ServicioAuth.obtenerUsuarioActual()
      await registrarAuditoria({
        entidad_tipo: 'operacion',
        entidad_id: operacionId,
        tipo_evento: 'CAMBIO_ESTADO',
        cambios: {
          estado: {
            antes: estadoAnterior,
            despues: nuevoEstado,
          },
        },
        actor: currentUser?.uid || 'SISTEMA',
        id_operacion: operacionId,
      })

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: `Error cambiando estado: ${String(error)}`,
      }
    }
  }

  /**
   * Confirmar una operación (PENDIENTE → CONFIRMADO)
   */
  static async confirmar(operacionId: string): Promise<{
    success: boolean
    error?: string
  }> {
    return this.cambiarEstado(operacionId, ESTADOS_OPERACION.CONFIRMADO)
  }

  /**
   * Iniciar una operación (CONFIRMADO → EN_PROGRESO)
   */
  static async iniciar(operacionId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const operacion = await ServicioOperacion.obtener(operacionId)

      if (!operacion) {
        return { success: false, error: 'Operación no encontrada' }
      }

      // Permitir iniciar desde varios estados
      const estadosValidos: string[] = [ESTADOS_OPERACION.CONFIRMADO]

      if (!estadosValidos.includes(operacion.estado)) {
        return {
          success: false,
          error: `No se puede iniciar desde estado: ${operacion.estado}`,
        }
      }

      await ServicioOperacion.actualizar(operacionId, {
        estado: ESTADOS_OPERACION.EN_PROGRESO as any,
        timestamp_inicio: new Date() as any,
      })

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: `Error iniciando operación: ${String(error)}`,
      }
    }
  }

  /**
   * Finalizar una operación (EN_PROGRESO → FINALIZADO)
   */
  static async finalizar(operacionId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const operacion = await ServicioOperacion.obtener(operacionId)

      if (!operacion) {
        return { success: false, error: 'Operación no encontrada' }
      }

      if (operacion.estado !== ESTADOS_OPERACION.EN_PROGRESO) {
        return {
          success: false,
          error: `No se puede finalizar desde estado: ${operacion.estado}`,
        }
      }

      await ServicioOperacion.actualizar(operacionId, {
        estado: ESTADOS_OPERACION.FINALIZADO as any,
        timestamp_fin: new Date() as any,
      })

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: `Error finalizando operación: ${String(error)}`,
      }
    }
  }

  /**
   * Completar una operación (FINALIZADO → COMPLETADO)
   * Marca el fin del servicio
   */
  static async completar(operacionId: string): Promise<{
    success: boolean
    error?: string
  }> {
    return this.cambiarEstado(operacionId, ESTADOS_OPERACION.COMPLETADO)
  }

  /**
   * Cancelar una operación desde cualquier estado
   * Registra auditoría de cambio de estado y cancelación
   */
  static async cancelar(
    operacionId: string,
    motivo?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const operacion = await ServicioOperacion.obtener(operacionId)
      if (!operacion) {
        return { success: false, error: 'Operación no encontrada' }
      }

      const estadoAnterior = operacion.estado

      // Actualizar operación
      await ServicioOperacion.actualizar(operacionId, {
        estado: ESTADOS_OPERACION.CANCELADO as any,
        nota_cancelacion: motivo,
      })

      // Registrar auditoría
      const currentUser = ServicioAuth.obtenerUsuarioActual()
      const actor = currentUser?.uid || 'SISTEMA'

      // 1. Registrar cambio de estado
      await registrarAuditoria({
        entidad_tipo: 'operacion',
        entidad_id: operacionId,
        tipo_evento: 'CAMBIO_ESTADO',
        cambios: {
          estado: {
            antes: estadoAnterior,
            despues: ESTADOS_OPERACION.CANCELADO,
          },
        },
        actor,
        id_operacion: operacionId,
      })

      // 2. Registrar razón de cancelación (si existe)
      if (motivo) {
        await registrarAuditoria({
          entidad_tipo: 'operacion',
          entidad_id: operacionId,
          tipo_evento: 'ENTIDAD_MODIFICADA',
          cambios: {
            nota_cancelacion: {
              antes: null,
              despues: motivo,
            },
          },
          actor,
          id_operacion: operacionId,
        })
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: `Error cancelando operación: ${String(error)}`,
      }
    }
  }
}
