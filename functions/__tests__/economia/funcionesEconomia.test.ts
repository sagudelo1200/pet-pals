/**
 * Tests de la capa de Cloud Functions económicas: disparo del trigger,
 * autenticación y permisos de los callables.
 */
import * as mockFirestore from '../helpers/mockFirestore'

const mockDb = mockFirestore.crearMockDb()

jest.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
  initializeApp: jest.fn(),
}))
jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }))
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
  Timestamp: mockFirestore.MOCK_TIMESTAMP,
  FieldValue: mockFirestore.MOCK_FIELD_VALUE,
}))
jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: (_p: string, h: unknown) => h,
  onDocumentUpdated: (_p: string, h: unknown) => h,
}))
jest.mock('../../src/economia/tareas', () => ({
  programarTarea: jest.fn().mockResolvedValue(true),
}))
jest.mock('firebase-functions/v2/https', () => {
  class HttpsError extends Error {
    constructor(readonly code: string, message: string) {
      super(message)
    }
  }
  return {
    HttpsError,
    onCall: (_o: unknown, h: unknown) => h,
    onRequest: (_o: unknown, h: unknown) => h,
  }
})

import * as fn from '../../src/economia/funciones'
import { programarTarea } from '../../src/economia/tareas'

const call = (f: unknown) => f as (req: any) => Promise<any>
const trigger = fn.alValidarEntregaEconomia as unknown as (e: any) => Promise<void>

const POLITICA = {
  version: 1,
  estado: 'ACTIVA',
  por_tipo: {
    paseo: {
      precio: { base_por_hora: 18000, mascota_adicional: 5000 },
      comision: { porcentaje_plataforma: 10 },
    },
  },
  cobro: {
    plazo_pago_horas: 24, bloqueo_tras_horas: 72, max_recordatorios: 3,
    intervalo_recordatorios_horas: 24, horario_recordatorios: { desde: 8, hasta: 19 },
  },
  liquidacion: {
    frecuencia: 'SEMANAL', dia_corte: 0, dia_pago: 2, monto_minimo: 0, solo_recaudadas: true,
  },
  impuestos: { iva_comision: { aplica: true, porcentaje: 19, incluido_en_precio: true } },
  contabilidad: { documento_soporte_cuidador: true },
}

function evento(antes: Record<string, unknown>, despues: Record<string, unknown>) {
  return {
    data: { before: { data: () => antes }, after: { data: () => despues } },
    params: { operacionId: 'p1' },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockDb.__reset()
  mockDb.__seed('configuracion/comercial', { version_vigente: 1 })
  mockDb.__seed('politicas_comerciales/v1', POLITICA)
  mockDb.__seed('operaciones/p1/mascotas/m1', { id_usuario: 't1' })
})

const PASEO = { tipo: 'paseo', id_cuidador: 'c1', duracion_estimada: 60, politica_version: 1 }

describe('alValidarEntregaEconomia', () => {
  const validado = (mapa: Record<string, boolean>) => ({
    ...PASEO, estado: 'FINALIZADO', codigo_entrega_validado_por_tutor: mapa,
  })

  test('finalizar sin validar la entrega no genera cobro', async () => {
    await trigger(evento({ ...PASEO, estado: 'EN_PROGRESO' }, validado({ t1: false })))
    expect(mockDb.__docs.has('operaciones_economicas/p1_t1')).toBe(false)
    expect(programarTarea).not.toHaveBeenCalled()
  })

  test('el código de RECOGIDA (tutor → cuidador al iniciar) no genera cobro', async () => {
    const enProgreso = { ...PASEO, estado: 'EN_PROGRESO' }
    await trigger(evento(
      { ...enProgreso, codigo_recogida_validado_por_tutor: { t1: false } },
      { ...enProgreso, codigo_recogida_validado_por_tutor: { t1: true } }
    ))
    expect(mockDb.__docs.has('operaciones_economicas/p1_t1')).toBe(false)
    expect(programarTarea).not.toHaveBeenCalled()
  })

  test('el cobro nace cuando el tutor ingresa el código de ENTREGA del cuidador', async () => {
    await trigger(evento(validado({ t1: false }), validado({ t1: true })))
    expect(mockDb.__docs.get('operaciones_economicas/p1_t1').valor_acordado).toBe(18000)
    // La factura a crédito nace al recibir la mascota
    expect(mockDb.__docs.get('documentos_contables/FV-p1_t1')).toMatchObject({
      tipo: 'FACTURA_VENTA', total: 18000, envio: { estado: 'ENVIADO' },
    })
    // Una única tarea: la primera revisión del cobro (sin jobs periódicos)
    expect(programarTarea).toHaveBeenCalledTimes(1)
    expect(programarTarea).toHaveBeenCalledWith(
      'revisarCobroTutor', { obligacionId: 'p1_t1_cobro' }, expect.any(Number),
      expect.stringMatching(/^cobro-p1_t1_cobro-\d+$/))
  })

  test('paseo compartido: solo cobra al tutor que acaba de validar', async () => {
    mockDb.__seed('operaciones/p1/mascotas/m2', { id_usuario: 't2' })
    await trigger(evento(validado({ t1: false, t2: false }), validado({ t1: false, t2: true })))
    expect(mockDb.__docs.has('operaciones_economicas/p1_t2')).toBe(true)
    expect(mockDb.__docs.has('operaciones_economicas/p1_t1')).toBe(false)
  })

  test('ignora cambios que no son una nueva validación y operaciones que no son paseo', async () => {
    await trigger(evento(validado({ t1: true }), { ...validado({ t1: true }), estado: 'COMPLETADO' }))
    await trigger(evento({ tipo: 'otro' }, { tipo: 'otro', codigo_entrega_validado_por_tutor: { t1: true } }))
    expect(mockDb.__docs.has('operaciones_economicas/p1_t1')).toBe(false)
  })
})

describe('tareas de un solo uso', () => {
  const tarea = (f: unknown) => f as (req: any, res: any) => Promise<void>
  const respuesta = () => {
    const res: any = {}
    res.status = jest.fn(() => res)
    res.json = jest.fn(() => res)
    return res
  }

  test('revisarCobroTutor no reprograma un cobro ya pagado', async () => {
    mockDb.__seed('obligaciones/o1', { estado: 'CUMPLIDA', deudor: 't1' })
    const res = respuesta()
    await tarea(fn.revisarCobroTutor)({ method: 'POST', body: { obligacionId: 'o1' } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(programarTarea).not.toHaveBeenCalled()
  })

  test('el corte con un cuidador bajo el mínimo agenda el siguiente corte', async () => {
    mockDb.__seed('politicas_comerciales/v1', {
      ...POLITICA, liquidacion: { ...POLITICA.liquidacion, monto_minimo: 999999 },
    })
    mockDb.__seed('obligaciones/x', {
      tipo: 'PAGO_CUIDADOR', estado: 'PENDIENTE', acreedor: 'c1', valor: 100,
      creado_en: mockFirestore.MOCK_TIMESTAMP.fromMillis(0), cobro_recaudado: true,
    })
    const res = respuesta()
    await tarea(fn.ejecutarCorteLiquidacion)({ method: 'POST', body: { corteMs: 1_000_000 } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(programarTarea).toHaveBeenCalledWith(
      'ejecutarCorteLiquidacion', expect.any(Object), expect.any(Number),
      expect.stringMatching(/^corte-liquidacion-/))
  })

  test('rechaza peticiones que no son POST', async () => {
    const res = respuesta()
    await tarea(fn.revisarCobroTutor)({ method: 'GET' }, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})

describe('callables', () => {
  test('pagar exige sesión', async () => {
    await expect(call(fn.iniciarPagoOperacion)({ data: { operacionId: 'x' } }))
      .rejects.toMatchObject({ code: 'unauthenticated' })
  })

  test('los errores de negocio llegan con su código', async () => {
    await expect(call(fn.iniciarPagoOperacion)({ auth: { uid: 't1' }, data: { operacionId: 'nada' } }))
      .rejects.toMatchObject({ code: 'not-found' })
    await expect(call(fn.iniciarPagoOperacion)({ auth: { uid: 't1' }, data: {} }))
      .rejects.toMatchObject({ code: 'invalid-argument' })
  })

  test('acciones de admin rechazan a otros usuarios', async () => {
    mockDb.__seed('usuarios/t1', { roles: ['tutor'] })
    const req = { auth: { uid: 't1', token: {} }, data: {} }
    await expect(call(fn.publicarPoliticaComercial)(req)).rejects.toMatchObject({ code: 'permission-denied' })
    await expect(call(fn.generarLiquidacionesAhora)(req)).rejects.toMatchObject({ code: 'permission-denied' })
    await expect(call(fn.pagarLiquidacion)(req)).rejects.toMatchObject({ code: 'permission-denied' })
  })

  test('admin publica política válida y rechaza inválida', async () => {
    mockDb.__seed('usuarios/a1', { roles: ['admin'] })
    const { version: _v, estado: _e, ...datos } = POLITICA
    const cambiada = { ...datos, cobro: { ...datos.cobro, plazo_pago_horas: 12 } }
    const res = await call(fn.publicarPoliticaComercial)({ auth: { uid: 'a1' }, data: cambiada })
    expect(res).toEqual({ version: 2 })

    await expect(call(fn.publicarPoliticaComercial)({ auth: { uid: 'a1' }, data: { ...datos, cobro: {} } }))
      .rejects.toMatchObject({ code: 'invalid-argument' })
  })
})
