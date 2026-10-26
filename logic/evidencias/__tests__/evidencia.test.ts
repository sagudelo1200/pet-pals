import { rutaDeDestino } from '../evidencia'

const destino = {
  uid: 'u1',
  servicio: 'paseo',
  requisito: 'identidad',
  archivo: 'frente',
}

describe('rutaDeDestino', () => {
  test('arma la ruta que protege storage.rules', () => {
    expect(rutaDeDestino(destino)).toBe('solicitudes/u1/paseo/identidad/frente')
    expect(rutaDeDestino({ ...destino, requisito: 'antecedentes', archivo: 'certificado' }))
      .toBe('solicitudes/u1/paseo/antecedentes/certificado')
  })

  test('nada se sube a ciegas: lo que el catálogo no pide no tiene ruta', () => {
    expect(rutaDeDestino({ ...destino, servicio: 'guarderia' })).toBeNull()
    expect(rutaDeDestino({ ...destino, requisito: 'no_existe' })).toBeNull()
    expect(rutaDeDestino({ ...destino, archivo: 'selfie' })).toBeNull()
    // un requisito que valida el sistema no lleva evidencia
    expect(rutaDeDestino({ ...destino, requisito: 'email', archivo: 'frente' })).toBeNull()
    expect(rutaDeDestino({ ...destino, uid: '' })).toBeNull()
  })

  test('un archivo con ruta falsa no cuela otra carpeta', () => {
    expect(rutaDeDestino({ ...destino, archivo: '../u2/frente' })).toBeNull()
    expect(rutaDeDestino({ ...destino, requisito: 'identidad/../x' })).toBeNull()
  })
})
