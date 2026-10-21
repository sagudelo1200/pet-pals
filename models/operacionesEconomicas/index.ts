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

export type { EstadoObligacion } from './Obligacion'

export { idOperacionEconomica } from './OperacionEconomica'

export type { Obligacion, TipoObligacion } from './Obligacion'

export type { Liquidacion, EstadoLiquidacion } from './Liquidacion'

export type {
  PoliticaComercial,
  PoliticaServicio,
  PoliticaCobro,
  PoliticaLiquidacion,
  PoliticaImpuestos,
  PoliticaContable,
  DatosPoliticaComercial,
} from './PoliticaComercial'

export type {
  DocumentoContable,
  TipoDocumentoContable,
  LineaDocumento,
} from './DocumentoContable'
