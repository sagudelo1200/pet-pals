/* eslint-env jest */
import {
  coordsAH3,
  celdasDeCobertura,
  distanciaKmEntreH3,
  haversineMetros,
  densificarRuta,
  calcularEstadoZona,
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

describe('haversineMetros', () => {
  it('devuelve 0 para el mismo punto', () => {
    const punto = { latitude: BOGOTA_LAT, longitude: BOGOTA_LNG }
    expect(haversineMetros(punto, punto)).toBeCloseTo(0, 1)
  })

  it('calcula ~111 km por grado de latitud en el ecuador', () => {
    const a = { latitude: 0, longitude: 0 }
    const b = { latitude: 1, longitude: 0 }
    const metros = haversineMetros(a, b)
    // Un grado de latitud ≈ 111,000 m
    expect(metros).toBeGreaterThan(110_000)
    expect(metros).toBeLessThan(112_000)
  })

  it('es simétrica: d(A,B) = d(B,A)', () => {
    const a = { latitude: 4.666, longitude: -74.052 }
    const b = { latitude: 4.75, longitude: -74.1 }
    expect(haversineMetros(a, b)).toBeCloseTo(haversineMetros(b, a), 3)
  })

  it('devuelve metros (no kilómetros) para puntos cercanos', () => {
    // ~460 m entre dos puntos separados ~0.004 grados lat
    const a = { latitude: 4.666, longitude: -74.052 }
    const b = { latitude: 4.67, longitude: -74.052 }
    const metros = haversineMetros(a, b)
    expect(metros).toBeGreaterThan(100)
    expect(metros).toBeLessThan(1000)
  })
})

describe('distanciaKmEntreH3', () => {
  it('devuelve 0 para la misma celda', () => {
    const celda = coordsAH3(BOGOTA_LAT, BOGOTA_LNG)
    expect(distanciaKmEntreH3(celda, celda)).toBeCloseTo(0, 5)
  })

  it('devuelve valor en kilómetros (< 10) para celdas vecinas', () => {
    const a = coordsAH3(4.666, -74.052)
    const b = coordsAH3(4.7, -74.08)
    const km = distanciaKmEntreH3(a, b)
    expect(km).toBeGreaterThan(0)
    expect(km).toBeLessThan(10)
  })

  it('es simétrica', () => {
    const a = coordsAH3(4.666, -74.052)
    const b = coordsAH3(4.75, -74.1)
    expect(distanciaKmEntreH3(a, b)).toBeCloseTo(distanciaKmEntreH3(b, a), 5)
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

describe('calcularEstadoZona', () => {
  it('sin_actividad cuando no hay cuidadores ni demanda', () => {
    expect(
      calcularEstadoZona({
        cuidadores_count: 0,
        demanda_total: 0,
        paseos_activos: 0,
      })
    ).toBe('sin_actividad')
  })

  it('disponible cuando hay cuidadores pero sin demanda', () => {
    expect(
      calcularEstadoZona({
        cuidadores_count: 3,
        demanda_total: 0,
        paseos_activos: 0,
      })
    ).toBe('disponible')
  })

  it('sin_cobertura cuando hay demanda pero ningún cuidador', () => {
    expect(
      calcularEstadoZona({
        cuidadores_count: 0,
        demanda_total: 5,
        paseos_activos: 0,
      })
    ).toBe('sin_cobertura')
  })

  it('activa cuando hay cuidadores y demanda, sin paseos en curso', () => {
    expect(
      calcularEstadoZona({
        cuidadores_count: 2,
        demanda_total: 3,
        paseos_activos: 0,
      })
    ).toBe('activa')
  })

  it('en_operacion cuando hay al menos un paseo activo', () => {
    expect(
      calcularEstadoZona({
        cuidadores_count: 1,
        demanda_total: 1,
        paseos_activos: 1,
      })
    ).toBe('en_operacion')
  })

  it('en_operacion tiene prioridad máxima sobre otros estados', () => {
    // paseos_activos > 0 → siempre en_operacion aunque no haya demanda
    expect(
      calcularEstadoZona({
        cuidadores_count: 0,
        demanda_total: 0,
        paseos_activos: 2,
      })
    ).toBe('en_operacion')
  })
})
