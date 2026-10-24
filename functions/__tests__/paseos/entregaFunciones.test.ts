/**
 * Capa de Cloud Functions del cierre de la entrega: disparador, tareas y
 * permisos de los callables.
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
  onDocumentUpdated: (_p: string, h: unknown) => h,
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
jest.mock('../../src/economia/tareas', () => ({
  programarTarea: jest.fn().mockResolvedValue(true),
}))

import * as fn from '../../src/paseos/entregaFunciones'
import { programarTarea } from '../../src/economia/tareas'
import { limpiarCacheConfiguracion } from '../../src/comun/configuracion'
import { sembrarVersion } from '../helpers/versionado'

const call = (f: unknown) => f as (req: any) => Promise<any>
const trigger = fn.alFinalizarPaseoEntrega as unknown as (e: any) => Promise<void>
const tarea = (f: unknown) => f as (req: any, res: any) => Promise<void>

const POLITICA = {
  por_tipo: { paseo: { precio: { base_por_hora: 18000, mascota_adicional: 5000 },
    comision: { porcentaje_plataforma: 10 } } },
  cobro: { plazo_pago_horas: 24, bloqueo_tras_horas: 72, max_recordatorios: 3,
    intervalo_recordatorios_horas: 24, horario_recordatorios: { desde: 8, hasta: 19 } },
  liquidacion: { frecuencia: 'SEMANAL', dia_corte: 0, dia_pago: 2, monto_minimo: 0,
    solo_recaudadas: true },
  impuestos: { iva_comision: { aplica: true, porcentaje: 19, incluido_en_precio: true } },
  contabilidad: { documento_soporte_cuidador: true },
  entrega: { ventana_reclamo_horas: 48, cobrar_si_cierra_equipo: true,
    cierre_automatico_horas: 0, cierre_automatico_requiere_evidencia: true },
}
const PASEO = {
  tipo: 'paseo', estado: 'FINALIZADO', id_cuidador: 'c1', politica_version: 1,
  codigos_entrega_por_tutor: { t1: '123456' }, codigo_entrega_validado_por_tutor: {},
}
const evento = (antes: any, despues: any) => ({
  data: { before: { data: () => antes }, after: { data: () => despues } },
  params: { operacionId: 'p1' },
})
const admin = (data: any) => ({ auth: { uid: 'admin1', token: { roles: ['admin'] } }, data })
const tutor = (data: any) => ({ auth: { uid: 't1', token: {} }, data })

beforeEach(() => {
  jest.clearAllMocks()
  mockDb.__reset()
  limpiarCacheConfiguracion()
  jest.spyOn(console, 'warn').mockImplementation(() => undefined)
  sembrarVersion(mockDb, 'politica_comercial', 1, POLITICA)
  mockDb.__seed('operaciones/p1', { ...PASEO })
  mockDb.__seed('usuarios/t1', { roles: ['tutor'] })
})

describe('alFinalizarPaseoEntrega', () => {
  test('al entrar a FINALIZADO programa el seguimiento', async () => {
    await trigger(evento({ ...PASEO, estado: 'EN_PROGRESO' }, PASEO))
    expect(programarTarea).toHaveBeenCalledWith(
      'avisarEntregaPendiente', { paseoId: 'p1' }, expect.any(Number), 'entrega-aviso-p1')
    expect(programarTarea).toHaveBeenCalledWith(
      'revisarEntregaPendiente', { paseoId: 'p1' }, expect.any(Number), 'entrega-revision-p1')
  })

  test('no reprograma si ya estaba FINALIZADO ni con otros estados u operaciones', async () => {
    await trigger(evento(PASEO, { ...PASEO, requiere_revision: true }))
    await trigger(evento({ ...PASEO, estado: 'EN_CAMINO' }, { ...PASEO, estado: 'EN_PROGRESO' }))
    await trigger(evento({ tipo: 'otro' }, { tipo: 'otro', estado: 'FINALIZADO' }))
    expect(programarTarea).not.toHaveBeenCalled()
  })

  test('si no se puede programar, el cierre del paseo no falla', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    ;(programarTarea as jest.Mock).mockRejectedValueOnce(new Error('cola caída'))
    await expect(trigger(evento({ ...PASEO, estado: 'EN_PROGRESO' }, PASEO)))
      .resolves.toBeUndefined()
  })
})

describe('tareas de un solo uso', () => {
  const respuesta = () => {
    const res: any = { status: jest.fn(() => res), json: jest.fn(() => res) }
    return res
  }

  test('la revisión marca el paseo para el equipo', async () => {
    const res = respuesta()
    await tarea(fn.revisarEntregaPendiente)({ method: 'POST', body: { paseoId: 'p1' } }, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(mockDb.__docs.get('operaciones/p1').requiere_revision).toBe(true)
  })

  test('sin paseoId responde 500 para que Cloud Tasks reintente', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const res = respuesta()
    await tarea(fn.revisarEntregaPendiente)({ method: 'POST', body: {} }, res)
    expect(res.status).toHaveBeenCalledWith(500)
  })

  test('solo acepta POST', async () => {
    const res = respuesta()
    await tarea(fn.avisarEntregaPendiente)({ method: 'GET' }, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})

describe('resolverEntregaPendiente', () => {
  const datos = { paseoId: 'p1', decision: 'cerrar_a_favor_cuidador', motivo: 'GPS lo respalda' }

  test('solo el admin puede resolver', async () => {
    await expect(call(fn.resolverEntregaPendiente)(tutor(datos)))
      .rejects.toMatchObject({ code: 'permission-denied' })
    await expect(call(fn.resolverEntregaPendiente)({ data: datos }))
      .rejects.toMatchObject({ code: 'unauthenticated' })
    expect(mockDb.__docs.get('operaciones/p1').estado).toBe('FINALIZADO')
  })

  test('el admin cierra a favor del cuidador', async () => {
    const res = await call(fn.resolverEntregaPendiente)(admin(datos))
    expect(res).toEqual({ tutores: ['t1'], completado: true })
    expect(mockDb.__docs.get('operaciones/p1').estado).toBe('COMPLETADO')
  })

  test('el admin abre una disputa sin cobrar', async () => {
    await call(fn.resolverEntregaPendiente)(admin({ ...datos, decision: 'abrir_disputa' }))
    const paseo = mockDb.__docs.get('operaciones/p1')
    expect(paseo.estado).toBe('FINALIZADO')
    expect(paseo.en_disputa).toBeTruthy()
  })

  test('exige motivo y una decisión válida', async () => {
    await expect(call(fn.resolverEntregaPendiente)(admin({ ...datos, motivo: '' })))
      .rejects.toMatchObject({ code: 'invalid-argument' })
    await expect(call(fn.resolverEntregaPendiente)(admin({ ...datos, decision: 'otra' })))
      .rejects.toMatchObject({ code: 'invalid-argument' })
  })
})

describe('reclamo del cobro', () => {
  const COBRO = 'p1_t1_cobro'
  beforeEach(() => {
    const ahora = mockFirestore.MOCK_TIMESTAMP.now()
    mockDb.__seed(`obligaciones/${COBRO}`, {
      id: COBRO, tipo: 'COBRO_TUTOR', deudor: 't1', estado: 'PENDIENTE', valor: 18000,
      origen: 'cierre_equipo', creado_en: ahora, politica_version: 1,
      bloquear_desde: mockFirestore.MOCK_TIMESTAMP.fromMillis(ahora.toMillis() + 72 * 3600000),
      reclamo_hasta: mockFirestore.MOCK_TIMESTAMP.fromMillis(ahora.toMillis() + 48 * 3600000),
    })
  })

  test('el tutor abre el reclamo; sin sesión no', async () => {
    await expect(call(fn.abrirReclamoCobro)({ data: { obligacionId: COBRO, motivo: 'x' } }))
      .rejects.toMatchObject({ code: 'unauthenticated' })
    await call(fn.abrirReclamoCobro)(tutor({ obligacionId: COBRO, motivo: 'No llegó' }))
    expect(mockDb.__docs.get(`obligaciones/${COBRO}`).reclamo.estado).toBe('ABIERTO')
  })

  test('solo el admin resuelve; al mantener se retoma la cobranza', async () => {
    await call(fn.abrirReclamoCobro)(tutor({ obligacionId: COBRO, motivo: 'No llegó' }))
    const datos = { obligacionId: COBRO, decision: 'mantener', motivo: 'Hay evidencia' }

    await expect(call(fn.resolverReclamoCobro)(tutor(datos)))
      .rejects.toMatchObject({ code: 'permission-denied' })

    await call(fn.resolverReclamoCobro)(admin(datos))
    expect(mockDb.__docs.get(`obligaciones/${COBRO}`).reclamo.estado).toBe('RECHAZADO')
    expect(programarTarea).toHaveBeenCalledWith(
      'revisarCobroTutor', { obligacionId: COBRO }, expect.any(Number),
      expect.stringMatching(/^cobro-p1_t1_cobro-\d+$/))
  })

  test('al anular no se retoma la cobranza', async () => {
    await call(fn.abrirReclamoCobro)(tutor({ obligacionId: COBRO, motivo: 'No llegó' }))
    await call(fn.resolverReclamoCobro)(admin({
      obligacionId: COBRO, decision: 'anular', motivo: 'Tiene razón',
    }))
    expect(mockDb.__docs.get(`obligaciones/${COBRO}`).estado).toBe('ANULADA')
    expect(programarTarea).not.toHaveBeenCalled()
  })
})
