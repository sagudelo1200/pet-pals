/**
 * Tests de integración para H3TerritorialOrchestrator (FASE 2)
 *
 * Valida:
 * ✅ Atomicidad en cambios de domicilio
 * ✅ Retry logic en fire-and-forget
 * ✅ Logging de auditoría
 * ✅ Reglas de negocio para estado de zona
 */

/* eslint-env jest */

import { H3TerritorialOrchestrator } from '@/services/h3/H3TerritorialOrchestrator'
import {
  ServicioIndiceCobertura,
  type EntradaCuidadorCobertura,
} from '@/services/firebase/firestore/colecciones/indice_cobertura'
import { ServicioZonasH3 } from '@/services/firebase/firestore/colecciones/h3_zonas'

/**
 * Mocks simplificados para testing
 */
const mockCuidador: Omit<
  EntradaCuidadorCobertura,
  'uid' | 'h3_origen' | 'actualizado_en'
> = {
  nombre: 'Juan Cuidador',
  foto: 'https://example.com/juan.jpg',
  rating_promedio: 4.8,
  tarifa_por_hora: 25000,
  insignias_verificacion: ['EMAIL', 'IDENTIDAD'],
}

describe('H3TerritorialOrchestrator - FASE 2', () => {
  beforeEach(() => {
    // Limpiar logs entre tests
    H3TerritorialOrchestrator.limpiarAuditLog()
  })

  describe('Atomicidad: procesarCambioCobertura()', () => {
    it('Debe registrar operación en audit log', async () => {
      // Dado
      const uid = 'test-uid-001'
      const h3Anterior = '894cc6537ffffff'
      const h3Nuevo = '894cc6537000001'

      jest
        .spyOn(ServicioIndiceCobertura, 'migraCoberturaAtomicamente')
        .mockResolvedValueOnce(undefined)

      // Cuando
      const resultado = await H3TerritorialOrchestrator.procesarCambioCobertura(
        uid,
        h3Nuevo,
        h3Anterior,
        mockCuidador
      )

      // Entonces
      expect(resultado).toBe(true)
      const auditLog = H3TerritorialOrchestrator.obtenerAuditLog()
      expect(auditLog).toHaveLength(1)
      expect(auditLog[0].operacion).toBe('cambio_cobertura')
      expect(auditLog[0].estado).toBe('exito')
      expect(auditLog[0].uid).toBe(uid)
      expect(auditLog[0].h3_r8).toBe(h3Nuevo)
      expect(auditLog[0].h3_anterior).toBe(h3Anterior)
    })

    it('Debe llamar a migraCoberturaAtomicamente cuando viene de otro domicilio', async () => {
      // Dado
      const uid = 'test-uid-002'
      const h3Anterior = '894cc6537ffffff'
      const h3Nuevo = '894cc6537000001'

      const spyMigracion = jest
        .spyOn(ServicioIndiceCobertura, 'migraCoberturaAtomicamente')
        .mockResolvedValueOnce(undefined)

      // Cuando
      await H3TerritorialOrchestrator.procesarCambioCobertura(
        uid,
        h3Nuevo,
        h3Anterior,
        mockCuidador
      )

      // Entonces
      expect(spyMigracion).toHaveBeenCalledWith(
        uid,
        h3Nuevo,
        h3Anterior,
        mockCuidador
      )
    })

    it('Debe registrar error en audit log cuando falla', async () => {
      // Dado
      const uid = 'test-uid-003'
      const h3Anterior = '894cc6537ffffff'
      const h3Nuevo = '894cc6537000001'
      const errorEsperado = new Error('Firestore write failed')

      // Con h3Anterior definido y distinto, el flujo pasa por migraCoberturaAtomicamente
      jest
        .spyOn(ServicioIndiceCobertura, 'migraCoberturaAtomicamente')
        .mockRejectedValueOnce(errorEsperado)

      // Cuando
      const resultado = await H3TerritorialOrchestrator.procesarCambioCobertura(
        uid,
        h3Nuevo,
        h3Anterior,
        mockCuidador
      )

      // Entonces
      expect(resultado).toBe(false)
      const auditLog = H3TerritorialOrchestrator.obtenerAuditLog()
      expect(auditLog[0].estado).toBe('fallo')
      expect(auditLog[0].error).toBe('Firestore write failed')
    })
  })

  describe('Retry Logic: procesarEventoPaseo()', () => {
    it('Debe registrar evento de paseo en audit log', async () => {
      // Dado
      const h3_r9 = '894cc6537ffffff'

      jest
        .spyOn(ServicioZonasH3, 'actualizarZona')
        .mockResolvedValueOnce(undefined)

      // Cuando
      const resultado = await H3TerritorialOrchestrator.procesarEventoPaseo(
        h3_r9,
        'EN_PROGRESO',
        { duracion: 30, distancia: 5.2 }
      )

      // Entonces
      expect(resultado).toBe(true)
      const auditLog = H3TerritorialOrchestrator.obtenerAuditLog()
      expect(auditLog).toHaveLength(1)
      expect(auditLog[0].operacion).toBe('evento_paseo')
      expect(auditLog[0].detalles?.estado).toBe('EN_PROGRESO')
    })

    it('Debe reintentar si falla inicialmente y luego pasa', async () => {
      // Dado
      const h3_r9 = '894cc6537ffffff'
      let intentos = 0

      jest
        .spyOn(ServicioZonasH3, 'actualizarZona')
        .mockImplementation(async () => {
          intentos++
          if (intentos === 1) {
            throw new Error('Network timeout')
          }
          // Segunda llamada: éxito
        })

      // Cuando
      const resultado = await H3TerritorialOrchestrator.procesarEventoPaseo(
        h3_r9,
        'COMPLETADO'
      )

      // Entonces
      expect(resultado).toBe(true)
      expect(intentos).toBeGreaterThan(1)
      const auditLog = H3TerritorialOrchestrator.obtenerAuditLog()
      expect(auditLog[0].estado).toBe('exito')
    })

    it('Debe registrar fallo después de máximos reintentos', async () => {
      // Dado
      const h3_r9 = '894cc6537ffffff'
      const error = new Error('Persistently failing')

      jest.spyOn(ServicioZonasH3, 'actualizarZona').mockRejectedValue(error)

      // Cuando
      const resultado = await H3TerritorialOrchestrator.procesarEventoPaseo(
        h3_r9,
        'EN_PROGRESO'
      )

      // Entonces
      expect(resultado).toBe(false)
      const auditLog = H3TerritorialOrchestrator.obtenerAuditLog()
      expect(auditLog[0].estado).toBe('fallo')
      // Debería haber intentado 3 veces (RETRY_CONFIG.maxReintentos)
      expect(auditLog[0].intentos).toBe(3)
    })
  })

  describe('Auditoría: obtenerAuditLog()', () => {
    it('Debe retornar los últimos N registros', async () => {
      // Dado: simular 5 operaciones
      const operaciones = [
        { h3: 'zona1', estado: 'EN_PROGRESO' as const },
        { h3: 'zona2', estado: 'COMPLETADO' as const },
        { h3: 'zona3', estado: 'EN_PROGRESO' as const },
        { h3: 'zona4', estado: 'EN_PROGRESO' as const },
        { h3: 'zona5', estado: 'COMPLETADO' as const },
      ]

      jest.spyOn(ServicioZonasH3, 'actualizarZona').mockResolvedValue(undefined)

      // Cuando: ejecutar 5 paseos
      for (const op of operaciones) {
        await H3TerritorialOrchestrator.procesarEventoPaseo(op.h3, op.estado)
      }

      // Entonces: los últimos 3 registros
      const ultimosTres = H3TerritorialOrchestrator.obtenerAuditLog(3)
      expect(ultimosTres).toHaveLength(3)
      // Orden descendente (más reciente primero)
      expect(ultimosTres[0].h3_r8).toBe('zona5')
      expect(ultimosTres[1].h3_r8).toBe('zona4')
      expect(ultimosTres[2].h3_r8).toBe('zona3')
    })
  })

  describe('Estadísticas: obtenerEstadisticasAudit()', () => {
    it('Debe calcular correctamente la tasa de éxito', async () => {
      // Dado
      // El fallo debe ser PERSISTENTE: procesarEventoPaseo reintenta automáticamente,
      // así que un rechazo único se recuperaría y no quedaría registrado como fallo.
      jest
        .spyOn(ServicioZonasH3, 'actualizarZona')
        .mockResolvedValueOnce(undefined) // éxito (zona1)
        .mockRejectedValue(new Error('fail')) // fallo persistente (zona2 y zona3)

      // Cuando
      await H3TerritorialOrchestrator.procesarEventoPaseo(
        'zona1',
        'EN_PROGRESO'
      )
      await H3TerritorialOrchestrator.procesarEventoPaseo(
        'zona2',
        'EN_PROGRESO'
      )
      await H3TerritorialOrchestrator.procesarEventoPaseo(
        'zona3',
        'EN_PROGRESO'
      )

      // Entonces
      const stats = H3TerritorialOrchestrator.obtenerEstadisticasAudit()
      expect(stats.totalOperaciones).toBe(3)
      expect(stats.exitosas).toBeGreaterThan(0)
      expect(stats.fallidas).toBeGreaterThan(0)
      expect(stats.tasaExito).toBeGreaterThan(0)
      expect(stats.tasaExito).toBeLessThan(100)
      // Los reintentos usan backoff real (delayBase=1s × backoff), así que este
      // test necesita más tiempo que el timeout por defecto de 5s.
    }, 20000)
  })

  describe('Reglas de Negocio: procesarCambioEstadoZona()', () => {
    it('Debe cambiar estado a sin_cobertura cuando cuidadores_count = 0', async () => {
      // Dado: zona sin cuidadores
      const h3_r9 = '894cc6537ffffff'
      const zonaSinCuidadores = {
        h3_r9,
        operativa: {
          cuidadores_count: 0,
          demanda_total: 5,
          estado: 'disponible',
        },
      }

      jest
        .spyOn(ServicioZonasH3, 'obtenerZona')
        .mockResolvedValueOnce(zonaSinCuidadores as any)
      jest
        .spyOn(ServicioZonasH3, 'actualizarZona')
        .mockResolvedValueOnce(undefined)

      // Cuando
      const resultado =
        await H3TerritorialOrchestrator.procesarCambioEstadoZona(h3_r9)

      // Entonces
      expect(resultado).toBe(true)
      expect(ServicioZonasH3.actualizarZona).toHaveBeenCalledWith(h3_r9, {
        operativa: { estado: 'sin_cobertura' },
      })
    })

    it('Debe cambiar estado a alta_demanda cuando demanda_total > 10', async () => {
      // Dado: zona con alta demanda
      const h3_r9 = '894cc6537ffffff'
      const zonaAltaDemanda = {
        h3_r9,
        operativa: {
          cuidadores_count: 5,
          demanda_total: 15,
          estado: 'disponible',
        },
      }

      jest
        .spyOn(ServicioZonasH3, 'obtenerZona')
        .mockResolvedValueOnce(zonaAltaDemanda as any)
      jest
        .spyOn(ServicioZonasH3, 'actualizarZona')
        .mockResolvedValueOnce(undefined)

      // Cuando
      const resultado =
        await H3TerritorialOrchestrator.procesarCambioEstadoZona(h3_r9)

      // Entonces
      expect(resultado).toBe(true)
      expect(ServicioZonasH3.actualizarZona).toHaveBeenCalledWith(h3_r9, {
        operativa: { estado: 'alta_demanda' },
      })
    })

    it('No debe actualizar si estado ya es correcto', async () => {
      // Dado: zona ya en estado correcto
      const h3_r9 = '894cc6537ffffff'
      const zonaCorreca = {
        h3_r9,
        operativa: {
          cuidadores_count: 3,
          demanda_total: 5,
          estado: 'disponible',
        },
      }

      jest
        .spyOn(ServicioZonasH3, 'obtenerZona')
        .mockResolvedValueOnce(zonaCorreca as any)
      const spyActualizar = jest.spyOn(ServicioZonasH3, 'actualizarZona')

      // Cuando
      const resultado =
        await H3TerritorialOrchestrator.procesarCambioEstadoZona(h3_r9)

      // Entonces
      expect(resultado).toBe(true)
      expect(spyActualizar).not.toHaveBeenCalled() // No debe actualizar
    })
  })

  describe('Limpieza: limpiarAuditLog()', () => {
    it('Debe borrar todos los registros de auditoría', async () => {
      // Dado: 3 registros
      jest.spyOn(ServicioZonasH3, 'actualizarZona').mockResolvedValue(undefined)
      await H3TerritorialOrchestrator.procesarEventoPaseo(
        'zona1',
        'EN_PROGRESO'
      )
      await H3TerritorialOrchestrator.procesarEventoPaseo(
        'zona2',
        'EN_PROGRESO'
      )
      await H3TerritorialOrchestrator.procesarEventoPaseo(
        'zona3',
        'EN_PROGRESO'
      )

      // Cuando
      H3TerritorialOrchestrator.limpiarAuditLog()

      // Entonces
      expect(H3TerritorialOrchestrator.obtenerAuditLog()).toHaveLength(0)
      expect(
        H3TerritorialOrchestrator.obtenerEstadisticasAudit().totalOperaciones
      ).toBe(0)
    })
  })
})
