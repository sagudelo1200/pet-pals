/**
 * Tests del puerto contable (mock) y de los documentos de Paw-Path como
 * fuente de verdad: factura al terminar, recibo de caja al pagar, documento
 * soporte y recibo de pago al liquidar.
 */
import * as mockFirestore from '../helpers/mockFirestore'

jest.mock('firebase-admin/firestore', () => ({
  Timestamp: mockFirestore.MOCK_TIMESTAMP,
  FieldValue: mockFirestore.MOCK_FIELD_VALUE,
}))

import {
  MockAdaptadorContable,
  obtenerAdaptadorContable,
  validarDocumento,
  type DocumentoContable,
} from '../../src/economia/contabilidad'
import {
  documentarPagoLiquidacion,
  emitirDocumento,
  enviarDocumento,
  facturarOperacion,
  registrarReciboCajaOperacion,
} from '../../src/economia/documentos'

const db = mockFirestore.crearMockDb()
const AHORA = mockFirestore.MOCK_TIMESTAMP.fromMillis(Date.UTC(2026, 9, 19, 15)) as any
const doc = (p: string) => db.__docs.get(p)

const documento = (extra: Partial<DocumentoContable> = {}): DocumentoContable => ({
  id: 'FV-x', tipo: 'FACTURA_VENTA', tercero: { uid: 't1', rol: 'CLIENTE' }, fecha: AHORA,
  lineas: [
    { concepto: 'Comisión', tipo: 'COMISION', valor: 1513 },
    { concepto: 'IVA', tipo: 'IVA_COMISION', valor: 287 },
    { concepto: 'Cuidador', tipo: 'INGRESO_TERCEROS', valor: 16200 },
  ],
  total: 18000, referencias: {}, ...extra,
})

beforeEach(() => db.__reset())

describe('MockAdaptadorContable', () => {
  const contable = new MockAdaptadorContable()

  test('una operación por tipo de documento, con número determinista', async () => {
    await expect(contable.registrarTercero({ uid: 't1', rol: 'CLIENTE' })).resolves.toEqual({ id: 'MOCK-T-t1' })
    await expect(contable.emitirFactura(documento())).resolves.toEqual({ numero: 'MOCK-FE-FV-x' })
    const pago = documento({ lineas: [{ concepto: 'Pago', tipo: 'PAGO', valor: 18000 }] })
    await expect(contable.registrarReciboCaja({ ...pago, id: 'RC-x', tipo: 'RECIBO_CAJA' })).resolves.toEqual({ numero: 'MOCK-RC-RC-x' })
    await expect(contable.emitirDocumentoSoporte({ ...pago, id: 'DS-x', tipo: 'DOCUMENTO_SOPORTE' })).resolves.toEqual({ numero: 'MOCK-DS-DS-x' })
    await expect(contable.registrarReciboPago({ ...pago, id: 'RP-x', tipo: 'RECIBO_PAGO' })).resolves.toEqual({ numero: 'MOCK-RP-RP-x' })
    await expect(contable.emitirNotaCredito({ ...pago, id: 'NC-x', tipo: 'NOTA_CREDITO' })).resolves.toEqual({ numero: 'MOCK-NC-NC-x' })
    await expect(contable.registrarComprobante({
      ...pago, id: 'CC-x', tipo: 'COMPROBANTE', total: 600,
      lineas: [
        { concepto: 'Gasto financiero', tipo: 'ASIENTO', valor: 600, naturaleza: 'DEBITO' },
        { concepto: 'Pasarela por cobrar', tipo: 'ASIENTO', valor: 600, naturaleza: 'CREDITO' },
      ],
    })).resolves.toEqual({ numero: 'MOCK-CC-CC-x' })
  })

  test('rechaza documentos que no cuadran', () => {
    expect(() => validarDocumento(documento({ total: 17999 }))).toThrow(/suma de líneas/)
    expect(() => validarDocumento(documento({ lineas: [] }))).toThrow(/no tiene líneas/)
    expect(() => validarDocumento(documento({
      tipo: 'COMPROBANTE', total: 100,
      lineas: [
        { concepto: 'a', tipo: 'ASIENTO', valor: 100, naturaleza: 'DEBITO' },
        { concepto: 'b', tipo: 'ASIENTO', valor: 90, naturaleza: 'CREDITO' },
      ],
    }))).toThrow(/descuadrado/)
  })

  test('un proveedor desconocido falla en vez de simular', () => {
    const original = process.env.PROVEEDOR_CONTABLE
    process.env.PROVEEDOR_CONTABLE = 'SIIGO'
    expect(() => obtenerAdaptadorContable()).toThrow(/no soportado: SIIGO/)
    process.env.PROVEEDOR_CONTABLE = original
  })
})

describe('documentos de Paw-Path (fuente de verdad)', () => {
  function sembrarOperacion(): void {
    db.__seed('operaciones_economicas/p1_t1', {
      tutor_id: 't1', cuidador_id: 'c1', tipo_servicio: 'paseo', operacion_servicio_id: 'p1',
      valor_acordado: 18000, remuneracion_mandatario: 1800, recursos_administrados: 16200,
      comision_base: 1513, iva_comision: 287, estado: 'EJECUTADA',
    })
  }

  test('factura al terminar: comisión + IVA como ingreso propio y el resto para terceros', async () => {
    sembrarOperacion()
    expect(await facturarOperacion(db, 'p1_t1', 24, new MockAdaptadorContable(), AHORA)).toBe('ENVIADO')

    const fv = doc('documentos_contables/FV-p1_t1')
    expect(fv).toMatchObject({
      tipo: 'FACTURA_VENTA', tercero: { uid: 't1', rol: 'CLIENTE' }, total: 18000,
      envio: { estado: 'ENVIADO', numero_proveedor: 'MOCK-FE-FV-p1_t1' },
    })
    expect(fv.lineas.map((l: any) => [l.tipo, l.valor])).toEqual([
      ['COMISION', 1513], ['IVA_COMISION', 287], ['INGRESO_TERCEROS', 16200],
    ])
    // Vence según el plazo de pago (24 h)
    expect(fv.datos.vence_en.toMillis()).toBe(AHORA.toMillis() + 24 * 3600 * 1000)
  })

  test('recibo de caja al pagar: aplica la factura con el medio de pago', async () => {
    sembrarOperacion()
    db.__seed('obligaciones/p1_t1_cobro', { estado: 'CUMPLIDA', movimiento_cumplido_id: 'm1' })
    db.__seed('movimientos_financieros/m1', { origen: 'MOCK', valor: 18000 })

    await registrarReciboCajaOperacion(db, 'p1_t1', new MockAdaptadorContable(), AHORA)
    expect(doc('documentos_contables/RC-p1_t1')).toMatchObject({
      tipo: 'RECIBO_CAJA', total: 18000, datos: { medio_pago: 'MOCK' },
      referencias: { movimiento_id: 'm1', documento_relacionado: 'FV-p1_t1' },
    })
  })

  test('pago de liquidación: documento soporte acumulado + recibo de pago', async () => {
    db.__seed('liquidaciones/c1_2026-10-19', {
      cuidador_id: 'c1', total: 32400, obligacion_ids: ['a', 'b'], referencia_pago: 'TRF-1',
    })
    db.__seed('obligaciones/a', { valor: 16200, operacion_servicio_id: 'p1' })
    db.__seed('obligaciones/b', { valor: 16200, operacion_servicio_id: 'p2' })

    const estados = await documentarPagoLiquidacion(db, 'c1_2026-10-19',
      new MockAdaptadorContable(), AHORA)
    expect(estados).toEqual(['ENVIADO', 'ENVIADO'])
    expect(doc('documentos_contables/DS-c1_2026-10-19')).toMatchObject({
      tipo: 'DOCUMENTO_SOPORTE', tercero: { uid: 'c1', rol: 'PROVEEDOR' }, total: 32400,
    })
    expect(doc('documentos_contables/DS-c1_2026-10-19').lineas).toHaveLength(2)
    expect(doc('documentos_contables/RP-c1_2026-10-19')).toMatchObject({
      tipo: 'RECIBO_PAGO', total: 32400, datos: { referencia_pago: 'TRF-1' },
      referencias: { documento_relacionado: 'DS-c1_2026-10-19' },
    })
  })

  test('sin documento soporte en la política del servicio solo se genera el recibo', async () => {
    db.__seed('liquidaciones/l1', { cuidador_id: 'c1', total: 100, obligacion_ids: ['a'] })
    db.__seed('obligaciones/a', { valor: 100, documento_soporte: false })
    await documentarPagoLiquidacion(db, 'l1', new MockAdaptadorContable(), AHORA)
    expect(doc('documentos_contables/DS-l1')).toBeUndefined()
    expect(doc('documentos_contables/RP-l1')).toBeDefined()
  })

  test('idempotente: emitir dos veces no duplica ni reenvía', async () => {
    const contable = new MockAdaptadorContable()
    const espia = jest.spyOn(contable, 'emitirFactura')
    await emitirDocumento(db, documento(), contable, AHORA)
    await emitirDocumento(db, documento(), contable, AHORA)
    expect(espia).toHaveBeenCalledTimes(1)
  })

  test('un envío fallido queda en ERROR y se puede reintentar', async () => {
    const contable = new MockAdaptadorContable()
    jest.spyOn(contable, 'emitirFactura').mockRejectedValueOnce(new Error('Siigo caído'))

    expect(await emitirDocumento(db, documento(), contable, AHORA)).toBe('ERROR')
    expect(doc('documentos_contables/FV-x').envio).toMatchObject({ estado: 'ERROR', intentos: 1 })

    expect(await enviarDocumento(db, 'FV-x', contable, AHORA)).toBe('ENVIADO')
    expect(doc('documentos_contables/FV-x').envio).toMatchObject({ estado: 'ENVIADO', intentos: 2 })
  })
})
