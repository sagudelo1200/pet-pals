jest.mock('@/logic/archivos/gestor', () => ({
  GestorArchivos: { subirImagen: jest.fn(), obtenerUrl: jest.fn() },
}))

import { GestorArchivos } from '@/logic/archivos/gestor'
import { rutaFotoEntrega, subirFotoEntrega } from '../fotoEntrega'

const subir = GestorArchivos.subirImagen as jest.Mock
const url = GestorArchivos.obtenerUrl as jest.Mock

beforeEach(() => {
  jest.resetAllMocks()
  subir.mockResolvedValue({ success: true, data: { ruta: 'x' } })
  url.mockResolvedValue({ success: true, data: { url: 'https://foto/grupo' } })
})

describe('foto de entrega', () => {
  test('va a la ruta que protege storage.rules (un archivo por paseo)', () => {
    expect(rutaFotoEntrega('p1')).toBe('paseos/p1/entrega/grupo')
  })

  test('sube con el perfil foto_entrega y devuelve la dirección', async () => {
    const dimensiones = { ancho: 3000, alto: 3000 }
    const r = await subirFotoEntrega('p1', 'file:///f.jpg', dimensiones)
    expect(r).toEqual({ success: true, url: 'https://foto/grupo' })
    expect(subir).toHaveBeenCalledWith(
      'paseos/p1/entrega/grupo',
      'file:///f.jpg',
      'foto_entrega',
      dimensiones
    )
    expect(url).toHaveBeenCalledWith('paseos/p1/entrega/grupo')
  })

  test('si no se pudo subir, devuelve el código y no pide la dirección', async () => {
    subir.mockResolvedValue({ success: false, error: 'ARCHIVO_MUY_GRANDE' })
    expect(await subirFotoEntrega('p1', 'file:///f.jpg')).toEqual({
      success: false,
      error: 'ARCHIVO_MUY_GRANDE',
    })
    expect(url).not.toHaveBeenCalled()
  })

  test('si se subió pero no se obtiene la dirección, falla (no finge guardar)', async () => {
    url.mockResolvedValue({ success: false, error: 'x' })
    expect(await subirFotoEntrega('p1', 'file:///f.jpg')).toEqual({
      success: false,
      error: 'ARCHIVO_SUBIDA_FALLIDA',
    })
  })
})
