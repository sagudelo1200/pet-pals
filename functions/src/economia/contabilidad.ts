/* eslint-disable camelcase */
/**
 * Puerto contable. Paw-Path es la fuente de verdad: cada documento se arma y
 * guarda primero en Paw-Path (documentos_contables, ver documentos.ts) y el
 * adaptador solo lo refleja en el sistema contable (Siigo u otro).
 *
 * Una operación por tipo de documento; todas reciben el documento de
 * Paw-Path tal cual. El `id` del documento es la clave de idempotencia que
 * el adaptador real debe usar para no duplicar en el proveedor.
 * Se elige con PROVEEDOR_CONTABLE (por defecto MOCK).
 */
import type {Timestamp} from 'firebase-admin/firestore';

export type TipoDocumentoContable =
  | 'FACTURA_VENTA' // al validar la entrega (cuenta por cobrar al tutor)
  | 'RECIBO_CAJA' // al recibir el pago del tutor
  | 'DOCUMENTO_SOPORTE' // al pagar a un cuidador no obligado a facturar
  | 'RECIBO_PAGO' // egreso: transferencia al cuidador
  | 'NOTA_CREDITO' // anulación o reembolso de una factura
  | 'COMPROBANTE'; // asientos sin documento propio (p. ej. comisión de pasarela)

export type TipoLinea =
  | 'COMISION' // ingreso propio de Paw-Path (base sin IVA)
  | 'IVA_COMISION' // IVA generado sobre la comisión
  | 'INGRESO_TERCEROS' // dinero recibido para el cuidador (mandato)
  | 'SERVICIO_TERCERO' // servicio prestado por el cuidador (documento soporte)
  | 'PAGO' // dinero recibido o entregado
  | 'ASIENTO'; // línea de comprobante

export interface LineaDocumento {
  concepto: string
  tipo: TipoLinea
  valor: number
  /** Solo en comprobantes: lado del asiento. */
  naturaleza?: 'DEBITO' | 'CREDITO'
}

export interface TerceroContable {
  uid: string
  rol: 'CLIENTE' | 'PROVEEDOR'
}

export interface DocumentoContable {
  id: string
  tipo: TipoDocumentoContable
  tercero: TerceroContable
  fecha: Timestamp
  lineas: LineaDocumento[]
  total: number
  referencias: {
    operacion_id?: string
    liquidacion_id?: string
    movimiento_id?: string
    /** Documento de Paw-Path al que se aplica (p. ej. la factura de un recibo). */
    documento_relacionado?: string
  }
  datos?: {
    medio_pago?: string
    referencia_pago?: string
    vence_en?: Timestamp
  }
}

export interface ResultadoEnvio {
  numero: string
}

export interface AdaptadorContable {
  readonly proveedor: string
  registrarTercero(tercero: TerceroContable): Promise<{id: string}>
  emitirFactura(doc: DocumentoContable): Promise<ResultadoEnvio>
  registrarReciboCaja(doc: DocumentoContable): Promise<ResultadoEnvio>
  emitirDocumentoSoporte(doc: DocumentoContable): Promise<ResultadoEnvio>
  registrarReciboPago(doc: DocumentoContable): Promise<ResultadoEnvio>
  emitirNotaCredito(doc: DocumentoContable): Promise<ResultadoEnvio>
  registrarComprobante(doc: DocumentoContable): Promise<ResultadoEnvio>
}

/**
 * Valida que un documento cuadre: el total es la suma de sus líneas y, en
 * comprobantes, los débitos igualan a los créditos.
 * @param {DocumentoContable} doc Documento.
 */
export function validarDocumento(doc: DocumentoContable): void {
  if (doc.lineas.length === 0) throw new Error(`${doc.id}: el documento no tiene líneas`);
  if (doc.lineas.some((l) => !Number.isInteger(l.valor) || l.valor < 0)) {
    throw new Error(`${doc.id}: las líneas deben ser enteros positivos (COP)`);
  }
  if (doc.tipo === 'COMPROBANTE') {
    const lado = (n: 'DEBITO' | 'CREDITO') =>
      doc.lineas.filter((l) => l.naturaleza === n).reduce((s, l) => s + l.valor, 0);
    if (lado('DEBITO') !== lado('CREDITO') || lado('DEBITO') !== doc.total) {
      throw new Error(`${doc.id}: comprobante descuadrado`);
    }
    return;
  }
  const suma = doc.lineas.reduce((s, l) => s + l.valor, 0);
  if (suma !== doc.total) {
    throw new Error(`${doc.id}: total ${doc.total} ≠ suma de líneas ${suma}`);
  }
}

const PREFIJO: Record<TipoDocumentoContable, string> = {
  FACTURA_VENTA: 'FE',
  RECIBO_CAJA: 'RC',
  DOCUMENTO_SOPORTE: 'DS',
  RECIBO_PAGO: 'RP',
  NOTA_CREDITO: 'NC',
  COMPROBANTE: 'CC',
};

/**
 * Contabilidad simulada: valida el documento y devuelve un número ficticio
 * determinista (el mismo documento siempre produce el mismo número).
 */
export class MockAdaptadorContable implements AdaptadorContable {
  readonly proveedor = 'MOCK';

  /**
   * @param {DocumentoContable} doc Documento.
   * @return {ResultadoEnvio} Número simulado.
   */
  private simular(doc: DocumentoContable): ResultadoEnvio {
    validarDocumento(doc);
    return {numero: `MOCK-${PREFIJO[doc.tipo]}-${doc.id}`};
  }

  /**
   * @param {TerceroContable} t Tercero.
   * @return {Promise<object>} Id simulado.
   */
  async registrarTercero(t: TerceroContable): Promise<{id: string}> {
    return {id: `MOCK-T-${t.uid}`};
  }

  /** @param {DocumentoContable} d Documento. @return {Promise<ResultadoEnvio>} */
  async emitirFactura(d: DocumentoContable) {
    return this.simular(d);
  }

  /** @param {DocumentoContable} d Documento. @return {Promise<ResultadoEnvio>} */
  async registrarReciboCaja(d: DocumentoContable) {
    return this.simular(d);
  }

  /** @param {DocumentoContable} d Documento. @return {Promise<ResultadoEnvio>} */
  async emitirDocumentoSoporte(d: DocumentoContable) {
    return this.simular(d);
  }

  /** @param {DocumentoContable} d Documento. @return {Promise<ResultadoEnvio>} */
  async registrarReciboPago(d: DocumentoContable) {
    return this.simular(d);
  }

  /** @param {DocumentoContable} d Documento. @return {Promise<ResultadoEnvio>} */
  async emitirNotaCredito(d: DocumentoContable) {
    return this.simular(d);
  }

  /** @param {DocumentoContable} d Documento. @return {Promise<ResultadoEnvio>} */
  async registrarComprobante(d: DocumentoContable) {
    return this.simular(d);
  }
}

/**
 * Llama a la operación del adaptador que corresponde al tipo de documento.
 * @param {AdaptadorContable} a Adaptador.
 * @param {DocumentoContable} doc Documento.
 * @return {Promise<ResultadoEnvio>} Resultado del proveedor.
 */
export function enviarAlProveedor(
  a: AdaptadorContable,
  doc: DocumentoContable
): Promise<ResultadoEnvio> {
  switch (doc.tipo) {
  case 'FACTURA_VENTA': return a.emitirFactura(doc);
  case 'RECIBO_CAJA': return a.registrarReciboCaja(doc);
  case 'DOCUMENTO_SOPORTE': return a.emitirDocumentoSoporte(doc);
  case 'RECIBO_PAGO': return a.registrarReciboPago(doc);
  case 'NOTA_CREDITO': return a.emitirNotaCredito(doc);
  case 'COMPROBANTE': return a.registrarComprobante(doc);
  }
}

/**
 * Adaptador configurado (PROVEEDOR_CONTABLE, por defecto MOCK).
 * @return {AdaptadorContable} Adaptador.
 */
export function obtenerAdaptadorContable(): AdaptadorContable {
  const proveedor = (process.env.PROVEEDOR_CONTABLE || 'MOCK').toUpperCase();
  if (proveedor === 'MOCK') return new MockAdaptadorContable();
  // Siigo: implementar SiigoAdaptadorContable con esta misma interfaz
  throw new Error(`Proveedor contable no soportado: ${proveedor}`);
}
