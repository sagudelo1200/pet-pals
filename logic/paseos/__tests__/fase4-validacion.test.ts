/**
 * TESTS FASE 4: Validar Recepción del Servicio
 * Tutor confirma con código que recibió la mascota
 * Transiciona FINALIZADO → COMPLETADO (la transacción vive en ServicioPaseo)
 */

/* eslint-env jest */

const mockValidarCodigoEntrega = jest.fn()
const mockRegistrarEvento = jest.fn()

jest.mock('@/services/firebase', () => ({
  ServicioAuth: {
    obtenerUsuarioActual: jest.fn(() => ({ uid: 'tutor-1' })),
  },
  ServicioPaseo: {
    validarCodigoEntregaPorTutor: mockValidarCodigoEntrega,
    registrarEvento: mockRegistrarEvento,
  },
}))

jest.mock('@/logic/paseos/gestor', () => ({
  paseoActivo: {
    finalizarPaseo: jest.fn(),
  },
}))

import { validarRecepcionTutor } from '@/logic/paseos/casosDeUso'

describe('FASE 4: Validar Recepción del Servicio', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRegistrarEvento.mockResolvedValue({ success: true })
  })

  describe('validarRecepcionTutor', () => {
    it('debería transicionar FINALIZADO → COMPLETADO con código correcto', async () => {
      mockValidarCodigoEntrega.mockResolvedValue({
        success: true,
        completado: true,
      })

      const resultado = await validarRecepcionTutor(
        'paseo-1',
        'tutor-1',
        '123456'
      )

      expect(resultado.success).toBe(true)
      expect(mockValidarCodigoEntrega).toHaveBeenCalledWith(
        'paseo-1',
        'tutor-1',
        '123456'
      )
      expect(mockRegistrarEvento).toHaveBeenCalledWith(
        'paseo-1',
        'VALIDAR_ENTREGA_TUTOR',
        expect.objectContaining({
          tutor_id: 'tutor-1',
          completado: true,
          estado_nuevo: 'COMPLETADO',
        })
      )
    })

    it('debería rechazar con código incorrecto', async () => {
      mockValidarCodigoEntrega.mockResolvedValue({
        success: false,
        error: 'CODIGO_ENTREGA_INCORRECTO',
        intentosFallidos: 1,
      })

      const resultado = await validarRecepcionTutor(
        'paseo-2',
        'tutor-1',
        '000000'
      )

      expect(resultado.success).toBe(false)
      expect(resultado.error).toContain('Código incorrecto')
      expect(resultado.error).toContain('2')
      expect(mockRegistrarEvento).not.toHaveBeenCalled()
    })

    it('debería bloquear después de 3 intentos fallidos', async () => {
      mockValidarCodigoEntrega.mockResolvedValue({
        success: false,
        error: 'CODIGO_ENTREGA_BLOQUEADO',
        intentosFallidos: 3,
      })

      const resultado = await validarRecepcionTutor(
        'paseo-3',
        'tutor-1',
        '000000'
      )

      expect(resultado.success).toBe(false)
      expect(resultado.error).toContain('Máximo de intentos')
    })

    it('debería rechazar si paseo no está en FINALIZADO', async () => {
      mockValidarCodigoEntrega.mockResolvedValue({
        success: false,
        error: 'ESTADO_NO_ESPERADO',
      })

      const resultado = await validarRecepcionTutor(
        'paseo-4',
        'tutor-1',
        '123456'
      )

      expect(resultado.success).toBe(false)
      expect(resultado.error).toContain('FINALIZADO')
    })

    it('debería rechazar si no hay código generado para el tutor', async () => {
      mockValidarCodigoEntrega.mockResolvedValue({
        success: false,
        error: 'CODIGO_ENTREGA_NO_ENCONTRADO',
      })

      const resultado = await validarRecepcionTutor(
        'paseo-5',
        'tutor-1',
        '123456'
      )

      expect(resultado.success).toBe(false)
      expect(resultado.error).toContain('No hay código de entrega')
    })

    it('debería rechazar si quien valida no es el tutor indicado', async () => {
      const resultado = await validarRecepcionTutor(
        'paseo-6',
        'otro-tutor',
        '123456'
      )

      expect(resultado.success).toBe(false)
      expect(mockValidarCodigoEntrega).not.toHaveBeenCalled()
    })
  })
})
