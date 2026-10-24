/* eslint-env jest */
/**
 * Los textos de los momentos del paseo deben existir, en español e inglés,
 * para cada clave del catálogo (compartido/expediente.ts): nada se muestra
 * "a ciegas" ni queda una clave sin traducir.
 */
import {
  CAUSAS_DEL_NERVIOSISMO,
  DETALLES_DEL_CONFLICTO,
  FORMAS_DE_CALMARLO,
  GRUPOS_MOMENTO,
  MOMENTOS,
} from '@/functions/src/compartido/expediente'
import esPaseos from '../locales/es/paseos.json'
import enPaseos from '../locales/en/paseos.json'
import esChat from '../locales/es/chat.json'
import enChat from '../locales/en/chat.json'

const idiomas = [
  ['es', esPaseos, esChat],
  ['en', enPaseos, enChat],
] as const

const en = (obj: any, ruta: string): unknown =>
  ruta.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj)

/** Todas las rutas de hojas de un objeto, para comparar dos idiomas. */
const rutas = (obj: any, base = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? rutas(v, `${base}${k}.`) : [`${base}${k}`]
  )

describe.each(idiomas)('textos de momentos (%s)', (_idioma, paseos, chat) => {
  test.each(MOMENTOS.map(m => m.clave))('opción de menú: %s', clave => {
    expect(typeof en(paseos, `momentos.opciones.${clave}`)).toBe('string')
  })

  test.each(GRUPOS_MOMENTO)('grupo del menú: %s', grupo => {
    expect(typeof en(paseos, `momentos.grupos.${grupo}.titulo`)).toBe('string')
    expect(typeof en(paseos, `momentos.grupos.${grupo}.subtitulo`)).toBe(
      'string'
    )
  })

  test('opciones de los seguimientos', () => {
    for (const [tipo, opciones] of [
      ['causa', CAUSAS_DEL_NERVIOSISMO],
      ['calma', FORMAS_DE_CALMARLO],
      ['conflicto', DETALLES_DEL_CONFLICTO],
    ] as const) {
      expect(typeof en(paseos, `momentos.seguimientos.${tipo}.titulo`)).toBe(
        'string'
      )
      for (const o of opciones) {
        expect(
          typeof en(paseos, `momentos.seguimientos.${tipo}.opciones.${o.clave}`)
        ).toBe('string')
      }
    }
  })

  test('mensajes del chat: momentos del catálogo e incidentes', () => {
    for (const m of MOMENTOS) {
      const [grupo, accion] = m.clave.split('.')
      const ruta =
        grupo === 'emergencia'
          ? `sistema.incidentes.${accion}`
          : `sistema.momentos.${m.clave}`
      expect(typeof en(chat, ruta)).toBe('string')
    }
    for (const llave of ['causa', 'calmo_con', 'conflicto']) {
      expect(en(chat, `sistema.detalle.${llave}`)).toContain('{{valor}}')
    }
  })

  test('textos de apoyo del menú', () => {
    for (const ruta of [
      'momentos.acciones.volver',
      'momentos.acciones.omitir',
      'momentos.acciones.guardar',
      'momentos.acciones.cerrar',
      'momentos.acciones.guardando',
      'momentos.a_quien',
      'momentos.todos',
      'momentos.nota.etiqueta',
      'momentos.nota.placeholder',
      'momentos.confirmar_emergencia.titulo',
      'momentos.confirmar_emergencia.mensaje',
      'momentos.confirmar_emergencia.confirmar',
    ]) {
      expect(typeof en(paseos, ruta)).toBe('string')
    }
  })
})

describe('español e inglés tienen las mismas claves', () => {
  test('momentos del paseo', () => {
    expect(rutas(enPaseos.momentos).sort()).toEqual(
      rutas(esPaseos.momentos).sort()
    )
  })

  test('mensajes del sistema de los momentos', () => {
    for (const parte of ['momentos', 'incidentes', 'detalle'] as const) {
      expect(rutas(enChat.sistema[parte]).sort()).toEqual(
        rutas(esChat.sistema[parte]).sort()
      )
    }
  })
})
