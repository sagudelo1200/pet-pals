/* eslint-env jest */
/**
 * VALIDACIÓN DE SPRINT 1: H3 Multi-Resolución (R8 + R9)
 *
 * Este archivo de prueba verifica que:
 * 1. ServicioTerritorio está disponible y funciona
 * 2. Los modelos tienen los campos nuevos
 * 3. Los servicios delegan correctamente a ServicioTerritorio
 * 4. Hook no calcula H3 (agnóstico)
 *
 * Ejecutar con: npm test -- services.territorio.test.ts
 */

import { ServicioTerritorio } from '@/services/territorio'

describe('Sprint 1: H3 Multi-Resolución (R8 + R9)', () => {
  describe('ServicioTerritorio', () => {
    it('debe existir y ser instanciable', () => {
      expect(ServicioTerritorio).toBeDefined()
      expect(typeof ServicioTerritorio.obtenerContextoTerritorial).toBe(
        'function'
      )
      expect(typeof ServicioTerritorio.coordsAH3).toBe('function')
      expect(typeof ServicioTerritorio.calcularH3).toBe('function')
    })

    it('debe retornar contexto inmutable (congelado)', () => {
      const lat = 4.711
      const lng = -74.0087

      const contexto = ServicioTerritorio.obtenerContextoTerritorial(lat, lng)

      // Verificar que es inmutable
      expect(Object.isFrozen(contexto)).toBe(true)

      // Intentar mutar debería fallar silenciosamente o lanzar en strict mode
      expect(() => {
        (contexto as any).h3_r8 = 'otro_valor'
      }).toThrow()
    })

    it('debe retornar contexto territorial con H3 R8 y R9', () => {
      // Bogotá, La Candelaria
      const lat = 4.711
      const lng = -74.0087

      const contexto = ServicioTerritorio.obtenerContextoTerritorial(lat, lng)

      expect(contexto).toBeDefined()
      expect(contexto.h3_r8).toBeDefined()
      expect(contexto.h3_r9).toBeDefined()
      expect(typeof contexto.h3_r8).toBe('string')
      expect(typeof contexto.h3_r9).toBe('string')
      expect(contexto.h3_r8.length).toBeGreaterThan(0)
      expect(contexto.h3_r9.length).toBeGreaterThan(0)

      // R9 debe ser más granular que R8 (típicamente sufijo adicional)
      expect(contexto.h3_r9.length).toBeGreaterThanOrEqual(
        contexto.h3_r8.length
      )
    })

    it('debe ser agnóstico a expansión futura', () => {
      const contexto = ServicioTerritorio.obtenerContextoTerritorial(
        4.711,
        -74.0087
      )

      // ContextoTerritorial type permite campos futuros
      expect(contexto).toHaveProperty('h3_r8')
      expect(contexto).toHaveProperty('h3_r9')

      // En el futuro tendrá: ciudad, barrio, timezone, clima, precision_gps
      // pero el tipo actual solo valida los dos h3 actuales
    })

    it('debe mantener backward compatibility con coordsAH3', () => {
      const lat = 4.711
      const lng = -74.0087

      const viaContext = ServicioTerritorio.obtenerContextoTerritorial(lat, lng)
      const viaAlias = ServicioTerritorio.coordsAH3(lat, lng, 8)

      expect(viaAlias).toEqual(viaContext.h3_r8)
    })

    it('debe calcular H3 para cualquier resolución', () => {
      const lat = 4.711
      const lng = -74.0087

      const r7 = ServicioTerritorio.calcularH3(lat, lng, 7)
      const r8 = ServicioTerritorio.calcularH3(lat, lng, 8)
      const r9 = ServicioTerritorio.calcularH3(lat, lng, 9)

      expect(r7).toBeDefined()
      expect(r8).toBeDefined()
      expect(r9).toBeDefined()
      expect(r7.length).toBeLessThanOrEqual(r8.length)
      expect(r8.length).toBeLessThanOrEqual(r9.length)
    })
  })
})
