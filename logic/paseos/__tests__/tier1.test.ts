/**
 * Tests Tier 1: aceptación de solicitudes (doble asignación y doble reserva)
 * y efectos económicos no bloqueantes al aceptar / finalizar un paseo.
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
import { registrarAuditoria } from '@/logic/operaciones/auditoria'
import { getDocs, where } from 'firebase/firestore'
import { ESTADOS_PASEO } from '@/models/Paseo'

const mock = (fn: unknown) => fn as jest.Mock

// Fecha base: 10:00 de un día fijo
const base = new Date(2030, 0, 10, 10, 0, 0)
const enMinutos = (min: number) => new Date(base.getTime() + min * 60000)
// Firestore devuelve Timestamp (con toDate), no Date
const ts = (d: Date) => ({ toDate: () => d })

function paseoPendiente(overrides: Record<string, unknown> = {}) {
  return {
    id: 'paseo-1',
    tipo: 'paseo',
    estado: ESTADOS_PASEO.PENDIENTE,
    creado_por: 'tutor-1',
    fecha_hora_inicio: ts(enMinutos(15)),
    duracion_estimada: 30,
    precio: 18000,
    ...overrides,
  }
}

function agenda(...paseos: Array<{ inicio: Date; duracion: number }>) {
  mock(getDocs).mockResolvedValue({
    docs: paseos.map(p => ({
      data: () => ({
        fecha_hora_inicio: ts(p.inicio),
        duracion_estimada: p.duracion,
      }),
    })),
  })
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
    mock(ServicioPaseo.commitEstadoTransaccional).mockResolvedValue({
      success: true,
    })
    mock(ServicioPaseo.registrarEvento).mockResolvedValue({ success: true })
    mock(registrarAuditoria).mockResolvedValue('aud-1')
    agenda()
  })

  it('confirma el paseo con el cuidador asignado', async () => {
    const res = await aceptarSolicitud('paseo-1')

    expect(res.success).toBe(true)
    expect(ServicioPaseo.commitEstadoTransaccional).toHaveBeenCalledWith(
      'paseo-1',
      ESTADOS_PASEO.PENDIENTE,
      ESTADOS_PASEO.CONFIRMADO,
      expect.objectContaining({ id_cuidador: 'cuidador-1' })
    )
    expect(registrarAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_evento: 'CAMBIO_ESTADO', actor: 'cuidador-1' })
    )
  })

  it('rechaza aceptar un paseo propio', async () => {
    mock(ServicioPaseo.obtenerPorId).mockResolvedValue({
      success: true,
      data: paseoPendiente({ creado_por: 'cuidador-1' }),
    })

    const res = await aceptarSolicitud('paseo-1')

    expect(res).toEqual({ success: false, error: 'NO_PUEDE_ACEPTAR_PROPIO_PASEO' })
    expect(ServicioPaseo.commitEstadoTransaccional).not.toHaveBeenCalled()
  })

  it('rechaza si el paseo ya no está PENDIENTE', async () => {
    mock(ServicioPaseo.obtenerPorId).mockResolvedValue({
      success: true,
      data: paseoPendiente({ estado: ESTADOS_PASEO.CONFIRMADO }),
    })

    const res = await aceptarSolicitud('paseo-1')

    expect(res).toEqual({ success: false, error: 'PASEO_NO_DISPONIBLE' })
  })

  it('rechaza una solicitud dirigida a otro cuidador', async () => {
    mock(ServicioPaseo.obtenerPorId).mockResolvedValue({
      success: true,
      data: paseoPendiente({ id_cuidador: 'otro-cuidador' }),
    })

    const res = await aceptarSolicitud('paseo-1')

    expect(res).toEqual({ success: false, error: 'PASEO_YA_ACEPTADO' })
  })

  describe('Doble reserva (con Timestamp de Firestore)', () => {
    it('detecta solapamiento: agenda 10:00-10:30 vs solicitud 10:15-10:45', async () => {
      agenda({ inicio: enMinutos(0), duracion: 30 })

      const res: any = await aceptarSolicitud('paseo-1')

      expect(res.success).toBe(false)
      expect(res.error).toBe('DOBLE_BOOKING_DETECTADO')
      expect(res.detalles).toContain('30min')
      expect(ServicioPaseo.commitEstadoTransaccional).not.toHaveBeenCalled()
    })

    it('permite paseos consecutivos fuera del buffer de 5 min (10:00-10:30 vs 10:40)', async () => {
      agenda({ inicio: enMinutos(0), duracion: 30 })
      mock(ServicioPaseo.obtenerPorId).mockResolvedValue({
        success: true,
        data: paseoPendiente({ fecha_hora_inicio: ts(enMinutos(40)) }),
      })

      const res = await aceptarSolicitud('paseo-1')

      expect(res.success).toBe(true)
    })

    it('respeta el buffer de 5 min (10:00-10:30 vs 10:33 se solapa)', async () => {
      agenda({ inicio: enMinutos(0), duracion: 30 })
      mock(ServicioPaseo.obtenerPorId).mockResolvedValue({
        success: true,
        data: paseoPendiente({ fecha_hora_inicio: ts(enMinutos(33)) }),
      })

      const res: any = await aceptarSolicitud('paseo-1')

      expect(res.error).toBe('DOBLE_BOOKING_DETECTADO')
    })

    it('acepta fecha_hora_inicio como Date además de Timestamp', async () => {
      mock(ServicioPaseo.obtenerPorId).mockResolvedValue({
        success: true,
        data: paseoPendiente({ fecha_hora_inicio: enMinutos(15) }),
      })
      agenda({ inicio: enMinutos(0), duracion: 30 })

      const res: any = await aceptarSolicitud('paseo-1')

      expect(res.error).toBe('DOBLE_BOOKING_DETECTADO')
    })

    it('consulta todos los estados activos del cuidador, incluido EN_PUNTO_RECOGIDA', async () => {
      await aceptarSolicitud('paseo-1')

      expect(where).toHaveBeenCalledWith('id_cuidador', '==', 'cuidador-1')
      expect(where).toHaveBeenCalledWith('estado', 'in', [
        ESTADOS_PASEO.CONFIRMADO,
        ESTADOS_PASEO.EN_CAMINO,
        ESTADOS_PASEO.EN_PUNTO_RECOGIDA,
        ESTADOS_PASEO.EN_PROGRESO,
      ])
    })

    it('si la consulta de agenda falla, no acepta (ERROR_VALIDACION)', async () => {
      mock(getDocs).mockRejectedValue(new Error('requires an index'))

      const res: any = await aceptarSolicitud('paseo-1')

      expect(res.success).toBe(false)
      expect(res.error).toBe('ERROR_VALIDACION')
    })
  })

  describe('Doble asignación (carrera entre cuidadores)', () => {
    it('reintenta si el estado cambió y el paseo sigue PENDIENTE', async () => {
      mock(ServicioPaseo.commitEstadoTransaccional)
        .mockResolvedValueOnce({ success: false, error: 'ESTADO_NO_ESPERADO' })
        .mockResolvedValueOnce({ success: true })

      const res = await aceptarSolicitud('paseo-1')

      expect(res.success).toBe(true)
      expect(ServicioPaseo.commitEstadoTransaccional).toHaveBeenCalledTimes(2)
    })

    it('devuelve PASEO_YA_ACEPTADO con el nombre de quien ganó la carrera', async () => {
      mock(ServicioPaseo.commitEstadoTransaccional).mockResolvedValue({
        success: false,
        error: 'ESTADO_NO_ESPERADO',
      })
      mock(ServicioPaseo.obtenerPorId)
        .mockResolvedValueOnce({ success: true, data: paseoPendiente() })
        .mockResolvedValueOnce({
          success: true,
          data: paseoPendiente({
            estado: ESTADOS_PASEO.CONFIRMADO,
            cuidador_nombre_visual: 'Ana',
          }),
        })

      const res: any = await aceptarSolicitud('paseo-1')

      expect(res.error).toBe('PASEO_YA_ACEPTADO')
      expect(res.detalles).toContain('Ana')
      expect(ServicioPaseo.commitEstadoTransaccional).toHaveBeenCalledTimes(1)
    })

    it('no reintenta ante errores que no son de doble asignación', async () => {
      mock(ServicioPaseo.commitEstadoTransaccional).mockResolvedValue({
        success: false,
        error: 'PERMISOS_INSUFICIENTES',
      })

      const res: any = await aceptarSolicitud('paseo-1')

      expect(res.error).toBe('PERMISOS_INSUFICIENTES')
      expect(ServicioPaseo.commitEstadoTransaccional).toHaveBeenCalledTimes(1)
    })
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
