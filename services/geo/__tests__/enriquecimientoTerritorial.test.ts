/* eslint-env jest */
/**
 * Enriquecimiento territorial con APIs públicas (elevación, clima y dirección).
 * Sin red: `fetch` se simula, así la prueba da el mismo resultado siempre y
 * comprueba el contrato (caché, mapeo, errores), no el estado de las APIs.
 */
import {
  enriquecerContextoConAPIs,
  fetchClima,
  fetchDireccion,
  fetchElevacion,
  limpiarCacheEnriquecimiento,
} from '../enriquecimientoTerritorial'

const fetchSimulado = jest.fn()
const respuesta = (cuerpo: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => cuerpo,
})

const LAT = 4.711
const LNG = -74.0087

beforeEach(() => {
  limpiarCacheEnriquecimiento()
  fetchSimulado.mockReset()
  ;(globalThis as any).fetch = fetchSimulado
  jest.spyOn(console, 'warn').mockImplementation(() => undefined)
  jest.spyOn(console, 'info').mockImplementation(() => undefined)
})

const clima = (weathercode: number, extra: Record<string, unknown> = {}) =>
  respuesta({
    current_weather: {
      weathercode,
      temperature: 18,
      time: '2026-10-25T10:00',
    },
    ...extra,
  })

describe('fetchElevacion', () => {
  test('devuelve la elevación de la API', async () => {
    fetchSimulado.mockResolvedValue(respuesta({ results: [{ elevation: 2600 }] }))
    expect(await fetchElevacion(LAT, LNG)).toEqual({ elevacion: 2600, pendiente: 0 })
    expect(fetchSimulado.mock.calls[0][0]).toContain(`locations=${LAT},${LNG}`)
  })

  test('la segunda consulta del mismo punto sale del caché, sin llamar a la API', async () => {
    fetchSimulado.mockResolvedValue(respuesta({ results: [{ elevation: 2600 }] }))
    await fetchElevacion(LAT, LNG)
    await fetchElevacion(LAT, LNG)
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  test('puntos distintos no comparten caché', async () => {
    fetchSimulado.mockResolvedValue(respuesta({ results: [{ elevation: 1 }] }))
    await fetchElevacion(LAT, LNG)
    await fetchElevacion(LAT + 1, LNG)
    expect(fetchSimulado).toHaveBeenCalledTimes(2)
  })

  test('sin resultados, error de la API o caída de red: null (nunca lanza)', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta({ results: [] }))
    expect(await fetchElevacion(LAT, LNG)).toBeNull()
    fetchSimulado.mockResolvedValueOnce(respuesta({}, false, 500))
    expect(await fetchElevacion(LAT + 2, LNG)).toBeNull()
    fetchSimulado.mockRejectedValueOnce(new Error('sin red'))
    expect(await fetchElevacion(LAT + 3, LNG)).toBeNull()
  })

  test('un fallo no se guarda en el caché: el siguiente intento vuelve a llamar', async () => {
    fetchSimulado.mockRejectedValueOnce(new Error('sin red'))
    await fetchElevacion(LAT, LNG)
    fetchSimulado.mockResolvedValueOnce(respuesta({ results: [{ elevation: 5 }] }))
    expect(await fetchElevacion(LAT, LNG)).toEqual({ elevacion: 5, pendiente: 0 })
  })
})

describe('fetchClima', () => {
  test.each([
    [0, 'soleado'],
    [1, 'soleado'],
    [2, 'mixto'],
    [3, 'nublado'],
    [45, 'nublado'],
    [61, 'llovizna'],
    [73, 'nieve'],
    [81, 'lluvia'],
    [95, 'lluvia'],
    [10, 'desconocido'],
  ])('el código WMO %i se muestra como "%s"', async (codigo, esperado) => {
    fetchSimulado.mockResolvedValue(clima(codigo))
    const r = await fetchClima(LAT, LNG)
    expect(r?.clima_actual).toBe(esperado)
    expect(r?.temperatura_c).toBe(18)
  })

  test('con lluvia medida (≥ 1 mm) se fuerza "lluvia" aunque el código diga otra cosa', async () => {
    fetchSimulado.mockResolvedValue(
      clima(1, { hourly: { time: ['2026-10-25T10:00'], precipitation: [2.5] } })
    )
    expect(await fetchClima(LAT, LNG)).toMatchObject({
      clima_actual: 'lluvia',
      precipitacion_mm: 2.5,
    })
  })

  test('con una llovizna leve (< 1 mm) no se fuerza "lluvia"', async () => {
    fetchSimulado.mockResolvedValue(
      clima(1, { hourly: { time: ['2026-10-25T10:00'], precipitation: [0.3] } })
    )
    expect(await fetchClima(LAT, LNG)).toMatchObject({
      clima_actual: 'soleado',
      precipitacion_mm: 0.3,
    })
  })

  test('se cachea por punto', async () => {
    fetchSimulado.mockResolvedValue(clima(0))
    await fetchClima(LAT, LNG)
    await fetchClima(LAT, LNG)
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  test('sin datos actuales, error de la API o caída de red: null', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta({}))
    expect(await fetchClima(LAT, LNG)).toBeNull()
    fetchSimulado.mockResolvedValueOnce(respuesta({}, false, 429))
    expect(await fetchClima(LAT + 2, LNG)).toBeNull()
    fetchSimulado.mockRejectedValueOnce(new Error('sin red'))
    expect(await fetchClima(LAT + 3, LNG)).toBeNull()
  })
})

describe('fetchDireccion', () => {
  test('toma la calle y el barrio de la respuesta', async () => {
    fetchSimulado.mockResolvedValue(
      respuesta({ address: { road: 'Carrera 5', neighbourhood: 'La Candelaria' } })
    )
    expect(await fetchDireccion(LAT, LNG)).toEqual({
      nombre_ubicacion: 'Carrera 5',
      nombre_barrio: 'La Candelaria',
    })
  })

  test('usa alternativas cuando faltan campos y "Desconocido" si no hay nada', async () => {
    fetchSimulado.mockResolvedValueOnce(
      respuesta({ address: { pedestrian: 'Peatonal 3', suburb: 'Chapinero' } })
    )
    expect(await fetchDireccion(LAT, LNG)).toEqual({
      nombre_ubicacion: 'Peatonal 3',
      nombre_barrio: 'Chapinero',
    })
    fetchSimulado.mockResolvedValueOnce(respuesta({}))
    expect(await fetchDireccion(LAT + 1, LNG)).toEqual({
      nombre_ubicacion: 'Desconocido',
      nombre_barrio: 'Desconocido',
    })
  })

  test('se identifica con un User-Agent y pide español', async () => {
    fetchSimulado.mockResolvedValue(respuesta({ address: { road: 'x', suburb: 'y' } }))
    await fetchDireccion(LAT, LNG)
    expect(fetchSimulado.mock.calls[0][1].headers).toMatchObject({
      'Accept-Language': 'es',
      'User-Agent': expect.stringContaining('Paw-Path'),
    })
  })

  test('se cachea; un error devuelve null', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta({ address: { road: 'x', suburb: 'y' } }))
    await fetchDireccion(LAT, LNG)
    await fetchDireccion(LAT, LNG)
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
    fetchSimulado.mockResolvedValueOnce(respuesta({}, false, 503))
    expect(await fetchDireccion(LAT + 2, LNG)).toBeNull()
  })
})

describe('enriquecerContextoConAPIs', () => {
  const todoBien = () =>
    fetchSimulado.mockImplementation(async (url: string) => {
      if (url.includes('open-elevation')) return respuesta({ results: [{ elevation: 2600 }] })
      if (url.includes('open-meteo')) return clima(0)
      return respuesta({ address: { road: 'Carrera 5', neighbourhood: 'Centro' } })
    })

  test('junta elevación, clima y dirección', async () => {
    todoBien()
    expect(await enriquecerContextoConAPIs(LAT, LNG)).toEqual({
      elevacion_metros: 2600,
      pendiente_grados: 0,
      clima_actual: 'soleado',
      temperatura_c: 18,
      precipitacion_mm: 0,
      nombre_ubicacion: 'Carrera 5',
      nombre_barrio: 'Centro',
    })
  })

  test('si una API falla, el resto se entrega igual', async () => {
    fetchSimulado.mockImplementation(async (url: string) => {
      if (url.includes('open-meteo')) throw new Error('sin red')
      if (url.includes('open-elevation')) return respuesta({ results: [{ elevation: 10 }] })
      return respuesta({ address: { road: 'x', suburb: 'y' } })
    })
    const r = await enriquecerContextoConAPIs(LAT, LNG)
    expect(r).toMatchObject({ elevacion_metros: 10, nombre_ubicacion: 'x' })
    expect(r).not.toHaveProperty('clima_actual')
  })

  test('si una API tarda más del límite, se entrega lo demás sin esperarla', async () => {
    jest.useFakeTimers()
    try {
      fetchSimulado.mockImplementation((url: string) => {
        if (url.includes('open-elevation')) return new Promise(() => undefined)
        if (url.includes('open-meteo')) return Promise.resolve(clima(0))
        return Promise.resolve(respuesta({ address: { road: 'x', suburb: 'y' } }))
      })
      const pendiente = enriquecerContextoConAPIs(LAT, LNG, 1000)
      await jest.advanceTimersByTimeAsync(1000)
      const r = await pendiente
      expect(r).toMatchObject({ clima_actual: 'soleado', nombre_ubicacion: 'x' })
      expect(r).not.toHaveProperty('elevacion_metros')
    } finally {
      jest.useRealTimers()
    }
  })

  test('si todas fallan, devuelve vacío sin lanzar', async () => {
    fetchSimulado.mockRejectedValue(new Error('sin red'))
    expect(await enriquecerContextoConAPIs(LAT, LNG)).toEqual({})
  })

  test('la segunda llamada con el mismo punto usa el caché de las tres', async () => {
    todoBien()
    const primera = await enriquecerContextoConAPIs(LAT, LNG)
    const llamadas = fetchSimulado.mock.calls.length
    expect(await enriquecerContextoConAPIs(LAT, LNG)).toEqual(primera)
    expect(fetchSimulado.mock.calls.length).toBe(llamadas)
  })
})
