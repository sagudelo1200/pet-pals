jest.mock('firebase/storage', () => ({
  ref: jest.fn((_storage: unknown, ruta: string) => ({ ruta })),
  uploadString: jest.fn(),
  deleteObject: jest.fn(),
  getDownloadURL: jest.fn(),
}))

import { deleteObject, getDownloadURL, uploadString } from 'firebase/storage'
import { ServicioArchivos } from '../storage/archivos'

const subir = uploadString as jest.Mock
const eliminar = deleteObject as jest.Mock
const direccion = getDownloadURL as jest.Mock

beforeEach(() => {
  subir.mockReset()
  eliminar.mockReset()
  direccion.mockReset()
})

describe('ServicioArchivos', () => {
  test('sube en base64 con su tipo de contenido', async () => {
    subir.mockResolvedValue({})
    const r = await ServicioArchivos.subirBase64('a/b', 'QUJD', 'image/jpeg')
    expect(r).toEqual({ success: true, data: { ruta: 'a/b' } })
    expect(subir).toHaveBeenCalledWith({ ruta: 'a/b' }, 'QUJD', 'base64', {
      contentType: 'image/jpeg',
    })
  })

  test('un fallo al subir no lanza: responde success false', async () => {
    subir.mockRejectedValue({ code: 'storage/unauthorized', message: 'no' })
    const r = await ServicioArchivos.subirBase64('a/b', 'QUJD', 'image/jpeg')
    expect(r.success).toBe(false)
    expect(r.error).toBeTruthy()
  })

  test('borrar un archivo que ya no existe también es éxito', async () => {
    eliminar.mockRejectedValue({ code: 'storage/object-not-found' })
    expect(await ServicioArchivos.borrar('a/b')).toEqual({ success: true })
  })

  test('otro fallo al borrar sí es error', async () => {
    eliminar.mockRejectedValue({ code: 'storage/unauthorized', message: 'no' })
    expect((await ServicioArchivos.borrar('a/b')).success).toBe(false)
  })

  test('devuelve la dirección del archivo, o el error', async () => {
    direccion.mockResolvedValue('https://x/y')
    expect(await ServicioArchivos.obtenerUrl('a/b'))
      .toEqual({ success: true, data: { url: 'https://x/y' } })
    direccion.mockRejectedValue({ code: 'storage/unauthorized', message: 'no' })
    expect((await ServicioArchivos.obtenerUrl('a/b')).success).toBe(false)
  })

  test('un archivo que aún no existe responde sin ser un error técnico', async () => {
    direccion.mockRejectedValue({ code: 'storage/object-not-found', message: 'no' })
    expect(await ServicioArchivos.obtenerUrl('a/b'))
      .toEqual({ success: false, error: 'storage/object-not-found' })
  })
})
