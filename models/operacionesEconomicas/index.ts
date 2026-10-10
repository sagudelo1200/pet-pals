/**
 * OPERACIONES ECONOMICAS - MODELOS CANÓNICOS
 *
 * Exportación central de interfaces y tipos para operaciones económicas.
 *
 * Canon Semántico V3.2.1 (Congelado)
 * Referencia: FASE1A-CANON-SEMANTICO-V32.md
 * Ampliaciones implementación: ETAPA0-COHERENCIA-FUNCIONAL.md
 */

export type {
  OperacionEconomica,
  EstadoOperacionEconomica,
} from './OperacionEconomica'

export type {
  EventoOperacionEconomica,
  TipoEventoOperacionEconomica,
} from './EventoOperacionEconomica'

export type {
  MovimientoFinanciero,
  TipoMovimientoFinanciero,
  SentidoMovimientoFinanciero,
} from './MovimientoFinanciero'

export type { Obligacion, EstadoObligacion } from './Obligacion'
