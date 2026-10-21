/**
 * Política comercial versionada: precios, comisión, cobro y liquidación.
 * Se administra desde la BD (politicas_comerciales/v{n}; la vigente la indica
 * configuracion/comercial.version_vigente). Solo el servidor publica versiones.
 */

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
  /** Horas locales (Colombia) permitidas para recordatorios: [desde, hasta). */
  horario_recordatorios: { desde: number; hasta: number }
}

export interface PoliticaLiquidacion {
  frecuencia: 'SEMANAL'
  /** 0 = domingo ... 6 = sábado; el periodo cierra a las 23:59. */
  dia_corte: number
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

/** Datos editables al publicar una nueva versión. */
export type DatosPoliticaComercial = Omit<PoliticaComercial, 'version' | 'estado'>
