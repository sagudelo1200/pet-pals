/* eslint-env jest */
import {
  coordsAH3,
  celdasDeCobertura,
  densificarRuta,
  RESOLUCION_H3_DEFAULT,
  RADIO_COBERTURA_DEFAULT,
} from '../h3Utils'

// Coordenadas de referencia: zona Rosa — Bogotá, Colombia
const BOGOTA_LAT = 4.666
const BOGOTA_LNG = -74.052

describe('coordsAH3', () => {
  it('devuelve un string no vacío para coordenadas válidas', () => {
    const celda = coordsAH3(BOGOTA_LAT, BOGOTA_LNG)
    expect(typeof celda).toBe('string')
    expect(celda.length).toBeGreaterThan(0)
  })

  it('produce el mismo resultado para las mismas coordenadas (determinista)', () => {
    const a = coordsAH3(BOGOTA_LAT, BOGOTA_LNG)
    const b = coordsAH3(BOGOTA_LAT, BOGOTA_LNG)
    expect(a).toBe(b)
  })

  it('produce celdas distintas para coordenadas alejadas (~10 km)', () => {
    const centro = coordsAH3(4.666, -74.052)
    const periferia = coordsAH3(4.75, -74.1)
    expect(centro).not.toBe(periferia)
  })

  it('usa resolución 8 por defecto', () => {
    const conDefault = coordsAH3(BOGOTA_LAT, BOGOTA_LNG)
    const conExplicito = coordsAH3(
      BOGOTA_LAT,
      BOGOTA_LNG,
      RESOLUCION_H3_DEFAULT
    )
    expect(conDefault).toBe(conExplicito)
  })

  it('produce celdas distintas para distintas resoluciones', () => {
    const r8 = coordsAH3(BOGOTA_LAT, BOGOTA_LNG, 8)
    const r7 = coordsAH3(BOGOTA_LAT, BOGOTA_LNG, 7)
    expect(r8).not.toBe(r7)
  })
})

describe('celdasDeCobertura', () => {
  const celdaOrigen = coordsAH3(BOGOTA_LAT, BOGOTA_LNG)

  it('devuelve 19 celdas con radio=2 (1 + 6 + 12)', () => {
    const celdas = celdasDeCobertura(celdaOrigen, 2)
    expect(celdas).toHaveLength(19)
  })

  it('devuelve 7 celdas con radio=1 (1 + 6)', () => {
    const celdas = celdasDeCobertura(celdaOrigen, 1)
    expect(celdas).toHaveLength(7)
  })

  it('devuelve 1 celda con radio=0 (solo el origen)', () => {
    const celdas = celdasDeCobertura(celdaOrigen, 0)
    expect(celdas).toHaveLength(1)
    expect(celdas[0]).toBe(celdaOrigen)
  })

  it('usa radio=2 por defecto (RADIO_COBERTURA_DEFAULT)', () => {
    const conDefault = celdasDeCobertura(celdaOrigen)
    const conExplicito = celdasDeCobertura(celdaOrigen, RADIO_COBERTURA_DEFAULT)
    expect(conDefault).toEqual(conExplicito)
  })

  it('incluye la celda origen en el resultado', () => {
    const celdas = celdasDeCobertura(celdaOrigen, 2)
    expect(celdas).toContain(celdaOrigen)
  })

  it('no contiene duplicados', () => {
    const celdas = celdasDeCobertura(celdaOrigen, 2)
    const unicos = new Set(celdas)
    expect(unicos.size).toBe(celdas.length)
  })
})

describe('densificarRuta', () => {
  it('devuelve la ruta original si tiene menos de 2 puntos', () => {
    const single = [{ latitude: 4.666, longitude: -74.052 }]
    expect(densificarRuta(single)).toEqual(single)
    expect(densificarRuta([])).toEqual([])
  })

  it('devuelve más puntos que la ruta original', () => {
    const ruta = [
      { latitude: 4.666, longitude: -74.052 },
      { latitude: 4.7, longitude: -74.08 },
    ]
    const densa = densificarRuta(ruta)
    expect(densa.length).toBeGreaterThan(ruta.length)
  })

  it('preserva el primer y último punto exactamente', () => {
    const inicio = { latitude: 4.666, longitude: -74.052 }
    const fin = { latitude: 4.7, longitude: -74.08 }
    const densa = densificarRuta([inicio, fin])
    expect(densa[0]).toEqual(inicio)
    expect(densa[densa.length - 1]).toEqual(fin)
  })

  it('produce puntos intermedios con latitud entre origen y destino', () => {
    const inicio = { latitude: 4.666, longitude: -74.052 }
    const fin = { latitude: 4.7, longitude: -74.052 }
    const densa = densificarRuta([inicio, fin])
    // Todos los intermedios deben estar dentro del rango lat
    for (const p of densa) {
      expect(p.latitude).toBeGreaterThanOrEqual(4.666)
      expect(p.latitude).toBeLessThanOrEqual(4.7)
    }
  })

  it('maneja rutas de 3+ puntos', () => {
    const ruta = [
      { latitude: 4.666, longitude: -74.052 },
      { latitude: 4.68, longitude: -74.06 },
      { latitude: 4.7, longitude: -74.08 },
    ]
    const densa = densificarRuta(ruta)
    expect(densa.length).toBeGreaterThan(ruta.length)
    expect(densa[0]).toEqual(ruta[0])
    expect(densa[densa.length - 1]).toEqual(ruta[2])
  })
})
