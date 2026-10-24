/* eslint-env jest */
import {
  subirFotoEntrega,
  ERROR_STORAGE_NO_HABILITADO,
} from '@/services/firebase/evidencias/fotoEntrega'
import {
  CATALOGO_CONFIGURACION,
  validarValor,
} from '@/functions/src/compartido/configuracion'

describe('foto de entrega (Storage aún no habilitado)', () => {
  test('no finge guardar: responde que Storage no está habilitado', async () => {
    const res = await subirFotoEntrega('p1', 'file:///foto.jpg')
    expect(res).toEqual({ success: false, error: ERROR_STORAGE_NO_HABILITADO })
  })

  test('la foto obligatoria está apagada por defecto y es un booleano válido', () => {
    const def = CATALOGO_CONFIGURACION.paseos.valores.foto_entrega_obligatoria
    expect(def.porDefecto).toBe(false)
    expect(validarValor(def, true)).toBeNull()
    expect(validarValor(def, 'si')).not.toBeNull()
  })
})
