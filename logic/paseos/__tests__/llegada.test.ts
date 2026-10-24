/* eslint-env jest */
import {
  EMOJI_DE_LLEGADA,
  OPCIONES_DE_LLEGADA,
  agruparRespuestas,
  claveDeLlegada,
  respuestasCompletas,
} from '../llegada'
import { LLEGADAS } from '@/functions/src/compartido/expediente'

describe('opciones de llegada', () => {
  test('son las del catálogo y cada una tiene emoji', () => {
    expect([...OPCIONES_DE_LLEGADA]).toEqual([...LLEGADAS])
    for (const llegada of OPCIONES_DE_LLEGADA) {
      expect(EMOJI_DE_LLEGADA[llegada]).toBeTruthy()
    }
  })

  test('la clave del texto sigue la ruta de i18n', () => {
    expect(claveDeLlegada('con_molestia')).toBe(
      'paseos:llegada.opciones.con_molestia'
    )
  })
})

describe('agruparRespuestas', () => {
  const ids = ['m1', 'm2', 'm3']

  test('la misma respuesta para todas es una sola llamada "para todas"', () => {
    expect(
      agruparRespuestas(
        { m1: 'tranquilo', m2: 'tranquilo', m3: 'tranquilo' },
        ids
      )
    ).toEqual([{ llegada: 'tranquilo' }])
  })

  test('respuestas distintas: una llamada por respuesta con sus mascotas', () => {
    expect(
      agruparRespuestas(
        { m1: 'tranquilo', m2: 'con_molestia', m3: 'tranquilo' },
        ids
      )
    ).toEqual([
      { llegada: 'tranquilo', mascotaIds: ['m1', 'm3'] },
      { llegada: 'con_molestia', mascotaIds: ['m2'] },
    ])
  })

  test('una sola mascota respondida de varias se envía con su id', () => {
    expect(agruparRespuestas({ m2: 'agitado' }, ids)).toEqual([
      { llegada: 'agitado', mascotaIds: ['m2'] },
    ])
  })

  test('una mascota con una respuesta es "para todas"', () => {
    expect(agruparRespuestas({ m1: 'cansado_bien' }, ['m1'])).toEqual([
      { llegada: 'cansado_bien' },
    ])
  })

  test('sin respuestas no hay llamadas', () => {
    expect(agruparRespuestas({}, ids)).toEqual([])
  })

  test('ignora respuestas de mascotas que no son del paseo', () => {
    expect(agruparRespuestas({ ajena: 'agitado' }, ids)).toEqual([])
  })
})

describe('respuestasCompletas', () => {
  test('exige una respuesta por cada mascota', () => {
    expect(respuestasCompletas({ m1: 'tranquilo' }, ['m1', 'm2'])).toBe(false)
    expect(
      respuestasCompletas({ m1: 'tranquilo', m2: 'agitado' }, ['m1', 'm2'])
    ).toBe(true)
  })

  test('sin mascotas nunca está completa', () => {
    expect(respuestasCompletas({}, [])).toBe(false)
  })
})
