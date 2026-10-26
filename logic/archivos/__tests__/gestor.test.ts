jest.mock('@/services/imagen/preparar', () => ({ prepararImagen: jest.fn() }))
jest.mock('@/services/firebase/storage/archivos', () => ({
  ServicioArchivos: {
    subirBase64: jest.fn(),
    borrar: jest.fn(),
    obtenerUrl: jest.fn(),
  },
}))

import { prepararImagen } from '@/services/imagen/preparar'
import { ServicioArchivos } from '@/services/firebase/storage/archivos'
import { PERFILES_ARCHIVO } from '@/functions/src/compartido/archivos'
import { ERRORES_ARCHIVO, GestorArchivos } from '../gestor'

const preparar = prepararImagen as jest.Mock
const subirBase64 = ServicioArchivos.subirBase64 as jest.Mock
const borrar = ServicioArchivos.borrar as jest.Mock
const obtenerUrl = ServicioArchivos.obtenerUrl as jest.Mock

const RUTA = 'cualquier/ruta/archivo'
const MAX = PERFILES_ARCHIVO.evidencia.max_mb * 1024 * 1024

beforeEach(() => {
  jest.resetAllMocks()
  preparar.mockResolvedValue({ base64: 'QUJD', contentType: 'image/jpeg' })
  subirBase64.mockResolvedValue({ success: true, data: { ruta: RUTA } })
})

describe('GestorArchivos.subirImagen', () => {
  test('prepara la foto con los límites de su perfil y la sube a la ruta dada', async () => {
    const dimensiones = { ancho: 4000, alto: 3000 }
    const r = await GestorArchivos.subirImagen(RUTA, 'file:///foto.jpg', 'evidencia', dimensiones)
    expect(r).toEqual({ success: true, data: { ruta: RUTA } })
    expect(preparar).toHaveBeenCalledWith('file:///foto.jpg', {
      ladoMaximo: PERFILES_ARCHIVO.evidencia.lado_max,
      calidad: PERFILES_ARCHIVO.evidencia.calidad,
      dimensiones,
    })
    expect(subirBase64).toHaveBeenCalledWith(RUTA, 'QUJD', 'image/jpeg')
  })

  test('una foto que no se puede leer no se sube', async () => {
    preparar.mockRejectedValue(new Error('corrupta'))
    const r = await GestorArchivos.subirImagen(RUTA, 'file:///foto.jpg', 'evidencia')
    expect(r).toEqual({ success: false, error: ERRORES_ARCHIVO.IMAGEN_ILEGIBLE })
    expect(subirBase64).not.toHaveBeenCalled()
  })

  test('una foto que aún pesa más del límite del perfil no se sube', async () => {
    preparar.mockResolvedValue({
      base64: 'A'.repeat(Math.ceil((MAX * 4) / 3) + 8),
      contentType: 'image/jpeg',
    })
    const r = await GestorArchivos.subirImagen(RUTA, 'file:///foto.jpg', 'evidencia')
    expect(r).toEqual({ success: false, error: ERRORES_ARCHIVO.MUY_GRANDE })
    expect(subirBase64).not.toHaveBeenCalled()
  })

  test('si Storage falla devuelve un código, no el mensaje técnico', async () => {
    subirBase64.mockResolvedValue({ success: false, error: 'storage/unauthorized: ...' })
    const r = await GestorArchivos.subirImagen(RUTA, 'file:///foto.jpg', 'evidencia')
    expect(r).toEqual({ success: false, error: ERRORES_ARCHIVO.SUBIDA_FALLIDA })
  })
})

describe('GestorArchivos.borrar y obtenerUrl', () => {
  test('pasan la ruta tal cual al servicio', async () => {
    borrar.mockResolvedValue({ success: true })
    obtenerUrl.mockResolvedValue({ success: true, data: { url: 'https://x' } })
    expect(await GestorArchivos.borrar(RUTA)).toEqual({ success: true })
    expect(borrar).toHaveBeenCalledWith(RUTA)
    expect(await GestorArchivos.obtenerUrl(RUTA))
      .toEqual({ success: true, data: { url: 'https://x' } })
    expect(obtenerUrl).toHaveBeenCalledWith(RUTA)
  })
})
