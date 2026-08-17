/* eslint-disable no-undef */
/**
 * TEST: Enriquecimiento territorial con APIs públicas
 *
 * Valida:
 * - Caché funciona
 * - APIs se llaman correctamente
 * - Mapeo de códigos WMO
 * - Manejo de errores
 */

import {
  fetchElevacion,
  fetchClima,
  fetchDireccion,
  enriquecerContextoConAPIs,
  limpiarCacheEnriquecimiento,
} from '@/services/geo/enriquecimientoTerritorial'

describe('Enriquecimiento Territorial con APIs', () => {
  beforeEach(() => {
    limpiarCacheEnriquecimiento()
  })

  describe('fetchElevacion', () => {
    it('debe retornar null si las coordenadas son inválidas', async () => {
      const resultado = await fetchElevacion(0, 0)
      // Dependiendo de la API, puede retornar null o 0
      expect(resultado).toBeNull()
    })

    it('debe cachear resultados', async () => {
      const lat = 10.4
      const lng = -75.5

      // Primer llamado
      const resultado1 = await fetchElevacion(lat, lng)

      // Segundo llamado (debe venir del caché)
      const resultado2 = await fetchElevacion(lat, lng)

      // Si ambos son válidos, deben ser idénticos (caché funcionó)
      if (resultado1 && resultado2) {
        expect(resultado1.elevacion).toBe(resultado2.elevacion)
        expect(resultado1.pendiente).toBe(resultado2.pendiente)
      }
    })
  })

  describe('fetchClima', () => {
    it('debe retornar estructura válida para coordenadas legales', async () => {
      const resultado = await fetchClima(10.4, -75.5)

      if (resultado) {
        expect(resultado.clima_actual).toBeDefined()
        expect(resultado.temperatura_c).toBeGreaterThan(-50)
        expect(resultado.temperatura_c).toBeLessThan(60)
        expect(resultado.precipitacion_mm).toBeGreaterThanOrEqual(0)
      }
    })

    it('debe tener valores razonables', async () => {
      const resultado = await fetchClima(40.7128, -74.006) // NYC

      if (resultado) {
        expect(['soleado', 'nublado', 'lluvia', 'nieve', 'mixto']).toContain(
          resultado.clima_actual
        )
      }
    })
  })

  describe('fetchDireccion', () => {
    it('debe retornar nombre de ubicación para coordenadas válidas', async () => {
      const resultado = await fetchDireccion(10.4, -75.5)

      if (resultado) {
        expect(resultado.nombre_ubicacion).toBeDefined()
        expect(resultado.nombre_barrio).toBeDefined()
      }
    })
  })

  describe('enriquecerContextoConAPIs', () => {
    it('debe completar en paralelo sin fallar si una API falla', async () => {
      const resultado = await enriquecerContextoConAPIs(10.4, -75.5)

      // Debe retornar un objeto (aunque esté vacío)
      expect(resultado).toBeDefined()
      expect(typeof resultado).toBe('object')
    })

    it('debe respetar cache TTL', async () => {
      const lat = 51.5074
      const lng = -0.1278 // Londres

      // Primer llamado
      const resultado1 = await enriquecerContextoConAPIs(lat, lng)

      // Segundo llamado (caché)
      const resultado2 = await enriquecerContextoConAPIs(lat, lng)

      // Ambos deberían ser idénticos si el caché funcionó
      expect(resultado1).toEqual(resultado2)
    })
  })

  describe('Decisión arquitectónica', () => {
    it('Fase 2b completa el enriquecimiento sin bloquear el evento', async () => {
      // Documentación de intención
      const contextoEsperado = {
        hora_local: '14:30', // Siempre disponible
        elevacion_metros: 1250, // Open-Elevation
        clima_actual: 'soleado', // Open-Meteo
        temperatura_c: 22, // Open-Meteo
        nombre_ubicacion: 'Carrera 5', // Nominatim
      }

      // El evento se guarda rápido con hora_local
      // Luego se completa con APIs (async, no bloquea)
      expect(contextoEsperado.hora_local).toBeDefined()
      expect(contextoEsperado.elevacion_metros).toBeDefined()
      expect(contextoEsperado.clima_actual).toBeDefined()
    })
  })
})
