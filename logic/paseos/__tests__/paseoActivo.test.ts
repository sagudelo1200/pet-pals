/* eslint-env jest */
import { GestorPaseos } from '@/logic/paseos'
import { ServicioPaseo, ServicioAuth } from '@/services/firebase'
import { ESTADOS_PASEO, Paseo } from '@/models/Paseo'
import { EVENTOS } from '@/logic/paseos/maquinaEstados'

// Mock de ServicioPaseo y ServicioAuth
jest.mock('@/services/firebase/auth/auth', () => ({
  ServicioAuth: {
    obtenerUsuarioActual: jest.fn(() => ({
      uid: 'cuidador-1',
      displayName: 'Pedro',
      photoURL: 'http://foto.com',
    })),
  },
}))

jest.mock('@/services/firebase', () => ({
  ServicioPaseo: {
    commitEstadoTransaccional: jest.fn(),
    registrarEvento: jest.fn(),
    obtenerPorId: jest.fn(),
    actualizar: jest.fn(),
    iniciarRuta: jest.fn(),
    iniciarPaseo: jest.fn(),
    finalizarPaseo: jest.fn(),
  },
  ServicioAuth: {
    obtenerUsuarioActual: jest.fn(() => ({
      uid: 'cuidador-1',
      displayName: 'Pedro',
      photoURL: 'http://foto.com',
    })),
  },
}))

describe('GestorPaseoActivo', () => {
  const paseoMock: Paseo = {
    id: 'paseo-123',
    estado: ESTADOS_PASEO.PENDIENTE,
    tutor_nombre_visual: 'Juan',
    cuidador_nombre_visual: 'Pedro',
    mascota_ids: ['m1'],
    creado_en: new Date(),
    tipo_paseo: 'solicitado',
    fecha_hora_inicio: new Date(),
    duracion_estimada: 60,
    precio: 20000,
  } as any

  beforeEach(() => {
    GestorPaseos.paseoActivo.limpiarPaseoActivo()
    jest.clearAllMocks()
  })

  it('debe iniciar sin paseo activo', () => {
    expect(GestorPaseos.paseoActivo.getPaseoActivo()).toBeNull()
  })

  it('debe permitir setear un paseo activo', () => {
    const res = GestorPaseos.paseoActivo.setPaseoActivo(paseoMock)
    expect(res.ok).toBe(true)
    const activo = GestorPaseos.paseoActivo.getPaseoActivo()
    expect(activo).not.toBeNull()
    expect(activo?.id).toBe(paseoMock.id)
    expect(activo?.estado).toBe(ESTADOS_PASEO.PENDIENTE)
    expect(activo?.esActivo).toBe(true)
  })

  it('debe notificar a los suscriptores al cambiar estado', () => {
    const listener = jest.fn()
    const unsubscribe = GestorPaseos.paseoActivo.suscribir(listener)

    expect(listener).toHaveBeenCalledWith(null)

    GestorPaseos.paseoActivo.setPaseoActivo(paseoMock)
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener.mock.calls[1][0].id).toBe(paseoMock.id)

    unsubscribe()
  })

  it('debe validar transiciones inválidas con puede()', () => {
    GestorPaseos.paseoActivo.setPaseoActivo(paseoMock)
    expect(GestorPaseos.paseoActivo.puede(EVENTOS.FINALIZAR_PASEO)).toBe(false)
    expect(GestorPaseos.paseoActivo.puede(EVENTOS.ACEPTAR)).toBe(true)
  })

  it('aceptarPaseoAsync debe llamar al servicio y actualizar estado local', async () => {
    GestorPaseos.paseoActivo.setPaseoActivo(paseoMock)
    ;(ServicioPaseo.commitEstadoTransaccional as jest.Mock).mockResolvedValue({
      success: true,
    })

    const res = await GestorPaseos.paseoActivo.aceptarPaseoAsync()

    expect(res.success).toBe(true)
    expect(ServicioPaseo.commitEstadoTransaccional).toHaveBeenCalledWith(
      paseoMock.id,
      ESTADOS_PASEO.PENDIENTE,
      ESTADOS_PASEO.CONFIRMADO,
      expect.any(Object)
    )

    const activo = GestorPaseos.paseoActivo.getPaseoActivo()
    expect(activo?.estado).toBe(ESTADOS_PASEO.CONFIRMADO)
    expect(activo?.timestamps.confirmado).toBeDefined()
  })

  it('no debe actualizar estado local si el servicio falla', async () => {
    GestorPaseos.paseoActivo.setPaseoActivo(paseoMock)
    ;(ServicioPaseo.commitEstadoTransaccional as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Error backend',
    })

    const res = await GestorPaseos.paseoActivo.aceptarPaseoAsync()

    expect(res.success).toBe(false)
    const activo = GestorPaseos.paseoActivo.getPaseoActivo()
    expect(activo?.estado).toBe(ESTADOS_PASEO.PENDIENTE)
  })

  it('iniciarRutaAsync debe validar transición antes de llamar servicio', async () => {
    GestorPaseos.paseoActivo.setPaseoActivo(paseoMock)

    const res = await GestorPaseos.paseoActivo.iniciarRutaAsync()

    expect(res.success).toBe(false)
    expect(res.error).toBe('TRANSICION_INVALIDA')
    expect(ServicioPaseo.commitEstadoTransaccional).not.toHaveBeenCalled()
  })

  it('flujo completo feliz: Aseptar -> Iniciar Ruta -> Iniciar Paseo -> Finalizar', async () => {
    GestorPaseos.paseoActivo.setPaseoActivo(paseoMock)
    ;(ServicioPaseo.commitEstadoTransaccional as jest.Mock).mockResolvedValue({
      success: true,
    })

    await GestorPaseos.paseoActivo.aceptarPaseoAsync()
    expect(GestorPaseos.paseoActivo.getPaseoActivo()?.estado).toBe(ESTADOS_PASEO.CONFIRMADO)

    await GestorPaseos.paseoActivo.iniciarRutaAsync()
    expect(GestorPaseos.paseoActivo.getPaseoActivo()?.estado).toBe(ESTADOS_PASEO.EN_CAMINO)

    await GestorPaseos.paseoActivo.iniciarPaseoAsync()
    expect(GestorPaseos.paseoActivo.getPaseoActivo()?.estado).toBe(ESTADOS_PASEO.EN_PROGRESO)
    expect(GestorPaseos.paseoActivo.getPaseoActivo()?.timestamps.iniciado).toBeDefined()

    await GestorPaseos.paseoActivo.finalizarPaseoAsync()
    expect(GestorPaseos.paseoActivo.getPaseoActivo()?.estado).toBe(ESTADOS_PASEO.FINALIZADO)
    expect(GestorPaseos.paseoActivo.getPaseoActivo()?.esActivo).toBe(false)
  })
})
