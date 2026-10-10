/**
 * Operación económica: transacción entre Tutor y Paw-Path con ejecución mediante tercero.
 * Divide un valor acordado en remuneración de Paw-Path y recursos para ejecución.
 * Invariante I1: valor_acordado = remuneracion_mandatario + recursos_administrados
 */

import type { Timestamp } from 'firebase/firestore'

/**
 * Estados posibles. No hay orden obligatorio entre RECAUDADA y EJECUTADA.
 * CERRADA y CANCELADA son terminales.
 */
export type EstadoOperacionEconomica =
  | 'ENCARGADA'
  | 'EN_EJECUCION'
  | 'EJECUTADA'
  | 'RECAUDADA'
  | 'CERRADA'
  | 'CANCELADA'

/**
 * @property id - ID único
 * @property tutor_id - Usuario que encarga
 * @property cuidador_id - Ejecutor asignado (null si pendiente)
 * @property valor_acordado - Monto total (COP, sin decimales)
 * @property remuneracion_mandatario - Compensación de Paw-Path (COP, sin decimales)
 * @property recursos_administrados - Monto para tercero (COP, sin decimales)
 * @property estado - Estado actual derivado de eventos
 * @property creado_en - Timestamp de creación
 * @property cancelado_en - Timestamp de cancelación (opcional)
 * @property cancelado_por - ID de quien canceló (opcional)
 */
export interface OperacionEconomica {
  id: string

  // Actores
  tutor_id: string
  cuidador_id?: string

  // Composición económica (INVARIANTE I1)
  valor_acordado: number
  remuneracion_mandatario: number
  recursos_administrados: number

  // Estado derivado de eventos registrados
  estado: EstadoOperacionEconomica

  // Auditoría
  creado_en: Timestamp
  cancelado_en?: Timestamp
  cancelado_por?: string
}
