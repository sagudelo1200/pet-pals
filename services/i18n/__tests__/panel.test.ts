/* eslint-env jest */
/**
 * Los textos del panel del paseo y del resumen de la mascota deben existir en
 * español e inglés.
 */
import esPaseos from '../locales/es/paseos.json'
import enPaseos from '../locales/en/paseos.json'

const rutas = (obj: any, base = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? rutas(v, `${base}${k}.`) : [`${base}${k}`]
  )

describe.each([
  ['es', esPaseos],
  ['en', enPaseos],
] as const)('panel del paseo y resumen (%s)', (_idioma, paseos) => {
  test('panel', () => {
    for (const clave of [
      'registrar_titulo',
      'registrar_subtitulo',
      'escribir_al_tutor',
      'como_volver',
      'conocer_titulo',
      'restante',
      'excedido',
      'compartiendo_ubicacion',
      'ver_resumen',
    ] as const) {
      expect(typeof paseos.panel[clave]).toBe('string')
    }
    expect(paseos.panel.restante).toContain('{{minutos}}')
    expect(paseos.panel.registrar_subtitulo).toContain('{{nombres}}')
  })

  test('resumen', () => {
    for (const clave of [
      'que_funciona',
      'que_evitar',
      'ten_en_cuenta',
      'alertas',
      'sin_datos',
      'primer_paseo',
      'revisa_esto',
      'revisa_ayuda',
      'es_asi',
      'no_es_asi',
      'cancelar',
      'rechazar_titulo',
      'rechazar_mensaje',
      'error',
      'aprendido_titulo',
      'llegadas_titulo',
      'conociendo',
    ] as const) {
      expect(typeof paseos.resumen[clave]).toBe('string')
    }
    for (const estado of ['confirmado', 'firme', 'observado'] as const) {
      expect(typeof paseos.resumen.estado[estado]).toBe('string')
    }
    expect(paseos.resumen.primer_paseo).toContain('{{nombre}}')
    expect(paseos.resumen.aprendido_titulo).toContain('{{nombre}}')
    expect(paseos.resumen.conociendo).toContain('{{nombre}}')
  })
})

describe.each([
  ['es', esPaseos],
  ['en', enPaseos],
] as const)('continuidad (%s)', (_idioma, paseos) => {
  test('textos de "ya conoce" y "pedir de nuevo"', () => {
    for (const clave of [
      'ya_conoce',
      'ya_conoce_uno',
      'ya_conoce_varios',
      'pedir_de_nuevo',
      'este_cuidador',
    ] as const) {
      expect(typeof paseos.continuidad[clave]).toBe('string')
    }
    expect(paseos.continuidad.ya_conoce).toContain('{{nombres}}')
    expect(paseos.continuidad.ya_conoce_varios).toContain('{{paseos}}')
    expect(paseos.continuidad.pedir_de_nuevo).toContain('{{cuidador}}')
  })
})

describe.each([
  ['es', esPaseos],
  ['en', enPaseos],
] as const)('advertencias del emparejamiento (%s)', (_idioma, paseos) => {
  test('textos para el tutor y para el cuidador', () => {
    for (const perspectiva of ['tutor', 'cuidador'] as const) {
      const textos = paseos.advertencias[perspectiva]
      for (const clave of ['tamano', 'cupo_uno', 'cupo_otros', 'titulo', 'mensaje'] as const) {
        expect(typeof textos[clave]).toBe('string')
      }
      expect(textos.tamano).toContain('{{mascotas}}')
      expect(textos.cupo_otros).toContain('{{cupo}}')
      expect(textos.mensaje).toContain('{{avisos}}')
    }
    expect(paseos.advertencias.tutor.mensaje).toContain('{{cuidador}}')
    expect(typeof paseos.advertencias.tutor.continuar).toBe('string')
    expect(typeof paseos.advertencias.cuidador.aceptar).toBe('string')
  })

  test('los motivos y razones de la lista de cuidadores', () => {
    const lista = paseos.pasos.seleccionar_cuidador
    for (const motivo of ['horario', 'no_trabaja', 'ocupado', 'hora_pasada', 'fuera_de_servicio'] as const) {
      expect(typeof lista.motivos[motivo]).toBe('string')
    }
    expect(typeof lista.razones.nuevo).toBe('string')
    expect(typeof lista.razones.destacado).toBe('string')
  })
})

describe.each([
  ['es', esPaseos],
  ['en', enPaseos],
] as const)('aviso de sector sin servicio (%s)', (_idioma, paseos) => {
  test('cada rol tiene su texto para cada motivo', () => {
    for (const rol of ['tutor', 'cuidador'] as const) {
      expect(typeof paseos.servicio[rol].titulo).toBe('string')
      expect(typeof paseos.servicio[rol].sin_zona).toBe('string')
      expect(paseos.servicio[rol].zona_cerrada).toContain('{{zona}}')
    }
    expect(typeof paseos.servicio.avisame).toBe('string')
    expect(typeof paseos.servicio.avisaremos).toBe('string')
  })
})

test('español e inglés tienen las mismas claves', () => {
  expect(rutas(enPaseos.advertencias).sort()).toEqual(
    rutas(esPaseos.advertencias).sort()
  )
  expect(rutas(enPaseos.servicio).sort()).toEqual(
    rutas(esPaseos.servicio).sort()
  )
  expect(rutas(enPaseos.pasos.seleccionar_cuidador).sort()).toEqual(
    rutas(esPaseos.pasos.seleccionar_cuidador).sort()
  )
  expect(rutas(enPaseos.panel).sort()).toEqual(rutas(esPaseos.panel).sort())
  expect(rutas(enPaseos.resumen).sort()).toEqual(rutas(esPaseos.resumen).sort())
  expect(rutas(enPaseos.continuidad).sort()).toEqual(
    rutas(esPaseos.continuidad).sort()
  )
})
