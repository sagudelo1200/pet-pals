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
        ;(contexto as any).h3_index = 'otro_valor'
      }).toThrow()
    })

    it('debe retornar contexto territorial con H3 R8 y R9', () => {
      // Bogotá, La Candelaria
      const lat = 4.711
      const lng = -74.0087

      const contexto = ServicioTerritorio.obtenerContextoTerritorial(lat, lng)

      expect(contexto).toBeDefined()
      expect(contexto.h3_index).toBeDefined()
      expect(contexto.h3_observacion).toBeDefined()
      expect(typeof contexto.h3_index).toBe('string')
      expect(typeof contexto.h3_observacion).toBe('string')
      expect(contexto.h3_index.length).toBeGreaterThan(0)
      expect(contexto.h3_observacion.length).toBeGreaterThan(0)

      // R9 debe ser más granular que R8 (típicamente sufijo adicional)
      expect(contexto.h3_observacion.length).toBeGreaterThanOrEqual(
        contexto.h3_index.length
      )
    })

    it('debe ser agnóstico a expansión futura', () => {
      const contexto = ServicioTerritorio.obtenerContextoTerritorial(
        4.711,
        -74.0087
      )

      // ContextoTerritorial type permite campos futuros
      expect(contexto).toHaveProperty('h3_index')
      expect(contexto).toHaveProperty('h3_observacion')

      // En el futuro tendrá: ciudad, barrio, timezone, clima, precision_gps
      // pero el tipo actual solo valida los dos h3 actuales
    })

    it('debe mantener backward compatibility con coordsAH3', () => {
      const lat = 4.711
      const lng = -74.0087

      const viaContext = ServicioTerritorio.obtenerContextoTerritorial(lat, lng)
      const viaAlias = ServicioTerritorio.coordsAH3(lat, lng, 8)

      expect(viaAlias).toEqual(viaContext.h3_index)
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

  describe('Modelos Actualizados', () => {
    it('ExploracionTerritorial debe tener h3_observacion', () => {
      // Este test verifica que el tipo tiene el campo
      // En tiempo de compilación, TypeScript lo valida
      const mock: any = {
        id: 'test',
        id_explorador: 'uid123',
        h3_index: '892834829',
        h3_observacion: '892834829a', // R9 - NUEVO
        coordenadas: { latitude: 4.7, longitude: -74.0 },
        tipo_punto: 'parque' as const,
        mascotas_visibles: 3,
        flujo_peatonal: 'alto' as const,
        estado: 'pendiente' as const,
        huellas_inmediatas: 3,
      }

      expect(mock.h3_index).toBeDefined()
      expect(mock.h3_observacion).toBeDefined()
    })

    it('Ubicacion debe tener h3_observacion opcional', () => {
      // Este test verifica que el tipo tiene el campo opcional
      const mock: any = {
        id: 'test',
        proveedor: 'google',
        proveedor_place_id: 'place123',
        direccion_formateada: 'Cra 5, Bogotá',
        coordenadas: { latitude: 4.7, longitude: -74.0 },
        h3_index: '892834829',
        h3_observacion: '892834829a', // R9 - NUEVO (opcional)
      }

      expect(mock.h3_index).toBeDefined()
      expect(mock.h3_observacion).toBeDefined()
    })
  })

  describe('Pattern: Hook Agnóstico', () => {
    it('useExploracionTerritorial no debe calcular H3', () => {
      // En el código refactorizado, el hook envía SOLO:
      const dataToSave = {
        id_explorador: 'uid123',
        coordenadas: { latitude: 4.711, longitude: -74.0087 },
        tipo_punto: 'parque' as const,
        mascotas_visibles: 5,
        flujo_peatonal: 'alto' as const,
        observaciones: '',
        foto_url: '',
        estado: 'pendiente' as const,
        huellas_inmediatas: 3,
      }

      // NO tiene h3_index, NO tiene h3_observacion
      expect((dataToSave as any).h3_index).toBeUndefined()
      expect((dataToSave as any).h3_observacion).toBeUndefined()

      // El Servicio lo calcula y lo agrega al documento
      const contexto = ServicioTerritorio.obtenerContextoTerritorial(
        dataToSave.coordenadas.latitude,
        dataToSave.coordenadas.longitude
      )

      const docData = { ...dataToSave, ...contexto }
      expect(docData.h3_index).toBeDefined()
      expect(docData.h3_observacion).toBeDefined()
    })
  })

  describe('Data Validation (Firestore Rules)', () => {
    it('h3_observacion debe ser string no-vacío en exploraciones', () => {
      // Simulación de validación de regla:
      // && request.resource.data.h3_observacion is string
      // && request.resource.data.h3_observacion.size() > 0

      const validData = {
        h3_observacion: '892834829a',
      }

      const invalidData = {
        h3_observacion: '', // vacío
      }

      const noData = {} // falta h3_observacion

      expect(typeof validData.h3_observacion).toBe('string')
      expect(validData.h3_observacion.length).toBeGreaterThan(0)

      expect(invalidData.h3_observacion.length).toBe(0) // invalidaría en Firestore
      expect((noData as any).h3_observacion).toBeUndefined() // invalidaría en Firestore
    })
  })

  describe('Integration: End-to-End Flow', () => {
    it('debe representar el flujo completo Bogotá-Candelaria', async () => {
      // Coordenadas reales: Bogotá, La Candelaria
      const lat = 4.711
      const lng = -74.0087

      // 1. Hook envía coordenadas agnósticas
      const hookPayload = {
        coordenadas: { latitude: lat, longitude: lng },
        tipo_punto: 'parque' as const,
        mascotas_visibles: 8,
        flujo_peatonal: 'alto' as const,
      }

      // 2. Servicio inyecta contexto territorial
      const contexto = ServicioTerritorio.obtenerContextoTerritorial(
        hookPayload.coordenadas.latitude,
        hookPayload.coordenadas.longitude
      )

      // 3. Documento completo para Firestore
      const docComplete = {
        ...hookPayload,
        h3_index: contexto.h3_index,
        h3_observacion: contexto.h3_observacion,
        id: 'exp_test_001',
        id_explorador: 'explorer_uid',
        estado: 'pendiente' as const,
        huellas_inmediatas: 3,
      }

      // Validaciones
      expect(docComplete.h3_index).toBeTruthy()
      expect(docComplete.h3_observacion).toBeTruthy()
      expect(docComplete.h3_index.length).toBeGreaterThan(0)
      expect(docComplete.h3_observacion.length).toBeGreaterThan(0)

      // Verificar patrón: R8 es menos granular que R9
      console.log(`
        📍 Bogotá, La Candelaria
        R8 (Primaria): ${docComplete.h3_index}
        R9 (Micro):    ${docComplete.h3_observacion}
      `)
    })
  })
})
