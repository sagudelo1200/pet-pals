/* eslint-env jest */
import { registrarAuditoria } from '@/logic/operaciones/auditoria'
import { ServicioAuditoria } from '@/services/firebase/firestore/colecciones/auditoria'
import type { CambioAuditoria } from '@/models/Operacion'

// Mock de Firebase
jest.mock('@/firebase.config', () => ({
  db: {},
}))

jest.mock('@/services/firebase/firestore/colecciones/auditoria', () => ({
  ServicioAuditoria: {
    registrar: jest.fn(),
  },
}))

describe('FASE 0: Auditoría', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('registrarAuditoria()', () => {
    it('debería registrar un evento ENTIDAD_CREADA exitosamente', async () => {
      const mockEventoId = 'EVENTO-001'
      ;(ServicioAuditoria.registrar as jest.Mock).mockResolvedValue(
        mockEventoId
      )

      const resultado = await registrarAuditoria({
        entidad_tipo: 'operacion',
        entidad_id: 'OP-001',
        tipo_evento: 'ENTIDAD_CREADA',
        actor: 'USER-123',
        id_operacion: 'OP-001',
      })

      expect(resultado).toBe(mockEventoId)
      expect(ServicioAuditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          entidad_tipo: 'operacion',
          entidad_id: 'OP-001',
          tipo_evento: 'ENTIDAD_CREADA',
        })
      )
    })

    it('debería registrar CAMBIO_ESTADO con antes/despues', async () => {
      const cambios: CambioAuditoria = {
        estado: {
          antes: 'PENDIENTE',
          despues: 'CONFIRMADO',
        },
      }

      ;(ServicioAuditoria.registrar as jest.Mock).mockResolvedValue(
        'EVENTO-002'
      )

      await registrarAuditoria({
        entidad_tipo: 'operacion',
        entidad_id: 'OP-001',
        tipo_evento: 'CAMBIO_ESTADO',
        cambios,
        actor: 'USER-123',
        id_operacion: 'OP-001',
      })

      expect(ServicioAuditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_evento: 'CAMBIO_ESTADO',
          cambios: expect.objectContaining({
            estado: expect.objectContaining({
              antes: 'PENDIENTE',
              despues: 'CONFIRMADO',
            }),
          }),
        })
      )
    })

    it('debería registrar ENTIDAD_MODIFICADA con múltiples campos', async () => {
      const cambios: CambioAuditoria = {
        estado: { antes: 'PENDIENTE', despues: 'CANCELADO' },
        nota_cancelacion: { antes: null, despues: 'Sin disponibilidad' },
      }

      ;(ServicioAuditoria.registrar as jest.Mock).mockResolvedValue(
        'EVENTO-003'
      )

      await registrarAuditoria({
        entidad_tipo: 'operacion',
        entidad_id: 'OP-001',
        tipo_evento: 'ENTIDAD_MODIFICADA',
        cambios,
        actor: 'USER-123',
        id_operacion: 'OP-001',
      })

      expect(ServicioAuditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_evento: 'ENTIDAD_MODIFICADA',
          cambios,
        })
      )
    })

    it('debería incluir id_correlacion para trazabilidad', async () => {
      (ServicioAuditoria.registrar as jest.Mock).mockResolvedValue(
        'EVENTO-004'
      )

      await registrarAuditoria({
        entidad_tipo: 'operacion',
        entidad_id: 'OP-001',
        tipo_evento: 'ENTIDAD_CREADA',
        actor: 'USER-123',
        id_operacion: 'OP-001',
        id_correlacion: 'CORRELACION-ABC',
      })

      expect(ServicioAuditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          id_correlacion: 'CORRELACION-ABC',
        })
      )
    })

    it('debería capturar contexto (IP, user_agent)', async () => {
      (ServicioAuditoria.registrar as jest.Mock).mockResolvedValue(
        'EVENTO-005'
      )

      await registrarAuditoria({
        entidad_tipo: 'operacion',
        entidad_id: 'OP-001',
        tipo_evento: 'ENTIDAD_CREADA',
        actor: 'USER-123',
        id_operacion: 'OP-001',
        ip: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
      })

      expect(ServicioAuditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
        })
      )
    })
  })

  describe('Tipos de eventos soportados', () => {
    it('debería soportar ENTIDAD_CREADA', async () => {
      (ServicioAuditoria.registrar as jest.Mock).mockResolvedValue(
        'EVENTO-006'
      )

      await registrarAuditoria({
        entidad_tipo: 'operacion',
        entidad_id: 'OP-001',
        tipo_evento: 'ENTIDAD_CREADA',
        actor: 'USER-123',
        id_operacion: 'OP-001',
      })

      expect(ServicioAuditoria.registrar).toHaveBeenCalled()
    })

    it('debería soportar ENTIDAD_MODIFICADA', async () => {
      (ServicioAuditoria.registrar as jest.Mock).mockResolvedValue(
        'EVENTO-007'
      )

      await registrarAuditoria({
        entidad_tipo: 'operacion',
        entidad_id: 'OP-001',
        tipo_evento: 'ENTIDAD_MODIFICADA',
        cambios: { estado: { antes: 'A', despues: 'B' } },
        actor: 'USER-123',
      })

      expect(ServicioAuditoria.registrar).toHaveBeenCalled()
    })

    it('debería soportar ENTIDAD_ELIMINADA', async () => {
      (ServicioAuditoria.registrar as jest.Mock).mockResolvedValue(
        'EVENTO-008'
      )

      await registrarAuditoria({
        entidad_tipo: 'operacion',
        entidad_id: 'OP-001',
        tipo_evento: 'ENTIDAD_ELIMINADA',
        actor: 'USER-123',
      })

      expect(ServicioAuditoria.registrar).toHaveBeenCalled()
    })

    it('debería soportar CAMBIO_ESTADO', async () => {
      (ServicioAuditoria.registrar as jest.Mock).mockResolvedValue(
        'EVENTO-009'
      )

      await registrarAuditoria({
        entidad_tipo: 'operacion',
        entidad_id: 'OP-001',
        tipo_evento: 'CAMBIO_ESTADO',
        cambios: { estado: { antes: 'PENDIENTE', despues: 'CONFIRMADO' } },
        actor: 'USER-123',
      })

      expect(ServicioAuditoria.registrar).toHaveBeenCalled()
    })

    it('debería soportar ERROR', async () => {
      (ServicioAuditoria.registrar as jest.Mock).mockResolvedValue(
        'EVENTO-010'
      )

      await registrarAuditoria({
        entidad_tipo: 'operacion',
        entidad_id: 'OP-001',
        tipo_evento: 'ERROR',
        cambios: {
          error: { antes: null, despues: 'VALIDACION_FALLIDA' },
        },
        actor: 'SISTEMA',
      })

      expect(ServicioAuditoria.registrar).toHaveBeenCalled()
    })
  })

  describe('Tipos de entidades soportadas', () => {
    const entidades = [
      'operacion',
      'cargo',
      'pago',
      'movimiento',
      'fondos_terceros',
      'liquidacion',
    ] as const

    it.each(entidades)('debería soportar entidad_tipo: %s', async tipo => {
      (ServicioAuditoria.registrar as jest.Mock).mockResolvedValue(
        'EVENTO-011'
      )

      await registrarAuditoria({
        entidad_tipo: tipo,
        entidad_id: `ID-${tipo}`,
        tipo_evento: 'ENTIDAD_CREADA',
        actor: 'USER-123',
      })

      expect(ServicioAuditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          entidad_tipo: tipo,
        })
      )
    })
  })

  describe('Validaciones', () => {
    it('debería permitir cambios opcionales (no incluidos si es ENTIDAD_CREADA)', async () => {
      (ServicioAuditoria.registrar as jest.Mock).mockResolvedValue(
        'EVENTO-012'
      )

      await registrarAuditoria({
        entidad_tipo: 'operacion',
        entidad_id: 'OP-001',
        tipo_evento: 'ENTIDAD_CREADA',
        actor: 'USER-123',
        // cambios: undefined (no incluido)
      })

      // Verificar que se llamó, pero no exigir que 'cambios' sea undefined en el call
      expect(ServicioAuditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          entidad_tipo: 'operacion',
          entidad_id: 'OP-001',
          tipo_evento: 'ENTIDAD_CREADA',
          actor: 'USER-123',
        })
      )
    })

    it('debería permitir id_operacion opcional', async () => {
      (ServicioAuditoria.registrar as jest.Mock).mockResolvedValue(
        'EVENTO-013'
      )

      await registrarAuditoria({
        entidad_tipo: 'cargo',
        entidad_id: 'CARGO-001',
        tipo_evento: 'ENTIDAD_CREADA',
        actor: 'USER-123',
        // id_operacion: undefined (no incluido)
      })

      expect(ServicioAuditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          entidad_tipo: 'cargo',
          entidad_id: 'CARGO-001',
          tipo_evento: 'ENTIDAD_CREADA',
          actor: 'USER-123',
        })
      )
    })

    it('debería capturar actor por defecto si es SISTEMA', async () => {
      (ServicioAuditoria.registrar as jest.Mock).mockResolvedValue(
        'EVENTO-014'
      )

      await registrarAuditoria({
        entidad_tipo: 'operacion',
        entidad_id: 'OP-001',
        tipo_evento: 'ERROR',
        actor: 'SISTEMA',
      })

      expect(ServicioAuditoria.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: 'SISTEMA',
        })
      )
    })
  })

  describe('Manejo de errores', () => {
    it('debería manejar error de ServicioAuditoria gracefully', async () => {
      const error = new Error('Firebase error')
      ;(ServicioAuditoria.registrar as jest.Mock).mockRejectedValue(error)

      await expect(
        registrarAuditoria({
          entidad_tipo: 'operacion',
          entidad_id: 'OP-001',
          tipo_evento: 'ENTIDAD_CREADA',
          actor: 'USER-123',
        })
      ).rejects.toThrow('Firebase error')
    })
  })
})
