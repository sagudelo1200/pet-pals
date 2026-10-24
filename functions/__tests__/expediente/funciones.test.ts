/**
 * Capa de Cloud Functions del expediente: disparadores y callables.
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
  onDocumentDeleted: (_p: string, h: unknown) => h,
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

import * as fn from '../../src/expediente/funciones'
import { limpiarCacheConfiguracion } from '../../src/comun/configuracion'

const call = (f: unknown) => f as (req: any) => Promise<any>
const disparar = (f: unknown) => f as (e: any) => Promise<void>
const exp = (id = 'm1') => mockDb.__docs.get(`expedientes/${id}`)
const tutor = (data: any) => ({ auth: { uid: 't1', token: {} }, data })

const PASEO = {
  tipo: 'paseo', estado: 'EN_PROGRESO', creado_por: 't1', id_cuidador: 'c1',
  mascota_ids: ['m1'],
}

beforeEach(() => {
  mockDb.__reset()
  limpiarCacheConfiguracion()
  jest.spyOn(console, 'warn').mockImplementation(() => undefined)
  jest.spyOn(console, 'error').mockImplementation(() => undefined)
  mockDb.__seed('operaciones/p1', { ...PASEO })
  mockDb.__seed('mascotas/m1', { creado_por: 't1', especie: 'perro' })
})

describe('alRegistrarMomentoExpediente', () => {
  const evento = (tipo: string) => ({
    params: { operacionId: 'p1', eventoId: 'e1' },
    data: { data: () => ({ evento: tipo }) },
  })

  test('un momento de bitácora alimenta el expediente', async () => {
    mockDb.__seed('operaciones/p1/eventos/e1', {
      evento: 'bitacora', actor: 'c1',
      payload: { clave: 'como_esta.se_puso_nervioso', causa: 'ruido_fuerte', timestamp: Date.now() },
    })
    await disparar(fn.alRegistrarMomentoExpediente)(evento('bitacora'))
    expect(exp().resumen.que_evitar).toHaveLength(1)
  })

  test('los incidentes también cuentan', async () => {
    mockDb.__seed('operaciones/p1/eventos/e1', {
      evento: 'incidente', actor: 'c1', payload: { clave: 'emergencia.lesion', timestamp: Date.now() },
    })
    await disparar(fn.alRegistrarMomentoExpediente)(evento('incidente'))
    expect(exp().alertas.map((a: any) => a.clave)).toEqual(['tuvo_una_lesion_reciente'])
  })

  test('otros eventos del paseo se ignoran', async () => {
    mockDb.__seed('operaciones/p1/eventos/e1', {
      evento: 'llegada', actor: 't1', payload: { llegada: 'tranquilo' },
    })
    await disparar(fn.alRegistrarMomentoExpediente)(evento('llegada'))
    expect(exp()).toBeUndefined()
  })

  test('un fallo no rompe el registro del momento', async () => {
    mockDb.__seed('operaciones/p1/eventos/e1', {
      evento: 'bitacora', actor: 'c1', payload: { clave: 'como_esta.jugo' },
    })
    jest.spyOn(mockDb, 'runTransaction').mockRejectedValueOnce(new Error('caído'))
    await expect(disparar(fn.alRegistrarMomentoExpediente)(evento('bitacora')))
      .resolves.toBeUndefined()
  })
})

describe('alCambiarEstadoPaseoExpediente', () => {
  const cambio = (antes: string, despues: string, tipo = 'paseo') => ({
    params: { operacionId: 'p1' },
    data: {
      before: { data: () => ({ ...PASEO, tipo, estado: antes }) },
      after: { data: () => ({ ...PASEO, tipo, estado: despues }) },
    },
  })

  test('al confirmarse autoriza al cuidador', async () => {
    await disparar(fn.alCambiarEstadoPaseoExpediente)(cambio('PENDIENTE', 'CONFIRMADO'))
    expect(exp().cuidadores_autorizados).toEqual(['c1'])
  })

  test('al finalizar cuenta el vínculo', async () => {
    await disparar(fn.alCambiarEstadoPaseoExpediente)(cambio('EN_PROGRESO', 'FINALIZADO'))
    expect(exp().vinculos.c1.paseos).toBe(1)
  })

  test('ignora otros estados, cambios sin cambio de estado y otras operaciones', async () => {
    await disparar(fn.alCambiarEstadoPaseoExpediente)(cambio('CONFIRMADO', 'EN_CAMINO'))
    await disparar(fn.alCambiarEstadoPaseoExpediente)(cambio('FINALIZADO', 'FINALIZADO'))
    await disparar(fn.alCambiarEstadoPaseoExpediente)(cambio('PENDIENTE', 'CONFIRMADO', 'otro'))
    expect(exp()).toBeUndefined()
  })
})

describe('ficha y supresión de la mascota', () => {
  test('editar la ficha llega al expediente; borrar la mascota lo borra', async () => {
    await disparar(fn.alCambiarEstadoPaseoExpediente)({
      params: { operacionId: 'p1' },
      data: {
        before: { data: () => ({ ...PASEO, estado: 'PENDIENTE' }) },
        after: { data: () => ({ ...PASEO, estado: 'CONFIRMADO' }) },
      },
    })
    await disparar(fn.alActualizarMascotaExpediente)({
      params: { mascotaId: 'm1' },
      data: { after: { data: () => ({ creado_por: 't1', especie: 'gato' }) } },
    })
    expect(exp().quien_es).toBe('Gato')

    await disparar(fn.alBorrarMascotaExpediente)({ params: { mascotaId: 'm1' } })
    expect(exp()).toBeUndefined()
  })
})

describe('registrarLlegada (callable)', () => {
  beforeEach(() => mockDb.__seed('operaciones/p1', { ...PASEO, estado: 'FINALIZADO' }))

  test('el tutor responde cómo llegó', async () => {
    const res = await call(fn.registrarLlegada)(tutor({ paseoId: 'p1', llegada: 'tranquilo' }))
    expect(res).toEqual({ mascotas: ['m1'] })
    expect(exp().ultimas_llegadas[0].llegada).toBe('tranquilo')
  })

  test('exige sesión y datos', async () => {
    await expect(call(fn.registrarLlegada)({ data: { paseoId: 'p1', llegada: 'tranquilo' } }))
      .rejects.toMatchObject({ code: 'unauthenticated' })
    await expect(call(fn.registrarLlegada)(tutor({ llegada: 'tranquilo' })))
      .rejects.toMatchObject({ code: 'invalid-argument' })
  })

  test('traduce los errores de negocio', async () => {
    await expect(call(fn.registrarLlegada)({
      auth: { uid: 'intruso', token: {} }, data: { paseoId: 'p1', llegada: 'tranquilo' },
    })).rejects.toMatchObject({ code: 'not-found' })
    await expect(call(fn.registrarLlegada)(tutor({ paseoId: 'p1', llegada: 'feliz' })))
      .rejects.toMatchObject({ code: 'invalid-argument' })
  })
})

describe('confirmarAprendizaje (callable)', () => {
  beforeEach(async () => {
    mockDb.__seed('operaciones/p1/eventos/e1', {
      evento: 'incidente', actor: 'c1',
      payload: { clave: 'emergencia.conflicto_con_otro_perro', timestamp: Date.now() },
    })
    await disparar(fn.alRegistrarMomentoExpediente)({
      params: { operacionId: 'p1', eventoId: 'e1' },
      data: { data: () => ({ evento: 'incidente' }) },
    })
  })

  test('el tutor confirma', async () => {
    const res = await call(fn.confirmarAprendizaje)(tutor({
      mascotaId: 'm1', clave: 'tuvo_un_conflicto_con_otro_perro', decision: 'confirmado',
    }))
    expect(res).toEqual({ ok: true })
    expect(exp().resumen.que_evitar[0].estado).toBe('confirmado')
  })

  test('un cuidador, aunque esté autorizado, no puede decidir', async () => {
    await expect(call(fn.confirmarAprendizaje)({
      auth: { uid: 'c1', token: {} },
      data: { mascotaId: 'm1', clave: 'tuvo_un_conflicto_con_otro_perro', decision: 'rechazado' },
    })).rejects.toMatchObject({ code: 'not-found' })
    expect(exp().resumen.que_evitar).toHaveLength(1)
  })

  test('exige sesión', async () => {
    await expect(call(fn.confirmarAprendizaje)({
      data: { mascotaId: 'm1', clave: 'x', decision: 'confirmado' },
    })).rejects.toMatchObject({ code: 'unauthenticated' })
  })
})
