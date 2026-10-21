/**
 * Documento contable de Paw-Path (fuente de verdad). Lo genera el servidor
 * por cada hecho económico y luego lo refleja en el sistema contable (Siigo);
 * del proveedor solo se guarda su número y el estado del envío.
 */

import type { Timestamp } from 'firebase/firestore'

export type TipoDocumentoContable =
  | 'FACTURA_VENTA'
  | 'RECIBO_CAJA'
  | 'DOCUMENTO_SOPORTE'
  | 'RECIBO_PAGO'
  | 'NOTA_CREDITO'
  | 'COMPROBANTE'

export interface LineaDocumento {
  concepto: string
  tipo: string
  valor: number
  naturaleza?: 'DEBITO' | 'CREDITO'
}

export interface DocumentoContable {
  id: string
  tipo: TipoDocumentoContable
  tercero: { uid: string; rol: 'CLIENTE' | 'PROVEEDOR' }
  fecha: Timestamp
  lineas: LineaDocumento[]
  total: number
  referencias: {
    operacion_id?: string
    liquidacion_id?: string
    movimiento_id?: string
    documento_relacionado?: string
  }
  envio: {
    estado: 'PENDIENTE' | 'ENVIANDO' | 'ENVIADO' | 'ERROR'
    proveedor?: string
    numero_proveedor?: string
    error?: string
    intentos: number
  }
}
