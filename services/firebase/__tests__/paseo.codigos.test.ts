/* eslint-env jest */
/**
 * Validación transaccional de códigos de recogida y entrega (ServicioPaseo).
 * La transacción de Firestore se simula: `tx.get` devuelve el documento del
 * paseo y `tx.update` captura lo que se escribiría.
 */

const mockTx = { get: jest.fn(), update: jest.fn() }

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  doc: jest.fn(() => ({ id: 'ref' })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
  runTransaction: jest.fn(async (_db: unknown, fn: (_tx: unknown) => unknown) => fn(mockTx)),
  Timestamp: { now: jest.fn(() => 'NOW') },
}))

jest.mock('@/services/firebase/auth/auth', () => ({
  ServicioAuth: { obtenerUsuarioActual: jest.fn(() => ({ uid: 'tutor-1' })) },
}))

import { ServicioPaseo } from '@/services/firebase/firestore/colecciones/paseo'
import { ServicioAuth } from '@/services/firebase/auth/auth'
import { ESTADOS_PASEO } from '@/models/Paseo'

const mock = (fn: unknown) => fn as jest.Mock

function docPaseo(data: Record<string, unknown> | null) {
  mockTx.get.mockResolvedValue({
    exists: () => data !== null,
    data: () => data,
  })
}

const base = {
  estado: ESTADOS_PASEO.FINALIZADO,
  codigos_entrega_por_tutor: { 'tutor-1': '123456' },
  codigo_entrega_validado_por_tutor: {},
  intentos_fallidos_entrega_por_tutor: {},
}

describe('ServicioPaseo.validarCodigoEntregaPorTutor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mock(ServicioAuth.obtenerUsuarioActual).mockReturnValue({ uid: 'tutor-1' })
  })

  it('código correcto del único tutor: valida y completa el paseo', async () => {
    docPaseo(base)

    const res = await ServicioPaseo.validarCodigoEntregaPorTutor('p1', 'tutor-1', '123456')

    expect(res).toEqual({ success: true, completado: true })
    const update = mockTx.update.mock.calls[0][1]
    expect(update.estado).toBe(ESTADOS_PASEO.COMPLETADO)
    expect(update.codigo_entrega_validado_por_tutor).toEqual({ 'tutor-1': true })
    expect(update.intentos_fallidos_entrega_por_tutor).toEqual({ 'tutor-1': 0 })
    expect(update.timestamp_validacion_tutor).toBe('NOW')
  })

  it('con varios tutores, solo completa cuando todos validaron', async () => {
    docPaseo({
      ...base,
      codigos_entrega_por_tutor: { 'tutor-1': '123456', 'tutor-2': '654321' },
    })

    const res = await ServicioPaseo.validarCodigoEntregaPorTutor('p1', 'tutor-1', '123456')

    expect(res).toEqual({ success: true, completado: false })
    const update = mockTx.update.mock.calls[0][1]
    expect(update).not.toHaveProperty('estado')
    expect(update.codigo_entrega_validado_por_tutor).toEqual({ 'tutor-1': true })
  })

  it('el último tutor en validar completa el paseo', async () => {
    docPaseo({
      ...base,
      codigos_entrega_por_tutor: { 'tutor-1': '123456', 'tutor-2': '654321' },
      codigo_entrega_validado_por_tutor: { 'tutor-2': true },
    })

    const res = await ServicioPaseo.validarCodigoEntregaPorTutor('p1', 'tutor-1', '123456')

    expect(res).toEqual({ success: true, completado: true })
    expect(mockTx.update.mock.calls[0][1].estado).toBe(ESTADOS_PASEO.COMPLETADO)
  })

  it('código incorrecto: suma un intento y no cambia el estado', async () => {
    docPaseo(base)

    const res = await ServicioPaseo.validarCodigoEntregaPorTutor('p1', 'tutor-1', '000000')

    expect(res).toEqual({
      success: false,
      error: 'CODIGO_ENTREGA_INCORRECTO',
      intentosFallidos: 1,
    })
    const update = mockTx.update.mock.calls[0][1]
    expect(update.intentos_fallidos_entrega_por_tutor).toEqual({ 'tutor-1': 1 })
    expect(update).not.toHaveProperty('estado')
  })

  it('el tercer fallo bloquea', async () => {
    docPaseo({ ...base, intentos_fallidos_entrega_por_tutor: { 'tutor-1': 2 } })

    const res = await ServicioPaseo.validarCodigoEntregaPorTutor('p1', 'tutor-1', '000000')

    expect(res).toEqual({
      success: false,
      error: 'CODIGO_ENTREGA_BLOQUEADO',
      intentosFallidos: 3,
    })
  })

  it('bloqueado: rechaza incluso el código correcto sin escribir', async () => {
    docPaseo({ ...base, intentos_fallidos_entrega_por_tutor: { 'tutor-1': 3 } })

    const res = await ServicioPaseo.validarCodigoEntregaPorTutor('p1', 'tutor-1', '123456')

    expect(res).toEqual({ success: false, error: 'CODIGO_ENTREGA_BLOQUEADO' })
    expect(mockTx.update).not.toHaveBeenCalled()
  })

  it('el paseo debe estar FINALIZADO', async () => {
    docPaseo({ ...base, estado: ESTADOS_PASEO.EN_PROGRESO })

    const res = await ServicioPaseo.validarCodigoEntregaPorTutor('p1', 'tutor-1', '123456')

    expect(res).toEqual({ success: false, error: 'ESTADO_NO_ESPERADO' })
    expect(mockTx.update).not.toHaveBeenCalled()
  })

  it('tutor sin código de entrega en el paseo', async () => {
    docPaseo({ ...base, codigos_entrega_por_tutor: {} })

    const res = await ServicioPaseo.validarCodigoEntregaPorTutor('p1', 'tutor-1', '123456')

    expect(res).toEqual({ success: false, error: 'CODIGO_ENTREGA_NO_ENCONTRADO' })
  })

  it('paseo inexistente', async () => {
    docPaseo(null)

    const res = await ServicioPaseo.validarCodigoEntregaPorTutor('p1', 'tutor-1', '123456')

    expect(res).toEqual({ success: false, error: 'PASEO_NO_ENCONTRADO' })
  })

  it('formato inválido se rechaza sin abrir transacción', async () => {
    const res = await ServicioPaseo.validarCodigoEntregaPorTutor('p1', 'tutor-1', '12ab')

    expect(res).toEqual({ success: false, error: 'CODIGO_ENTREGA_FORMATO_INVALIDO' })
    expect(mockTx.get).not.toHaveBeenCalled()
  })

  it('sin sesión devuelve NO_AUTENTICADO', async () => {
    mock(ServicioAuth.obtenerUsuarioActual).mockReturnValue(null)

    const res = await ServicioPaseo.validarCodigoEntregaPorTutor('p1', 'tutor-1', '123456')

    expect(res).toEqual({ success: false, error: 'NO_AUTENTICADO' })
  })
})

describe('ServicioPaseo.validarCodigoRecogidaPorTutor', () => {
  const recogida = {
    estado: ESTADOS_PASEO.EN_PUNTO_RECOGIDA,
    codigos_recogida_por_tutor: { 'tutor-1': '111222' },
    codigo_recogida_validado_por_tutor: {},
    intentos_fallidos_recogida_por_tutor: {},
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mock(ServicioAuth.obtenerUsuarioActual).mockReturnValue({ uid: 'cuidador-1' })
  })

  it('código correcto: marca validado y reinicia intentos (sin cambiar el estado)', async () => {
    docPaseo(recogida)

    const res = await ServicioPaseo.validarCodigoRecogidaPorTutor('p1', 'tutor-1', '111222')

    expect(res).toEqual({ success: true, validado: true, intentosFallidos: 0 })
    const update = mockTx.update.mock.calls[0][1]
    expect(update.codigo_recogida_validado_por_tutor).toEqual({ 'tutor-1': true })
    expect(update).not.toHaveProperty('estado')
  })

  it('código incorrecto: suma intento', async () => {
    docPaseo(recogida)

    const res = await ServicioPaseo.validarCodigoRecogidaPorTutor('p1', 'tutor-1', '000000')

    expect(res).toEqual({
      success: false,
      error: 'CODIGO_RECOGIDA_INCORRECTO',
      intentosFallidos: 1,
    })
  })

  it('bloquea al llegar a 3 intentos', async () => {
    docPaseo({ ...recogida, intentos_fallidos_recogida_por_tutor: { 'tutor-1': 3 } })

    const res = await ServicioPaseo.validarCodigoRecogidaPorTutor('p1', 'tutor-1', '111222')

    expect(res).toEqual({ success: false, error: 'CODIGO_RECOGIDA_BLOQUEADO' })
    expect(mockTx.update).not.toHaveBeenCalled()
  })
})
