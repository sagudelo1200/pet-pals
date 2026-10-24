/**
 * Tests de los callables genéricos de administración (configuración y
 * versionado) y del disparador que archiva consentimientos.
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
  onDocumentUpdated: (_o: unknown, h: unknown) => h,
}))
jest.mock('firebase-functions/v2/https', () => {
  class HttpsError extends Error {
    constructor(readonly code: string, message: string) {
      super(message)
    }
  }
  return { HttpsError, onCall: (_o: unknown, h: unknown) => h }
})

import * as admin from '../../src/administracion/funciones'
import { alArchivarConsentimiento } from '../../src/consentimientos/alArchivarConsentimiento'
import { limpiarCacheConfiguracion } from '../../src/comun/configuracion'

const call = (f: unknown) => f as (req: any) => Promise<any>
const ADMIN = { auth: { uid: 'a1', token: {} } }
const TUTOR = { auth: { uid: 't1', token: {} } }
const doc = (p: string) => mockDb.__docs.get(p)

const POLITICA = {
  por_tipo: {
    paseo: {
      precio: { base_por_hora: 18000, mascota_adicional: 5000 },
      comision: { porcentaje_plataforma: 10 },
    },
  },
  impuestos: { iva_comision: { aplica: true, porcentaje: 19, incluido_en_precio: true } },
  cobro: {
    plazo_pago_horas: 24, bloqueo_tras_horas: 72, max_recordatorios: 3,
    intervalo_recordatorios_horas: 24, horario_recordatorios: { desde: 8, hasta: 19 },
  },
  liquidacion: {
    frecuencia: 'SEMANAL', dia_corte: 0, dia_pago: 2, monto_minimo: 20000, solo_recaudadas: true,
  },
  contabilidad: { documento_soporte_cuidador: true },
  entrega: {
    ventana_reclamo_horas: 48, cobrar_si_cierra_equipo: true,
    cierre_automatico_horas: 0, cierre_automatico_requiere_evidencia: true,
  },
}

beforeEach(() => {
  mockDb.__reset()
  limpiarCacheConfiguracion()
  mockDb.__seed('usuarios/a1', { roles: ['admin'] })
  mockDb.__seed('usuarios/t1', { roles: ['tutor'] })
})

describe('permisos', () => {
  test('solo admin puede configurar, publicar y reactivar', async () => {
    for (const fn of [admin.actualizarConfiguracion, admin.publicarVersion, admin.reactivarVersion]) {
      await expect(call(fn)({ ...TUTOR, data: {} })).rejects.toMatchObject({ code: 'permission-denied' })
      await expect(call(fn)({ data: {} })).rejects.toMatchObject({ code: 'unauthenticated' })
    }
  })
})

describe('actualizarConfiguracion', () => {
  test('guarda un cambio válido', async () => {
    const res = await call(admin.actualizarConfiguracion)({
      ...ADMIN, data: { area: 'paseos', cambios: { escalada_minutos: 45 }, motivo: 'Más margen' },
    })
    expect(res).toEqual({ cambiadas: ['escalada_minutos'] })
    expect(doc('configuracion/paseos')).toMatchObject({ escalada_minutos: 45, actualizado_por: 'a1' })
  })

  test('rechaza valores inválidos con un mensaje claro', async () => {
    await expect(call(admin.actualizarConfiguracion)({
      ...ADMIN, data: { area: 'paseos', cambios: { max_mascotas: 50 }, motivo: 'Prueba' },
    })).rejects.toMatchObject({ code: 'invalid-argument', message: expect.stringMatching(/entre 1 y 10/) })
    await expect(call(admin.actualizarConfiguracion)({ ...ADMIN, data: { area: 'paseos' } }))
      .rejects.toMatchObject({ code: 'invalid-argument' })
  })
})

describe('publicarVersion y reactivarVersion', () => {
  const publicar = (contenido: unknown, motivo = 'Versión inicial') =>
    call(admin.publicarVersion)({ ...ADMIN, data: { tipo: 'politica_comercial', contenido, motivo } })

  test('publica la política, no duplica y exige motivo', async () => {
    expect(await publicar(POLITICA)).toMatchObject({ version: 1, nueva: true })
    expect(await publicar(POLITICA, 'Doble toque')).toMatchObject({ version: 1, nueva: false })
    await expect(publicar({ ...POLITICA, cobro: {} })).rejects.toMatchObject({ code: 'invalid-argument' })
    await expect(publicar(POLITICA, '')).rejects.toMatchObject({ code: 'invalid-argument' })
    await expect(call(admin.publicarVersion)({
      ...ADMIN, data: { tipo: 'inventado', contenido: {}, motivo: 'x' },
    })).rejects.toMatchObject({ code: 'invalid-argument' })
  })

  test('reactivar vuelve a poner vigente una versión anterior', async () => {
    await publicar(POLITICA)
    await publicar({ ...POLITICA, por_tipo: { paseo: { ...POLITICA.por_tipo.paseo, precio: { base_por_hora: 20000, mascota_adicional: 5000 } } } }, 'Sube tarifa')
    const res = await call(admin.reactivarVersion)({
      ...ADMIN, data: { tipo: 'politica_comercial', version: 1, motivo: 'Volver a la tarifa anterior' },
    })
    expect(res).toMatchObject({ version: 3, nueva: true })
    expect(doc('versionados/politica_comercial/versiones/v3').contenido.por_tipo.paseo.precio.base_por_hora).toBe(18000)
    await expect(call(admin.reactivarVersion)({
      ...ADMIN, data: { tipo: 'politica_comercial', version: 0, motivo: 'x' },
    })).rejects.toMatchObject({ code: 'invalid-argument' })
  })
})

describe('alArchivarConsentimiento', () => {
  const trigger = alArchivarConsentimiento as unknown as (e: any) => Promise<void>
  const evento = (tipo: string, antes: string, despues: string) => ({
    params: { tipo, versionId: 'v1' },
    data: {
      before: { data: () => ({ estado: antes }) },
      after: { data: () => ({ estado: despues }) },
    },
  })

  test('al archivar una versión, marca a quienes la aceptaron', async () => {
    mockDb.__seed('usuarios/u1', {
      consentimientos_estado_actual: {
        DATOS_PERSONALES: { documento_id: 'consentimiento_DATOS_PERSONALES/v1', es_documento_vigente_hoy: true },
      },
    })
    await trigger(evento('consentimiento_DATOS_PERSONALES', 'ACTIVA', 'HISTORICA'))
    expect(doc('usuarios/u1')['consentimientos_estado_actual.DATOS_PERSONALES.es_documento_vigente_hoy'])
      .toBe(false)
  })

  test('ignora otros tipos y cambios que no son archivar', async () => {
    mockDb.__seed('usuarios/u1', {
      consentimientos_estado_actual: {
        DATOS_PERSONALES: { documento_id: 'consentimiento_DATOS_PERSONALES/v1' },
      },
    })
    await trigger(evento('politica_comercial', 'ACTIVA', 'HISTORICA'))
    await trigger(evento('consentimiento_DATOS_PERSONALES', 'HISTORICA', 'HISTORICA'))
    expect(doc('usuarios/u1')).not.toHaveProperty(
      'consentimientos_estado_actual.DATOS_PERSONALES.es_documento_vigente_hoy')
  })
})
