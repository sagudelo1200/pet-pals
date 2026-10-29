import {
  obtenerErrorCelularI18n,
  validarCelularColombia,
} from '../validador-celular'

describe('celular colombiano', () => {
  test('acepta los formatos habituales y los normaliza', () => {
    for (const v of ['3001234567', '300 123 4567', '+57 300 123 4567', '573001234567']) {
      expect(validarCelularColombia(v)).toEqual({ valido: true, celularSanitizado: '3001234567' })
    }
  })

  test('rechaza lo que no es un celular', () => {
    expect(validarCelularColombia('300123').valido).toBe(false)
    expect(validarCelularColombia('2001234567').valido).toBe(false)
    expect(validarCelularColombia('30012345ab').valido).toBe(false)
  })

  test('un campo vacío no muestra error (aún no escribió nada), pero no es válido', () => {
    expect(obtenerErrorCelularI18n('')).toBeNull()
    expect(obtenerErrorCelularI18n('   ')).toBeNull()
    expect(validarCelularColombia('').valido).toBe(false)
  })

  test('con algo escrito, el error dice qué corregir', () => {
    expect(obtenerErrorCelularI18n('300123')?.key).toContain('longitud_incorrecta')
    expect(obtenerErrorCelularI18n('2001234567')?.key).toContain('no_empieza_con_3')
  })
})
