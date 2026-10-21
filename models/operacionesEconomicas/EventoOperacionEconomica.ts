/**
 * Evento: hecho registrado en la operación (inmutable).
 * Los eventos forman una auditoría completa. El estado se deriva de los eventos.
 */

import type { Timestamp } from 'firebase/firestore'

/**
 * Tipos de eventos que puede generar una operación.
 */
export type TipoEventoOperacionEconomica =
  | 'OPERACION_ENCARGADA' // Tutor encarga, Paw-Path acepta
  | 'CUIDADOR_ASIGNADO' // Paw-Path asigna un ejecutor
  | 'SERVICIO_EJECUTADO' // Cuidador completó la ejecución
  | 'PAGO_INICIADO' // FASE 4.1: Se solicita pago a pasarela (esperando confirmación)
  | 'PAGO_RECHAZADO' // FASE 4.1: Pasarela rechazó el pago
  | 'RECAUDO' // Dinero recibido (entrada financiera confirmada)
  | 'OBLIGACION_GENERADA' // Se generó un compromiso de pago
  | 'PAGO_TERCERO' // Se ejecutó un pago (salida financiera)
  | 'FACTURA_EMITIDA' // Se emitió la factura electrónica
  | 'FACTURA_FALLIDA' // La facturación falló (el recaudo se mantiene)
  | 'OPERACION_CERRADA' // Sin obligaciones pendientes
  | 'OPERACION_CANCELADA' // La operación fue cancelada

/**
 * @property id - ID único
 * @property operacion_id - Operación asociada
 * @property tipo - Tipo de evento
 * @property detalle - Descripción (máximo 500 caracteres)
 * @property timestamp - Momento del evento
 * @property movimiento_id - Referencia a MovimientoFinanciero (opcional)
 * @property obligacion_id - Referencia a Obligacion (opcional)
 * @property referencia_externa - Referencia a sistemas externos (opcional)
 */
export interface EventoOperacionEconomica {
  id: string
  operacion_id: string

  tipo: TipoEventoOperacionEconomica

  detalle: string
  timestamp: Timestamp

  // Campos de correlación (opcionales)
  movimiento_id?: string
  obligacion_id?: string
  referencia_externa?: string
}
