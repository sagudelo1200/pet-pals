/**
 * Helper centralizado para registrar eventos de auditoría
 *
 * Uso simple desde cualquier parte del código:
 *   await registrarAuditoria({
 *     entidad_tipo: 'operacion',
 *     entidad_id: 'OP-001',
 *     tipo_evento: 'CAMBIO_ESTADO',
 *     cambios: { estado: { antes: 'PENDIENTE', despues: 'CONFIRMADO' } },
 *     actor: currentUser.uid,
 *   })
 */

import {
  ServicioAuditoria,
  type RegistroAuditoriaParams,
} from '@/services/firebase/firestore/colecciones/auditoria'

/**
 * Registrar un evento de auditoría
 *
 * @param params - Parámetros del evento a registrar
 * @returns ID del evento registrado
 * @throws Error si hay problema al escribir en Firestore
 *
 * @example
 * // Registrar creación de operación
 * await registrarAuditoria({
 *   entidad_tipo: 'operacion',
 *   entidad_id: 'OP-001',
 *   tipo_evento: 'ENTIDAD_CREADA',
 *   actor: 'U-123',
 *   id_operacion: 'OP-001',
 * })
 *
 * @example
 * // Registrar cambio de estado
 * await registrarAuditoria({
 *   entidad_tipo: 'operacion',
 *   entidad_id: 'OP-001',
 *   tipo_evento: 'CAMBIO_ESTADO',
 *   cambios: {
 *     estado: { antes: 'PENDIENTE', despues: 'CONFIRMADO' }
 *   },
 *   actor: 'SISTEMA',
 *   id_operacion: 'OP-001',
 * })
 *
 * @example
 * // Registrar error con contexto
 * await registrarAuditoria({
 *   entidad_tipo: 'operacion',
 *   entidad_id: 'OP-001',
 *   tipo_evento: 'ERROR',
 *   cambios: {
 *     error: {
 *       antes: 'PENDIENTE',
 *       despues: 'ERROR: Falló al confirmar'
 *     }
 *   },
 *   actor: 'SISTEMA',
 *   id_operacion: 'OP-001',
 * })
 */
export async function registrarAuditoria(
  params: RegistroAuditoriaParams
): Promise<string> {
  try {
    const eventoId = await ServicioAuditoria.registrar(params)
    console.log(
      `[Auditoría] ${params.tipo_evento}: ${params.entidad_tipo}/${params.entidad_id} por ${params.actor}`
    )
    return eventoId
  } catch (error) {
    console.error('[Auditoría] Error registrando evento:', error)
    throw error
  }
}
