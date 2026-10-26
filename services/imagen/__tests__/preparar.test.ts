jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}))

import { manipulateAsync } from 'expo-image-manipulator'
import { prepararImagen, reduccionNecesaria } from '../preparar'

const manipular = manipulateAsync as jest.Mock

beforeEach(() => {
  jest.resetAllMocks()
  manipular.mockResolvedValue({ uri: 'file:///x.jpg', base64: 'QUJD' })
})

const LIMITES = { ladoMaximo: 1600, calidad: 0.7 }

describe('reduccionNecesaria', () => {
  test('reduce el lado más largo y conserva la proporción', () => {
    expect(reduccionNecesaria(4000, 3000, 1600)).toEqual({ width: 1600 })
    expect(reduccionNecesaria(3000, 4000, 1600)).toEqual({ height: 1600 })
    expect(reduccionNecesaria(4000, 4000, 1600)).toEqual({ width: 1600 })
  })

  test('nunca agranda y no toca lo que ya es pequeño o desconocido', () => {
    expect(reduccionNecesaria(1600, 1200, 1600)).toBeNull()
    expect(reduccionNecesaria(800, 600, 1600)).toBeNull()
    expect(reduccionNecesaria(undefined, undefined, 1600)).toBeNull()
    expect(reduccionNecesaria(0, 0, 1600)).toBeNull()
  })
})

describe('prepararImagen', () => {
  test('una foto grande se reduce y se recomprime en JPEG', async () => {
    const r = await prepararImagen('file:///foto.jpg', {
      ...LIMITES,
      dimensiones: { ancho: 4000, alto: 3000 },
    })
    expect(r).toEqual({ base64: 'QUJD', contentType: 'image/jpeg' })
    expect(manipular).toHaveBeenCalledWith(
      'file:///foto.jpg',
      [{ resize: { width: 1600 } }],
      { compress: 0.7, format: 'jpeg', base64: true }
    )
  })

  test('una foto pequeña, o sin medidas, solo se recomprime', async () => {
    await prepararImagen('file:///foto.jpg', {
      ...LIMITES,
      dimensiones: { ancho: 800, alto: 600 },
    })
    await prepararImagen('file:///foto.jpg', LIMITES)
    expect(manipular.mock.calls[0][1]).toEqual([])
    expect(manipular.mock.calls[1][1]).toEqual([])
  })

  test('usa los límites que se le pasen, no unos fijos', async () => {
    await prepararImagen('file:///foto.jpg', {
      ladoMaximo: 800,
      calidad: 0.5,
      dimensiones: { ancho: 4000, alto: 3000 },
    })
    expect(manipular).toHaveBeenCalledWith(
      'file:///foto.jpg',
      [{ resize: { width: 800 } }],
      { compress: 0.5, format: 'jpeg', base64: true }
    )
  })

  test('si no se pudo leer, falla', async () => {
    manipular.mockResolvedValue({ uri: 'file:///x.jpg' })
    await expect(prepararImagen('file:///foto.jpg', LIMITES)).rejects.toThrow()
  })
})
