/**
 * Obligación: compromiso generado por la operación (deuda, pago, reembolso, etc.).
 * Invariante I5: Operación no puede cerrarse si existen obligaciones PENDIENTE
 */

import type { Timestamp } from 'firebase/firestore'

/**
 * Estados: PENDIENTE → CUMPLIDA o ANULADA (sin transición inversa).
 */
export type EstadoObligacion =
  | 'PENDIENTE' // Obligación existe, no ejecutada aún
  | 'CUMPLIDA' // Se ejecutó (existe MovimientoFinanciero correlacionado)
  | 'ANULADA' // Cancelada sin ejecutar (ej. por cancelación de operación)

/**
 * COBRO_TUTOR: el tutor debe a Paw-Path el valor del servicio.
 * PAGO_CUIDADOR: Paw-Path debe al cuidador los recursos administrados.
 */
export type TipoObligacion = 'COBRO_TUTOR' | 'PAGO_CUIDADOR'

/**
 * @property id - ID único
 * @property operacion_id - Operación que generó la obligación
 * @property deudor - ID de quién debe
 * @property acreedor - ID de quién recibe
 * @property concepto - Descripción (máximo 200 caracteres)
 * @property valor - Monto en COP, sin decimales (positivo)
 * @property estado - Estado actual (PENDIENTE, CUMPLIDA, ANULADA)
 * @property creado_en - Timestamp de creación
 * @property cumplido_en - Timestamp de cumplimiento (opcional)
 * @property movimiento_cumplido_id - Referencia al MovimientoFinanciero que la cumplió (opcional)
 */
export interface Obligacion {
  id: string
  operacion_id: string
  operacion_servicio_id?: string
  tipo: TipoObligacion

  // Partes del compromiso
  deudor: string
  acreedor: string
  concepto: string
  valor: number

  // Estado
  estado: EstadoObligacion

  // Auditoría
  creado_en: Timestamp
  cumplido_en?: Timestamp
  movimiento_cumplido_id?: string

  // Cobranza (COBRO_TUTOR)
  recordatorios_enviados?: number

  // Liquidación (PAGO_CUIDADOR)
  cobro_recaudado?: boolean
  liquidacion_id?: string
}
