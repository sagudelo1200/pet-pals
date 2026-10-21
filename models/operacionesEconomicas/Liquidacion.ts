/**
 * Liquidación: pago agrupado de Paw-Path a un cuidador por un periodo.
 * BORRADOR al corte; PAGADA cuando el admin registra la transferencia.
 */

import type { Timestamp } from 'firebase/firestore'

export type EstadoLiquidacion = 'BORRADOR' | 'PAGADA'

export interface Liquidacion {
  id: string
  cuidador_id: string
  periodo_hasta: Timestamp
  obligacion_ids: string[]
  total: number
  estado: EstadoLiquidacion
  /** Día estimado de pago (0 = domingo ... 6 = sábado). */
  dia_pago_estimado: number
  creado_en: Timestamp
  referencia_pago?: string
  pagado_en?: Timestamp
}
