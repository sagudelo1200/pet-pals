/**
 * Movimiento financiero: dinero que entra o sale (hecho económico puro).
 * Relacionado a una operación o justificado independientemente.
 * Invariante I2: Debe tener operacion_id O justificacion
 * Invariante I4: (origen, referencia_origen) debe ser único
 */

import type { Timestamp } from 'firebase/firestore'

/**
 * Tipos de movimientos (neutrales, sin interpretación tributaria/contable).
 */
export type TipoMovimientoFinanciero =
  | 'RECAUDO' // Dinero recibido de Tutor / entrada de caja
  | 'PAGO' // Dinero pagado a tercero (cuidador, proveedor, etc.)
  | 'REEMBOLSO' // Dinero devuelto (ej. por cancelación, sobrepago)
  | 'AJUSTE' // Corrección: comisiones, cargos administrativos, etc.

/**
 * Dirección del flujo de caja: ENTRADA (ingresa) o SALIDA (egresa).
 */
export type SentidoMovimientoFinanciero = 'ENTRADA' | 'SALIDA'

/**
 * @property id - ID único
 * @property operacion_id - Operación asociada (opcional si está justificado)
 * @property justificacion - Descripción si no está vinculado a operación (opcional)
 * @property tipo - Categoría (RECAUDO, PAGO, REEMBOLSO, AJUSTE)
 * @property valor - Cantidad en COP, sin decimales (siempre positivo)
 * @property sentido - ENTRADA o SALIDA (no se deduce del tipo)
 * @property origen - Fuente externa (WOMPI, STRIPE, BANCOLOMBIA, etc.)
 * @property referencia_origen - ID único en sistema de origen (transacción, etc.)
 * @property creado_en - Timestamp de creación
 * dedupKey = hash(origen + ':' + referencia_origen) garantiza unicidad
 */
export interface MovimientoFinanciero {
  id: string

  // Trazabilidad (INVARIANTE I2: al menos uno debe existir)
  operacion_id?: string
  justificacion?: string

  // Tipo y flujo
  tipo: TipoMovimientoFinanciero
  valor: number
  sentido: SentidoMovimientoFinanciero

  // Deduplicación (INVARIANTE I4)
  origen: string
  referencia_origen: string

  // Auditoría
  creado_en: Timestamp
}
