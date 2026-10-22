/* eslint-disable camelcase */
/**
 * POLÍTICA COMERCIAL: modelo, validación y cálculo de precios.
 *
 * Compartido por la app y las Cloud Functions (TypeScript puro): el precio
 * que ve el tutor al reservar sale exactamente del mismo código con el que
 * el servidor cobra. Es un tipo versionado (ver versionables.ts): cada
 * operación guarda la versión con la que nació.
 */

/** Precios y comisión de un tipo de servicio. */
export interface PoliticaServicio {
  precio: {
    base_por_hora: number
    mascota_adicional: number
  }
  comision: {
    porcentaje_plataforma: number
  }
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

export interface PoliticaCobro {
  plazo_pago_horas: number
  bloqueo_tras_horas: number
  max_recordatorios: number
  intervalo_recordatorios_horas: number
  /** Horas locales (Colombia) en las que se permiten recordatorios: [desde, hasta). */
  horario_recordatorios: {desde: number; hasta: number}
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

/** Documentos contables que Paw-Path genera por defecto. */
export interface PoliticaContable {
  /** Documento soporte al pagar a cuidadores (no obligados a facturar). */
  documento_soporte_cuidador: boolean
}

/** Contenido de una versión de la política comercial. */
export interface ContenidoPoliticaComercial {
  por_tipo: {paseo: PoliticaServicio}
  impuestos: PoliticaImpuestos
  cobro: PoliticaCobro
  liquidacion: PoliticaLiquidacion
  contabilidad: PoliticaContable
}

/** Política leída: su contenido más el número de versión aplicado. */
export interface PoliticaComercial extends ContenidoPoliticaComercial {
  version: number
}

const esEntero = (v: unknown, min: number, max = Number.MAX_SAFE_INTEGER) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const esPorcentaje = (v: unknown) => typeof v === 'number' && v >= 0 && v <= 100;

/**
 * Valida el contenido de una política. Devuelve la lista de errores
 * (vacía si es válida).
 * @param {unknown} datos Datos recibidos.
 * @return {string[]} Errores encontrados.
 */
export function validarPolitica(datos: unknown): string[] {
  const d = datos as Partial<ContenidoPoliticaComercial> | undefined;
  const errores: string[] = [];
  const paseo = d?.por_tipo?.paseo;
  const cobro = d?.cobro;
  const liq = d?.liquidacion;
  const iva = d?.impuestos?.iva_comision;

  if (!esEntero(paseo?.precio?.base_por_hora, 1)) {
    errores.push('Precio por hora: debe ser un entero mayor que 0');
  }
  if (!esEntero(paseo?.precio?.mascota_adicional, 0)) {
    errores.push('Recargo por mascota adicional: debe ser un entero >= 0');
  }
  if (!esPorcentaje(paseo?.comision?.porcentaje_plataforma)) {
    errores.push('Comisión: debe estar entre 0 y 100');
  }
  if (typeof iva?.aplica !== 'boolean') {
    errores.push('IVA: indica si aplica');
  }
  if (!esPorcentaje(iva?.porcentaje)) {
    errores.push('IVA: el porcentaje debe estar entre 0 y 100');
  }
  if (typeof iva?.incluido_en_precio !== 'boolean') {
    errores.push('IVA: indica si va incluido en el precio');
  }

  if (!esEntero(cobro?.plazo_pago_horas, 1)) {
    errores.push('Plazo para pagar: debe ser un entero mayor que 0');
  }
  if (
    !esEntero(cobro?.bloqueo_tras_horas, 1) ||
    (esEntero(cobro?.plazo_pago_horas, 1) &&
      (cobro?.bloqueo_tras_horas as number) < (cobro?.plazo_pago_horas as number))
  ) {
    errores.push('Bloqueo: debe ser un entero >= al plazo para pagar');
  }
  if (!esEntero(cobro?.max_recordatorios, 0, 10)) {
    errores.push('Recordatorios: debe ser un entero entre 0 y 10');
  }
  if (!esEntero(cobro?.intervalo_recordatorios_horas, 1)) {
    errores.push('Horas entre recordatorios: debe ser un entero mayor que 0');
  }
  const horario = cobro?.horario_recordatorios;
  if (
    !esEntero(horario?.desde, 0, 23) ||
    !esEntero(horario?.hasta, 1, 24) ||
    (horario?.desde as number) >= (horario?.hasta as number)
  ) {
    errores.push('Horario de recordatorios: debe cumplir 0 <= desde < hasta <= 24');
  }

  if (liq?.frecuencia !== 'SEMANAL') {
    errores.push('Liquidación: la frecuencia debe ser SEMANAL');
  }
  if (!esEntero(liq?.dia_corte, 0, 6)) {
    errores.push('Día de corte: debe estar entre 0 (domingo) y 6');
  }
  if (!esEntero(liq?.dia_pago, 0, 6)) {
    errores.push('Día de pago: debe estar entre 0 (domingo) y 6');
  }
  if (!esEntero(liq?.monto_minimo, 0)) {
    errores.push('Monto mínimo: debe ser un entero >= 0');
  }
  if (typeof liq?.solo_recaudadas !== 'boolean') {
    errores.push('Liquidación: indica si solo se liquida lo ya pagado');
  }
  if (typeof d?.contabilidad?.documento_soporte_cuidador !== 'boolean') {
    errores.push('Contabilidad: indica si se emite documento soporte');
  }
  return errores;
}

/**
 * Copia solo los campos conocidos, en orden fijo: lo guardado nunca trae
 * campos extra y dos contenidos iguales producen el mismo hash.
 * @param {ContenidoPoliticaComercial} d Contenido ya validado.
 * @return {ContenidoPoliticaComercial} Contenido normalizado.
 */
export function normalizarPolitica(
  d: ContenidoPoliticaComercial
): ContenidoPoliticaComercial {
  const {precio, comision} = d.por_tipo.paseo;
  const iva = d.impuestos.iva_comision;
  const c = d.cobro;
  const l = d.liquidacion;
  return {
    por_tipo: {
      paseo: {
        precio: {
          base_por_hora: precio.base_por_hora,
          mascota_adicional: precio.mascota_adicional,
        },
        comision: {porcentaje_plataforma: comision.porcentaje_plataforma},
      },
    },
    impuestos: {
      iva_comision: {
        aplica: iva.aplica,
        porcentaje: iva.porcentaje,
        incluido_en_precio: iva.incluido_en_precio,
      },
    },
    cobro: {
      plazo_pago_horas: c.plazo_pago_horas,
      bloqueo_tras_horas: c.bloqueo_tras_horas,
      max_recordatorios: c.max_recordatorios,
      intervalo_recordatorios_horas: c.intervalo_recordatorios_horas,
      horario_recordatorios: {
        desde: c.horario_recordatorios.desde,
        hasta: c.horario_recordatorios.hasta,
      },
    },
    liquidacion: {
      frecuencia: l.frecuencia,
      dia_corte: l.dia_corte,
      dia_pago: l.dia_pago,
      monto_minimo: l.monto_minimo,
      solo_recaudadas: l.solo_recaudadas,
    },
    contabilidad: {
      documento_soporte_cuidador: d.contabilidad.documento_soporte_cuidador,
    },
  };
}

// ---------- Cálculo de precios ----------

/**
 * Precio de un servicio de paseo para un tutor (COP, entero).
 * Base por hora + recargo por cada mascota adicional, proporcional a la duración.
 * @param {PoliticaServicio} politica Precios vigentes del tipo de servicio.
 * @param {number} numMascotas Mascotas del tutor en el paseo.
 * @param {number} duracionMinutos Duración del paseo.
 * @return {number} Precio total en COP.
 */
export function calcularPrecioPaseo(
  politica: PoliticaServicio,
  numMascotas: number,
  duracionMinutos: number
): number {
  if (numMascotas <= 0 || duracionMinutos <= 0) return 0;
  const {base_por_hora, mascota_adicional} = politica.precio;
  const porHora = base_por_hora + (numMascotas - 1) * mascota_adicional;
  return Math.round((porHora * duracionMinutos) / 60);
}

export interface DesgloseCobro {
  /** Lo que paga el tutor. */
  valor_acordado: number
  /** Lo que se queda Paw-Path: comisión base + IVA de la comisión. */
  remuneracion_mandatario: number
  /** Lo que recibe el cuidador (dinero de terceros, sin IVA). */
  recursos_administrados: number
  comision_base: number
  iva_comision: number
}

/**
 * Desglosa el precio de un servicio en comisión (base + IVA) y dinero del
 * cuidador, según la política. Cumple la invariante I1:
 * valor_acordado = remuneracion_mandatario + recursos_administrados.
 *
 * El cuidador siempre recibe precio − comisión. Con IVA incluido, el IVA sale
 * de la comisión; sin incluir, se suma al precio que paga el tutor.
 * @param {PoliticaServicio} servicio Comisión del tipo de servicio.
 * @param {PoliticaImpuestos} impuestos IVA de la comisión.
 * @param {number} precio Precio publicado del servicio.
 * @return {DesgloseCobro} Desglose.
 */
export function desglosarCobro(
  servicio: PoliticaServicio,
  impuestos: PoliticaImpuestos,
  precio: number
): DesgloseCobro {
  const comision = Math.round((precio * servicio.comision.porcentaje_plataforma) / 100);
  const recursos_administrados = precio - comision;
  const iva = impuestos.iva_comision;

  if (!iva.aplica || iva.porcentaje === 0) {
    return {
      valor_acordado: precio, remuneracion_mandatario: comision,
      recursos_administrados, comision_base: comision, iva_comision: 0,
    };
  }
  if (iva.incluido_en_precio) {
    const comision_base = Math.round(comision / (1 + iva.porcentaje / 100));
    return {
      valor_acordado: precio, remuneracion_mandatario: comision,
      recursos_administrados, comision_base, iva_comision: comision - comision_base,
    };
  }
  const iva_comision = Math.round((comision * iva.porcentaje) / 100);
  return {
    valor_acordado: precio + iva_comision,
    remuneracion_mandatario: comision + iva_comision,
    recursos_administrados, comision_base: comision, iva_comision,
  };
}

/**
 * Desglose completo de un paseo con la política dada (precio + reparto).
 * @param {ContenidoPoliticaComercial} politica Política.
 * @param {number} numMascotas Mascotas del tutor.
 * @param {number} duracionMinutos Duración.
 * @return {DesgloseCobro} Desglose.
 */
export function desglosarPaseo(
  politica: ContenidoPoliticaComercial,
  numMascotas: number,
  duracionMinutos: number
): DesgloseCobro {
  const servicio = politica.por_tipo.paseo;
  const precio = calcularPrecioPaseo(servicio, numMascotas, duracionMinutos);
  return desglosarCobro(servicio, politica.impuestos, precio);
}
