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
  POLITICAS: 'politicas_comerciales',
  CONFIGURACION: 'configuracion',
} as const;

/** Documento que apunta a la versión vigente de la política comercial. */
export const DOC_CONFIGURACION_COMERCIAL = 'comercial';

// ---------- Política comercial (administrable desde la BD) ----------

export interface PoliticaServicio {
  precio: {
    base_por_hora: number
    mascota_adicional: number
  }
  comision: {
    porcentaje_plataforma: number
  }
}

export interface PoliticaCobro {
  plazo_pago_horas: number
  bloqueo_tras_horas: number
  max_recordatorios: number
  intervalo_recordatorios_horas: number
  /** Horas locales (Colombia) en las que se permiten recordatorios: [desde, hasta). */
  horario_recordatorios: { desde: number; hasta: number }
}

export interface PoliticaLiquidacion {
  frecuencia: 'SEMANAL'
  /** Día de corte (0 = domingo ... 6 = sábado); el periodo cierra a las 23:59. */
  dia_corte: number
  /** Día estimado de pago (informativo para el cuidador). */
  dia_pago: number
  monto_minimo: number
  solo_recaudadas: boolean
}

/** IVA sobre la comisión de Paw-Path (el dinero del cuidador no lo lleva). */
export interface PoliticaImpuestos {
  iva_comision: {
    aplica: boolean
    porcentaje: number
    /** true: el precio publicado ya incluye el IVA; false: se suma encima. */
    incluido_en_precio: boolean
  }
}

/** Documentos contables que Paw-Path genera por defecto. */
export interface PoliticaContable {
  /** Documento soporte al pagar a cuidadores (no obligados a facturar). */
  documento_soporte_cuidador: boolean
}

export interface PoliticaComercial {
  version: number
  estado: 'ACTIVA' | 'HISTORICA'
  por_tipo: { paseo: PoliticaServicio }
  impuestos: PoliticaImpuestos
  cobro: PoliticaCobro
  liquidacion: PoliticaLiquidacion
  contabilidad: PoliticaContable
}

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

/** Error de negocio con código compatible con HttpsError de los callables. */
export class ErrorEconomico extends Error {
  /**
   * @param {string} codigo Código HttpsError.
   * @param {string} message Mensaje legible.
   */
  constructor(
    readonly codigo:
      | 'not-found'
      | 'permission-denied'
      | 'failed-precondition'
      | 'invalid-argument',
    message: string
  ) {
    super(message);
  }
}
