/**
 * Tests Tier 1: aceptación de solicitudes y cierre del paseo.
 * Qué cuidador puede tomar un paseo (doble reserva, zona, cupo, tamaño) y la
 * carrera entre cuidadores los decide el servidor: functions/__tests__/emparejamiento.
 * La escalada automática se prueba en functions/__tests__/paseos.
 */

/* eslint-env jest */

jest.mock('@/services/firebase', () => ({
  ServicioAuth: { obtenerUsuarioActual: jest.fn() },
  ServicioPaseo: {
    obtenerPorId: jest.fn(),
    commitEstadoTransaccional: jest.fn(),
    registrarEvento: jest.fn(),
  },
}))

jest.mock('@/services/firebase/emparejamiento', () => ({
  aceptarPaseo: jest.fn(),
}))

jest.mock('@/logic/paseos/gestor', () => ({
  paseoActivo: {
    aceptarPaseo: jest.fn(),
    finalizarPaseo: jest.fn(),
  },
}))

jest.mock('@/logic/operaciones/auditoria', () => ({
  registrarAuditoria: jest.fn(),
}))

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn((...args: unknown[]) => ({ where: args })),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
}))

import { aceptarSolicitud, finalizarPaseo } from '@/logic/paseos/casosDeUso'
import { ServicioAuth, ServicioPaseo } from '@/services/firebase'
import { aceptarPaseo } from '@/services/firebase/emparejamiento'
import { registrarAuditoria } from '@/logic/operaciones/auditoria'
import { paseoActivo } from '@/logic/paseos/gestor'
import { ESTADOS_PASEO } from '@/models/Paseo'

const mock = (fn: unknown) => fn as jest.Mock

function paseoPendiente(overrides: Record<string, unknown> = {}) {
  return {
    id: 'paseo-1',
    tipo: 'paseo',
    estado: ESTADOS_PASEO.PENDIENTE,
    creado_por: 'tutor-1',
    duracion_estimada: 30,
    precio: 18000,
    ...overrides,
  }
}

describe('Tier 1: aceptarSolicitud', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mock(ServicioAuth.obtenerUsuarioActual).mockReturnValue({
      uid: 'cuidador-1',
      displayName: 'Pedro',
      photoURL: null,
    })
    mock(ServicioPaseo.obtenerPorId).mockResolvedValue({
      success: true,
      data: paseoPendiente(),
    })
    mock(aceptarPaseo).mockResolvedValue({
      aceptado: true,
      id_cuidador: 'cuidador-1',
    })
    mock(ServicioPaseo.registrarEvento).mockResolvedValue({ success: true })
    mock(registrarAuditoria).mockResolvedValue('aud-1')
  })

  it('el servidor confirma el paseo y la app registra el evento y la auditoría', async () => {
    const res = await aceptarSolicitud('paseo-1')

    expect(res.success).toBe(true)
    expect(aceptarPaseo).toHaveBeenCalledWith({ paseoId: 'paseo-1' })
    expect(ServicioPaseo.commitEstadoTransaccional).not.toHaveBeenCalled()
    expect(paseoActivo.aceptarPaseo).toHaveBeenCalled()
    expect(ServicioPaseo.registrarEvento).toHaveBeenCalledWith(
      'paseo-1',
      'ACEPTAR',
      expect.objectContaining({ id_cuidador: 'cuidador-1' })
    )
    expect(registrarAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_evento: 'CAMBIO_ESTADO', actor: 'cuidador-1' })
    )
  })

  it('si el servidor no lo deja, devuelve su motivo y no registra nada', async () => {
    mock(aceptarPaseo).mockRejectedValue(
      new Error('Ya tienes otro paseo en ese horario')
    )

    const res: any = await aceptarSolicitud('paseo-1')

    expect(res).toEqual({
      success: false,
      error: 'ACEPTACION_RECHAZADA',
      detalles: 'Ya tienes otro paseo en ese horario',
    })
    expect(paseoActivo.aceptarPaseo).not.toHaveBeenCalled()
    expect(ServicioPaseo.registrarEvento).not.toHaveBeenCalled()
    expect(registrarAuditoria).not.toHaveBeenCalled()
  })

  it('si hay avisos (tamaño, cupo), no acepta: los devuelve para que el cuidador decida', async () => {
    const advertencias = [{ tipo: 'tamano', mascotas: ['Rocky'] }]
    mock(aceptarPaseo).mockResolvedValue({
      aceptado: false,
      requiereConfirmacion: true,
      advertencias,
    })

    const res: any = await aceptarSolicitud('paseo-1')

    expect(res).toEqual({
      success: false,
      error: 'REQUIERE_CONFIRMACION',
      advertencias,
    })
    expect(paseoActivo.aceptarPaseo).not.toHaveBeenCalled()
    expect(ServicioPaseo.registrarEvento).not.toHaveBeenCalled()
    expect(registrarAuditoria).not.toHaveBeenCalled()
  })

  it('si el cuidador confirma, repite con confirmo y registra la aceptación', async () => {
    const res = await aceptarSolicitud('paseo-1', { confirmo: true })

    expect(res.success).toBe(true)
    expect(aceptarPaseo).toHaveBeenCalledWith({
      paseoId: 'paseo-1',
      confirmo: true,
    })
    expect(registrarAuditoria).toHaveBeenCalled()
  })

  it('rechaza aceptar un paseo propio sin molestar al servidor', async () => {
    mock(ServicioPaseo.obtenerPorId).mockResolvedValue({
      success: true,
      data: paseoPendiente({ creado_por: 'cuidador-1' }),
    })

    const res = await aceptarSolicitud('paseo-1')

    expect(res).toEqual({ success: false, error: 'NO_PUEDE_ACEPTAR_PROPIO_PASEO' })
    expect(aceptarPaseo).not.toHaveBeenCalled()
  })

  it('rechaza si el paseo ya no está PENDIENTE', async () => {
    mock(ServicioPaseo.obtenerPorId).mockResolvedValue({
      success: true,
      data: paseoPendiente({ estado: ESTADOS_PASEO.CONFIRMADO }),
    })

    const res = await aceptarSolicitud('paseo-1')

    expect(res).toEqual({ success: false, error: 'PASEO_NO_DISPONIBLE' })
    expect(aceptarPaseo).not.toHaveBeenCalled()
  })

  it('rechaza una solicitud dirigida a otro cuidador', async () => {
    mock(ServicioPaseo.obtenerPorId).mockResolvedValue({
      success: true,
      data: paseoPendiente({ id_cuidador: 'otro-cuidador' }),
    })

    const res = await aceptarSolicitud('paseo-1')

    expect(res).toEqual({ success: false, error: 'PASEO_YA_ACEPTADO' })
    expect(aceptarPaseo).not.toHaveBeenCalled()
  })

  it('sin sesión no hace nada', async () => {
    mock(ServicioAuth.obtenerUsuarioActual).mockReturnValue(null)

    const res: any = await aceptarSolicitud('paseo-1')

    expect(res.success).toBe(false)
    expect(aceptarPaseo).not.toHaveBeenCalled()
  })
})

describe('Tier 1: finalizarPaseo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mock(ServicioAuth.obtenerUsuarioActual).mockReturnValue({ uid: 'cuidador-1' })
    mock(ServicioPaseo.obtenerPorId).mockResolvedValue({
      success: true,
      data: paseoPendiente({ estado: ESTADOS_PASEO.EN_PROGRESO }),
    })
    mock(ServicioPaseo.commitEstadoTransaccional).mockResolvedValue({
      success: true,
    })
    mock(ServicioPaseo.registrarEvento).mockResolvedValue({ success: true })
  })

  // El cobro y el pago al cuidador los genera el servidor al entrar a FINALIZADO
  it('transiciona EN_PROGRESO → FINALIZADO', async () => {
    const res = await finalizarPaseo('paseo-1')

    expect(res.success).toBe(true)
    expect(ServicioPaseo.commitEstadoTransaccional).toHaveBeenCalledWith(
      'paseo-1',
      ESTADOS_PASEO.EN_PROGRESO,
      ESTADOS_PASEO.FINALIZADO,
      expect.objectContaining({ fecha_fin_real: 'SERVER_TS' })
    )
  })

  it('rechaza finalizar un paseo que no está EN_PROGRESO', async () => {
    mock(ServicioPaseo.obtenerPorId).mockResolvedValue({
      success: true,
      data: paseoPendiente({ estado: ESTADOS_PASEO.CONFIRMADO }),
    })

    const res = await finalizarPaseo('paseo-1')

    expect(res).toEqual({ success: false, error: 'TRANSICION_INVALIDA' })
    expect(ServicioPaseo.commitEstadoTransaccional).not.toHaveBeenCalled()
  })
})
