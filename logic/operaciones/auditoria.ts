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

/**
 * Obtener historial completo de una operación
 *
 * @param id_operacion - ID de la operación
 * @returns Array de eventos ordenados cronológicamente
 *
 * @example
 * const eventos = await obtenerHistorialOperacion('OP-001')
 * console.log('Cambios en OP-001:', eventos)
 */
export async function obtenerHistorialOperacion(id_operacion: string) {
  const eventos = await ServicioAuditoria.obtenerPorOperacion(id_operacion)
  return eventos.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis())
}

/**
 * Reconstruir cambios de una entidad a partir de eventos de auditoría
 *
 * @param entidad_tipo - Tipo de entidad
 * @param entidad_id - ID de la entidad
 * @returns Array de snapshots ordenados cronológicamente
 *
 * @example
 * const timeline = await obtenerCambiosEntidad('operacion', 'OP-001')
 * timeline.forEach(cambio => {
 *   console.log(cambio.timestamp, cambio.cambios)
 * })
 */
export async function obtenerCambiosEntidad(
  entidad_tipo: string,
  entidad_id: string
) {
  const eventos = await ServicioAuditoria.obtenerPorEntidad(
    entidad_tipo as any,
    entidad_id
  )
  return eventos
    .filter(e => e.tipo_evento === 'ENTIDAD_MODIFICADA' && e.cambios)
    .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis())
}
