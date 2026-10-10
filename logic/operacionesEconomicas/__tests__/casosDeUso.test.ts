import {
  crearOperacionEconomica,
  asignarCuidador,
  registrarServicioEjecutado,
  registrarRecaudo,
  generarObligacion,
  ejecutarPago,
  cerrarOperacion,
  cancelarOperacion,
} from '../casosDeUso'

// Mock Firestore
jest.mock(
  '@/services/firebase/firestore/colecciones/operacionesEconomicas',
  () => ({
    crearOperacion: jest.fn(async op => `op-${Date.now()}`),
    actualizarOperacion: jest.fn(async () => {}),
    obtenerOperacion: jest.fn(async id => null),
    crearEvento: jest.fn(async () => `evt-${Date.now()}`),
    obtenerEventosOperacion: jest.fn(async () => []),
    registrarMovimiento: jest.fn(async () => `mov-${Date.now()}`),
    listarMovimientosOperacion: jest.fn(async () => []),
    crearObligacion: jest.fn(async () => `oblig-${Date.now()}`),
    listarObligacionesPendientes: jest.fn(async () => []),
    actualizarObligacion: jest.fn(async () => {}),
    obtenerObligacion: jest.fn(async () => null),
  })
)

jest.mock('@/logic/operacionesEconomicas/invariantes', () => ({
  validateI1: jest.fn(() => true),
  validateI5: jest.fn(() => true),
}))

describe('Casos de Uso - Operaciones Económicas', () => {
  const {
    crearOperacion,
    actualizarOperacion,
    obtenerOperacion,
    crearEvento,
    registrarMovimiento,
    crearObligacion,
    listarObligacionesPendientes,
    actualizarObligacion,
    obtenerObligacion,
  } = require('@/services/firebase/firestore/colecciones/operacionesEconomicas')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('crearOperacionEconomica', () => {
    it('Debe crear operación con estado ENCARGADA', async () => {
      crearOperacion.mockResolvedValue('op-1')

      const opId = await crearOperacionEconomica('tutor-1', 50000, 5000, 45000)

      expect(crearOperacion).toHaveBeenCalledWith(
        expect.objectContaining({
          tutor_id: 'tutor-1',
          valor_acordado: 50000,
          remuneracion_mandatario: 5000,
          recursos_administrados: 45000,
          estado: 'ENCARGADA',
        })
      )
      expect(crearEvento).toHaveBeenCalledWith(
        expect.objectContaining({
          operacion_id: 'op-1',
          tipo: 'OPERACION_ENCARGADA',
        })
      )
      expect(opId).toBe('op-1')
    })

    it('Debe rechazar si I1 es violado', async () => {
      const {
        validateI1,
      } = require('@/logic/operacionesEconomicas/invariantes')
      validateI1.mockReturnValue(false)

      await expect(
        crearOperacionEconomica('tutor-1', 50000, 4000, 45000)
      ).rejects.toThrow('Violación I1')
    })
  })

  describe('asignarCuidador', () => {
    it('Debe asignar cuidador y registrar evento', async () => {
      obtenerOperacion.mockResolvedValue({
        id: 'op-1',
        estado: 'ENCARGADA',
      })

      await asignarCuidador('op-1', 'cuidador-1')

      expect(actualizarOperacion).toHaveBeenCalledWith('op-1', {
        cuidador_id: 'cuidador-1',
      })
      expect(crearEvento).toHaveBeenCalledWith(
        expect.objectContaining({
          operacion_id: 'op-1',
          tipo: 'CUIDADOR_ASIGNADO',
        })
      )
    })

    it('Debe rechazar si operación no existe', async () => {
      obtenerOperacion.mockResolvedValue(null)

      await expect(
        asignarCuidador('op-inexistente', 'cuidador-1')
      ).rejects.toThrow('no existe')
    })

    it('Debe rechazar si operación está CERRADA', async () => {
      obtenerOperacion.mockResolvedValue({
        id: 'op-1',
        estado: 'CERRADA',
      })

      await expect(asignarCuidador('op-1', 'cuidador-1')).rejects.toThrow(
        'terminal'
      )
    })
  })

  describe('registrarServicioEjecutado', () => {
    it('Debe cambiar estado a EJECUTADA si es ENCARGADA o EN_EJECUCION', async () => {
      obtenerOperacion.mockResolvedValue({
        id: 'op-1',
        estado: 'ENCARGADA',
      })

      await registrarServicioEjecutado('op-1')

      expect(actualizarOperacion).toHaveBeenCalledWith('op-1', {
        estado: 'EJECUTADA',
      })
    })

    it('Debe mantener RECAUDADA si ya está recaudada', async () => {
      obtenerOperacion.mockResolvedValue({
        id: 'op-1',
        estado: 'RECAUDADA',
      })

      await registrarServicioEjecutado('op-1')

      expect(actualizarOperacion).toHaveBeenCalledWith('op-1', {
        estado: 'RECAUDADA',
      })
    })
  })

  describe('registrarRecaudo', () => {
    it('Debe cambiar a RECAUDADA y registrar movimiento', async () => {
      obtenerOperacion.mockResolvedValue({
        id: 'op-1',
        estado: 'EJECUTADA',
      })
      registrarMovimiento.mockResolvedValue('mov-1')

      const movId = await registrarRecaudo('op-1', 50000, 'WOMPI', 'TXN-123')

      expect(registrarMovimiento).toHaveBeenCalledWith(
        expect.objectContaining({
          operacion_id: 'op-1',
          tipo: 'RECAUDO',
          valor: 50000,
          sentido: 'ENTRADA',
        })
      )
      expect(actualizarOperacion).toHaveBeenCalledWith('op-1', {
        estado: 'RECAUDADA',
      })
      expect(movId).toBe('mov-1')
    })
  })

  describe('generarObligacion', () => {
    it('Debe crear obligación en estado PENDIENTE', async () => {
      obtenerOperacion.mockResolvedValue({ id: 'op-1' })
      crearObligacion.mockResolvedValue('oblig-1')

      const obligId = await generarObligacion(
        'op-1',
        'deudor-1',
        'acreedor-1',
        'Pago',
        30000
      )

      expect(crearObligacion).toHaveBeenCalledWith(
        expect.objectContaining({
          operacion_id: 'op-1',
          deudor: 'deudor-1',
          acreedor: 'acreedor-1',
          valor: 30000,
          estado: 'PENDIENTE',
        })
      )
      expect(obligId).toBe('oblig-1')
    })
  })

  describe('ejecutarPago', () => {
    it('Debe pagar exactamente el valor de obligación', async () => {
      obtenerOperacion.mockResolvedValue({ id: 'op-1' })
      obtenerObligacion.mockResolvedValue({
        id: 'oblig-1',
        estado: 'PENDIENTE',
        valor: 30000,
      })
      registrarMovimiento.mockResolvedValue('mov-1')

      const movId = await ejecutarPago(
        'op-1',
        'oblig-1',
        30000,
        'WOMPI',
        'TXN-456'
      )

      expect(actualizarObligacion).toHaveBeenCalledWith(
        'oblig-1',
        expect.objectContaining({
          estado: 'CUMPLIDA',
          movimiento_cumplido_id: 'mov-1',
        })
      )
      expect(movId).toBe('mov-1')
    })

    it('Debe rechazar pago inexacto', async () => {
      obtenerOperacion.mockResolvedValue({ id: 'op-1' })
      obtenerObligacion.mockResolvedValue({
        id: 'oblig-1',
        estado: 'PENDIENTE',
        valor: 30000,
      })

      await expect(
        ejecutarPago('op-1', 'oblig-1', 25000, 'WOMPI', 'TXN-456')
      ).rejects.toThrow('exacto')
    })

    it('Debe rechazar si obligación no está PENDIENTE', async () => {
      obtenerOperacion.mockResolvedValue({ id: 'op-1' })
      obtenerObligacion.mockResolvedValue({
        id: 'oblig-1',
        estado: 'CUMPLIDA',
        valor: 30000,
      })

      await expect(
        ejecutarPago('op-1', 'oblig-1', 30000, 'WOMPI', 'TXN-456')
      ).rejects.toThrow('PENDIENTE')
    })
  })

  describe('cerrarOperacion', () => {
    it('Debe cerrar si no hay obligaciones PENDIENTE', async () => {
      obtenerOperacion.mockResolvedValue({
        id: 'op-1',
        estado: 'RECAUDADA',
      })
      listarObligacionesPendientes.mockResolvedValue([])

      await cerrarOperacion('op-1')

      expect(actualizarOperacion).toHaveBeenCalledWith('op-1', {
        estado: 'CERRADA',
      })
    })

    it('Debe rechazar si hay obligaciones PENDIENTE', async () => {
      obtenerOperacion.mockResolvedValue({
        id: 'op-1',
        estado: 'RECAUDADA',
      })
      listarObligacionesPendientes.mockResolvedValue([
        { id: 'oblig-1', estado: 'PENDIENTE' },
      ])

      await expect(cerrarOperacion('op-1')).rejects.toThrow('PENDIENTE')
    })
  })

  describe('cancelarOperacion', () => {
    it('Debe cancelar operación y anular obligaciones PENDIENTE', async () => {
      obtenerOperacion.mockResolvedValue({
        id: 'op-1',
        estado: 'EN_EJECUCION',
      })
      listarObligacionesPendientes.mockResolvedValue([
        { id: 'oblig-1', estado: 'PENDIENTE' },
        { id: 'oblig-2', estado: 'PENDIENTE' },
      ])

      await cancelarOperacion('op-1', 'admin-1', 'Solicitud del usuario')

      expect(actualizarOperacion).toHaveBeenCalledWith(
        'op-1',
        expect.objectContaining({
          estado: 'CANCELADA',
          cancelado_por: 'admin-1',
          cancelado_en: expect.any(Object), // Firestore Timestamp
        })
      )
      expect(actualizarObligacion).toHaveBeenCalledTimes(2)
      expect(actualizarObligacion).toHaveBeenCalledWith('oblig-1', {
        estado: 'ANULADA',
      })
      expect(actualizarObligacion).toHaveBeenCalledWith('oblig-2', {
        estado: 'ANULADA',
      })
    })

    it('Debe rechazar si operación está CERRADA', async () => {
      obtenerOperacion.mockResolvedValue({
        id: 'op-1',
        estado: 'CERRADA',
      })

      await expect(cancelarOperacion('op-1', 'admin-1')).rejects.toThrow(
        'CERRADA'
      )
    })
  })
})
