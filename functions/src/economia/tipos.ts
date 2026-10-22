/* eslint-disable camelcase */
/**
 * Tipos del motor económico (lado servidor).
 * Espejo de models/operacionesEconomicas del app: los nombres de campos son
 * los mismos que leen las pantallas.
 */

/** Identificador de Paw-Path como parte en obligaciones. */
export const PAW_PATH = 'paw-path';

export const COLECCION = {
  OPERACIONES: 'operaciones_economicas',
  OBLIGACIONES: 'obligaciones',
  MOVIMIENTOS: 'movimientos_financieros',
  DEDUPLICACION: 'deduplicacion_movimientos',
  LIQUIDACIONES: 'liquidaciones',
  DOCUMENTOS: 'documentos_contables',
} as const;

// Política comercial: modelo único compartido con la app
export type {
  ContenidoPoliticaComercial,
  PoliticaCobro,
  PoliticaComercial,
  PoliticaContable,
  PoliticaImpuestos,
  PoliticaLiquidacion,
  PoliticaServicio,
} from '../compartido/politicaComercial';

// ---------- Registros económicos ----------

export type EstadoOperacionEconomica =
  | 'ENCARGADA'
  | 'EN_EJECUCION'
  | 'EJECUTADA'
  | 'RECAUDADA'
  | 'CERRADA'
  | 'CANCELADA';

export type TipoObligacion = 'COBRO_TUTOR' | 'PAGO_CUIDADOR';

export type EstadoObligacion = 'PENDIENTE' | 'CUMPLIDA' | 'ANULADA';

export type TipoEventoEconomico =
  | 'OPERACION_ENCARGADA'
  | 'CUIDADOR_ASIGNADO'
  | 'SERVICIO_EJECUTADO'
  | 'PAGO_INICIADO'
  | 'PAGO_RECHAZADO'
  | 'RECAUDO'
  | 'OBLIGACION_GENERADA'
  | 'PAGO_TERCERO'
  | 'FACTURA_EMITIDA'
  | 'FACTURA_FALLIDA'
  | 'OPERACION_CERRADA'
  | 'OPERACION_CANCELADA';

export type EstadoLiquidacion = 'BORRADOR' | 'PAGADA';

/** Error de negocio (común a todo el servidor): ver comun/errores.ts. */
export {ErrorNegocio as ErrorEconomico} from '../comun/errores';
