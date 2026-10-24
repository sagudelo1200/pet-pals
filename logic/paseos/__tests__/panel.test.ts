/* eslint-env jest */
import { esPrimerPaseo, minutosRestantes, urlParaVolver } from '../panel'

describe('urlParaVolver', () => {
  test('abre la ruta a pie hacia la dirección de entrega', () => {
    expect(urlParaVolver({ latitude: 4.65, longitude: -74.06 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=4.65,-74.06&travelmode=walking'
    )
  })

  test('respeta coordenadas negativas y decimales', () => {
    const url = urlParaVolver({ latitude: -34.6037, longitude: -58.3816 })
    expect(url).toContain('destination=-34.6037,-58.3816')
    expect(url.startsWith('https://')).toBe(true)
  })
})

describe('minutosRestantes', () => {
  test('resta lo transcurrido del tiempo estimado, redondeando hacia arriba', () => {
    expect(minutosRestantes(60, '00:00:00')).toBe(60)
    expect(minutosRestantes(60, '00:25:00')).toBe(35)
    expect(minutosRestantes(60, '00:25:30')).toBe(35)
    expect(minutosRestantes(60, '00:59:59')).toBe(1)
  })

  test('es negativo cuando ya se pasó el tiempo', () => {
    expect(minutosRestantes(30, '00:40:00')).toBe(-10)
  })

  test('sin estimado o con tiempo inválido no calcula', () => {
    expect(minutosRestantes(undefined, '00:10:00')).toBeUndefined()
    expect(minutosRestantes(0, '00:10:00')).toBeUndefined()
    expect(minutosRestantes(60, 'abc')).toBeUndefined()
  })

  test('cuenta horas', () => {
    expect(minutosRestantes(120, '01:10:00')).toBe(50)
  })
})

describe('esPrimerPaseo', () => {
  test('sin expediente o sin vínculo es la primera vez', () => {
    expect(esPrimerPaseo(undefined, 'c1')).toBe(true)
    expect(esPrimerPaseo({ vinculos: {} }, 'c1')).toBe(true)
    expect(
      esPrimerPaseo({ vinculos: { c1: { paseos: 0, ultimo_en: 0 } } }, 'c1')
    ).toBe(true)
  })

  test('con paseos previos con esa mascota ya no lo es', () => {
    expect(
      esPrimerPaseo({ vinculos: { c1: { paseos: 3, ultimo_en: 1 } } }, 'c1')
    ).toBe(false)
  })

  test('el vínculo es por cuidador', () => {
    const expediente = { vinculos: { c2: { paseos: 5, ultimo_en: 1 } } }
    expect(esPrimerPaseo(expediente, 'c1')).toBe(true)
    expect(esPrimerPaseo(expediente, 'c2')).toBe(false)
  })
})
