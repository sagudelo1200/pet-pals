import { bytesDeBase64, cabeEnLimite } from '../tamano'

describe('bytesDeBase64', () => {
  test('calcula el tamaño original, con y sin relleno', () => {
    expect(bytesDeBase64('QUJD')).toBe(3) // ABC
    expect(bytesDeBase64('QUI=')).toBe(2) // AB
    expect(bytesDeBase64('QQ==')).toBe(1) // A
    expect(bytesDeBase64('')).toBe(0)
  })

  test('ignora el prefijo data:', () => {
    expect(bytesDeBase64('data:image/jpeg;base64,QUJD')).toBe(3)
  })
})

describe('cabeEnLimite', () => {
  const MB = 1024 * 1024

  test('hasta el límite sí; un byte más o vacío, no', () => {
    expect(cabeEnLimite(1, 5)).toBe(true)
    expect(cabeEnLimite(5 * MB, 5)).toBe(true)
    expect(cabeEnLimite(5 * MB + 1, 5)).toBe(false)
    expect(cabeEnLimite(0, 5)).toBe(false)
  })

  test('respeta el límite que se le pase', () => {
    expect(cabeEnLimite(2 * MB, 1)).toBe(false)
    expect(cabeEnLimite(2 * MB, 2)).toBe(true)
  })
})
