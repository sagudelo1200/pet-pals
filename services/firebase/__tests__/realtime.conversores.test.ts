/* eslint-env jest */

import {
  convertirUbicacionRealtime,
  convertirRutaRealtime,
} from '@/services/firebase/comun/realtimeConversores'

describe('convertidores realtime', () => {
  test('convertirUbicacionRealtime: null/undefined -> null', () => {
    expect(convertirUbicacionRealtime(null)).toBeNull()
    expect(convertirUbicacionRealtime(undefined)).toBeNull()
  })

  test('acepta keys latitud/longitud como numbers', () => {
    expect(convertirUbicacionRealtime({ latitud: 10, longitud: 20 })).toEqual({
      latitude: 10,
      longitude: 20,
    })
  })

  test('acepta keys latitude/longitude como strings o numbers', () => {
    expect(
      convertirUbicacionRealtime({ latitude: '1.5', longitude: '-2.5' })
    ).toEqual({ latitude: 1.5, longitude: -2.5 })
  })

  test('acepta keys lat/lng', () => {
    expect(convertirUbicacionRealtime({ lat: 3, lng: 4 })).toEqual({
      latitude: 3,
      longitude: 4,
    })
  })

  test('valores invalidos -> null', () => {
    expect(
      convertirUbicacionRealtime({ latitud: 'abc', longitud: null })
    ).toBeNull()
    expect(convertirUbicacionRealtime({})).toBeNull()
  })

  test('convertirRutaRealtime: null -> []', () => {
    expect(convertirRutaRealtime(null)).toEqual([])
  })

  test('convertirRutaRealtime: convierte y filtra invalidos', () => {
    const rutaObj = {
      a: { latitud: 1, longitud: 1 },
      b: { latitude: 2, longitude: 2 },
      c: { lat: 'x', lng: 'y' },
    }

    const res = convertirRutaRealtime(rutaObj as any)
    expect(res).toHaveLength(2)
    expect(res).toEqual(
      expect.arrayContaining([
        { latitude: 1, longitude: 1 },
        { latitude: 2, longitude: 2 },
      ])
    )
  })
})
