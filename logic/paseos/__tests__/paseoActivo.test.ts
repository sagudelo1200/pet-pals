/* eslint-env jest */
import { paseoActivo } from '@/logic/paseos'
import { ServicioPaseo } from '@/services/firebase'
import { ESTADOS_PASEO, Paseo } from '@/models/Paseo'
import { EVENTOS } from '@/logic/paseos/maquinaEstados'

// Mock de ServicioPaseo
jest.mock('@/services/firebase', () => ({
  ServicioPaseo: {
    aceptarSolicitud: jest.fn(),
    iniciarRuta: jest.fn(),
    iniciarPaseo: jest.fn(),
    finalizarPaseo: jest.fn(),
    actualizar: jest.fn(),
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
    paseoActivo.limpiarPaseoActivo()
    jest.clearAllMocks()
  })

  it('debe iniciar sin paseo activo', () => {
    expect(paseoActivo.getPaseoActivo()).toBeNull()
  })

  it('debe permitir setear un paseo activo', () => {
    const res = paseoActivo.setPaseoActivo(paseoMock)
    expect(res.ok).toBe(true)
    const activo = paseoActivo.getPaseoActivo()
    expect(activo).not.toBeNull()
    expect(activo?.id).toBe(paseoMock.id)
    expect(activo?.estado).toBe(ESTADOS_PASEO.PENDIENTE)
    expect(activo?.esActivo).toBe(true)
  })

  it('debe notificar a los suscriptores al cambiar estado', () => {
    const listener = jest.fn()
    const unsubscribe = paseoActivo.suscribir(listener)

    expect(listener).toHaveBeenCalledWith(null)

    paseoActivo.setPaseoActivo(paseoMock)
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener.mock.calls[1][0].id).toBe(paseoMock.id)

    unsubscribe()
  })

  it('debe validar transiciones inválidas con puede()', () => {
    paseoActivo.setPaseoActivo(paseoMock)
    expect(paseoActivo.puede(EVENTOS.FINALIZAR_PASEO)).toBe(false)
    expect(paseoActivo.puede(EVENTOS.ACEPTAR)).toBe(true)
  })

  it('aceptarPaseoAsync debe llamar al servicio y actualizar estado local', async () => {
    paseoActivo.setPaseoActivo(paseoMock)
    ;(ServicioPaseo.aceptarSolicitud as jest.Mock).mockResolvedValue({
      success: true,
    })

    const res = await paseoActivo.aceptarPaseoAsync()

    expect(res.success).toBe(true)
    expect(ServicioPaseo.aceptarSolicitud).toHaveBeenCalledWith(paseoMock.id)

    const activo = paseoActivo.getPaseoActivo()
    expect(activo?.estado).toBe(ESTADOS_PASEO.CONFIRMADO)
    expect(activo?.timestamps.confirmado).toBeDefined()
  })

  it('no debe actualizar estado local si el servicio falla', async () => {
    paseoActivo.setPaseoActivo(paseoMock)
    ;(ServicioPaseo.aceptarSolicitud as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Error backend',
    })

    const res = await paseoActivo.aceptarPaseoAsync()

    expect(res.success).toBe(false)
    const activo = paseoActivo.getPaseoActivo()
    expect(activo?.estado).toBe(ESTADOS_PASEO.PENDIENTE)
  })

  it('iniciarRutaAsync debe validar transición antes de llamar servicio', async () => {
    paseoActivo.setPaseoActivo(paseoMock)

    const res = await paseoActivo.iniciarRutaAsync()

    expect(res.success).toBe(false)
    expect(res.error).toBe('TRANSICION_INVALIDA')
    expect(ServicioPaseo.iniciarRuta).not.toHaveBeenCalled()
  })

  it('flujo completo feliz: Aseptar -> Iniciar Ruta -> Iniciar Paseo -> Finalizar', async () => {
    paseoActivo.setPaseoActivo(paseoMock)
    ;(ServicioPaseo.aceptarSolicitud as jest.Mock).mockResolvedValue({
      success: true,
    })
    await paseoActivo.aceptarPaseoAsync()
    expect(paseoActivo.getPaseoActivo()?.estado).toBe(ESTADOS_PASEO.CONFIRMADO)
    ;(ServicioPaseo.iniciarRuta as jest.Mock).mockResolvedValue({
      success: true,
    })
    await paseoActivo.iniciarRutaAsync()
    expect(paseoActivo.getPaseoActivo()?.estado).toBe(ESTADOS_PASEO.EN_CAMINO)
    ;(ServicioPaseo.iniciarPaseo as jest.Mock).mockResolvedValue({
      success: true,
    })
    await paseoActivo.iniciarPaseoAsync()
    expect(paseoActivo.getPaseoActivo()?.estado).toBe(ESTADOS_PASEO.EN_PROGRESO)
    expect(paseoActivo.getPaseoActivo()?.timestamps.iniciado).toBeDefined()
    ;(ServicioPaseo.finalizarPaseo as jest.Mock).mockResolvedValue({
      success: true,
    })
    await paseoActivo.finalizarPaseoAsync()
    expect(paseoActivo.getPaseoActivo()?.estado).toBe(ESTADOS_PASEO.FINALIZADO)
    expect(paseoActivo.getPaseoActivo()?.esActivo).toBe(false)
  })
})
