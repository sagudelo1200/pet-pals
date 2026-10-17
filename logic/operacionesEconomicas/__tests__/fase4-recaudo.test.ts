/**
 * TESTS FASE 4 + FASE 4.1
 * FASE 4: Validar Recepción del Servicio (Tutor confirma código)
 * FASE 4.1: Registrar Recaudo (Solicitar pago)
 */

import {
  registrarRecaudo,
  confirmarRecaudo,
} from '@/logic/operacionesEconomicas/casosDeUso'
import { MockAdaptador } from '@/logic/operacionesEconomicas/pagos/MockAdaptador'

// Mock Firestore
jest.mock(
  '@/services/firebase/firestore/colecciones/operacionesEconomicas',
  () => ({
    crearOperacion: jest.fn(async (_op: unknown): Promise<string> => `op-${Date.now()}`),
    actualizarOperacion: jest.fn(async () => {}),
    obtenerOperacion: jest.fn(async (_id: string): Promise<any> => null),
    crearEvento: jest.fn(async () => `evt-${Date.now()}`),
    registrarMovimiento: jest.fn(async () => `mov-${Date.now()}`),
    crearObligacion: jest.fn(async () => `oblig-${Date.now()}`),
    listarObligacionesPendientes: jest.fn(async (): Promise<any[]> => []),
    actualizarObligacion: jest.fn(async () => {}),
    obtenerObligacion: jest.fn(async (): Promise<any> => null),
  })
)

jest.mock('@/logic/operacionesEconomicas/invariantes', () => ({
  validateI1: jest.fn(() => true),
  validateI5: jest.fn(() => true),
}))

describe('FASE 4 + FASE 4.1: Validar Recepción y Registrar Recaudo', () => {
  const {
    obtenerOperacion,
    crearEvento,
    registrarMovimiento,
    actualizarOperacion,
  } = require('@/services/firebase/firestore/colecciones/operacionesEconomicas')

  const adaptador = new MockAdaptador()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('FASE 4.1: registrarRecaudo', () => {
    it('debería iniciar pago y retornar referencia', async () => {
      // Mock operación en estado EJECUTADA
      obtenerOperacion.mockResolvedValue({
        id: 'op-1',
        tutor_id: 'tutor-1',
        cuidador_id: 'cuidador-1',
        valor_acordado: 50000,
        remuneracion_mandatario: 5000,
        recursos_administrados: 45000,
        estado: 'EJECUTADA',
        creado_en: { toDate: () => new Date() },
      })

      const resultado = await registrarRecaudo('op-1', adaptador)

      // Verificar que retorna referencia
      expect(resultado.referencia).toBeDefined()
      expect(resultado.referencia).toContain('TXN-')

      // Verificar que registra movimiento PAGO_INICIADO
      expect(registrarMovimiento).toHaveBeenCalledWith(
        expect.objectContaining({
          operacion_id: 'op-1',
          tipo: 'PAGO_INICIADO',
          valor: 50000,
          sentido: 'ENTRADA',
          origen: 'TUTOR',
        })
      )

      // Verificar que registra evento
      expect(crearEvento).toHaveBeenCalledWith(
        expect.objectContaining({
          operacion_id: 'op-1',
          tipo: 'PAGO_INICIADO',
        })
      )

      // Iniciar el pago no cambia el estado (solo confirmarRecaudo lo hace)
      expect(actualizarOperacion).not.toHaveBeenCalled()
    })

    it('debería rechazar si operación no está en EJECUTADA', async () => {
      obtenerOperacion.mockResolvedValue({
        id: 'op-2',
        tutor_id: 'tutor-1',
        estado: 'PENDIENTE', // ❌ No está EJECUTADA
      })

      await expect(registrarRecaudo('op-2', adaptador)).rejects.toThrow(
        'Debe estar EJECUTADA'
      )
    })

    it('debería rechazar si operación no existe', async () => {
      obtenerOperacion.mockResolvedValue(null)

      await expect(
        registrarRecaudo('op-inexistente', adaptador)
      ).rejects.toThrow('no existe')
    })
  })

  describe('FASE 4.1: confirmarRecaudo', () => {
    it('debería transicionar a RECAUDADA cuando pago es aprobado', async () => {
      obtenerOperacion.mockResolvedValue({
        id: 'op-3',
        tutor_id: 'tutor-1',
        cuidador_id: 'cuidador-1',
        valor_acordado: 50000,
        estado: 'EJECUTADA',
      })

      const referencia = 'TXN-1234567-op-3'
      await confirmarRecaudo('op-3', referencia, adaptador)

      // Verificar que se registra evento de recaudo
      expect(crearEvento).toHaveBeenCalledWith(
        expect.objectContaining({
          operacion_id: 'op-3',
          tipo: 'RECAUDO',
        })
      )
    })

    it('debería rechazar si pago falla en pasarela', async () => {
      obtenerOperacion.mockResolvedValue({
        id: 'op-4',
        tutor_id: 'tutor-1',
        estado: 'EJECUTADA',
      })

      // MockAdaptador rechaza referencias con 'FAIL'
      const referenciaFail = 'TXN-FAIL-op-4'

      await expect(
        confirmarRecaudo('op-4', referenciaFail, adaptador)
      ).rejects.toThrow('Pago rechazado')

      // Verificar que registra evento PAGO_RECHAZADO
      expect(crearEvento).toHaveBeenCalledWith(
        expect.objectContaining({
          operacion_id: 'op-4',
          tipo: 'PAGO_RECHAZADO',
        })
      )
    })
  })

  describe('MockAdaptador', () => {
    it('debería simular pago exitoso', async () => {
      const resultado = await adaptador.iniciarPago({
        operacion_id: 'op-5',
        monto: 50000,
        tutor_id: 'tutor-1',
      })

      expect(resultado.token).toBeDefined()
      expect(resultado.referencia).toContain('TXN-')
    })

    it('debería confirmar pago exitoso', async () => {
      const referencia = 'TXN-1234567-op-6'
      const confirmacion = await adaptador.confirmarPago(referencia)

      expect(confirmacion.exito).toBe(true)
      expect(confirmacion.mensaje).toContain('Pago aprobado')
    })

    it('debería rechazar pago si referencia contiene FAIL', async () => {
      const referencia = 'TXN-FAIL-op-7'
      const confirmacion = await adaptador.confirmarPago(referencia)

      expect(confirmacion.exito).toBe(false)
      expect(confirmacion.mensaje).toContain('rechazado')
    })
  })
})
