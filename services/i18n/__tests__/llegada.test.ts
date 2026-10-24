/* eslint-env jest */
/**
 * Los textos de "¿Cómo llegó?" deben existir en español e inglés para cada
 * respuesta del catálogo.
 */
import { LLEGADAS } from '@/functions/src/compartido/expediente'
import esPaseos from '../locales/es/paseos.json'
import enPaseos from '../locales/en/paseos.json'

describe.each([
  ['es', esPaseos],
  ['en', enPaseos],
] as const)('textos de llegada (%s)', (_idioma, paseos) => {
  test.each([...LLEGADAS])('respuesta: %s', llegada => {
    expect(typeof (paseos.llegada.opciones as any)[llegada]).toBe('string')
  })

  test('textos de apoyo', () => {
    for (const clave of [
      'titulo',
      'titulo_sin_nombre',
      'subtitulo',
      'distinto_para_cada_una',
      'igual_para_todas',
      'enviar',
      'omitir',
      'mascota_sin_nombre',
      'error',
    ] as const) {
      expect(typeof paseos.llegada[clave]).toBe('string')
    }
    expect(paseos.llegada.titulo).toContain('{{nombres}}')
  })
})

test('español e inglés tienen las mismas claves de llegada', () => {
  expect(Object.keys(enPaseos.llegada).sort()).toEqual(
    Object.keys(esPaseos.llegada).sort()
  )
  expect(Object.keys(enPaseos.llegada.opciones).sort()).toEqual(
    Object.keys(esPaseos.llegada.opciones).sort()
  )
})
