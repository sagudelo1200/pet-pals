/**
 * Tests del motor de versionado genérico y del catálogo de configuración.
 */
import * as mockFirestore from '../helpers/mockFirestore'

jest.mock('firebase-admin/firestore', () => ({
  Timestamp: mockFirestore.MOCK_TIMESTAMP,
  FieldValue: mockFirestore.MOCK_FIELD_VALUE,
}))

import {
  hashContenido,
  obtenerVersion,
  obtenerVersionVigente,
  publicarVersion,
  reactivarVersion,
} from '../../src/comun/versionado'
import {
  actualizarConfiguracion,
  leerConfiguracion,
  limpiarCacheConfiguracion,
  sembrarConfiguracion,
} from '../../src/comun/configuracion'
import {
  definicionVersionable,
  jsonEstable,
  TIPOS_VERSIONABLES,
} from '../../src/compartido/versionables'
import {
  AREAS_CONFIGURACION,
  CATALOGO_CONFIGURACION,
  validarCambios,
  validarValor,
  valoresPorDefecto,
} from '../../src/compartido/configuracion'

const db = mockFirestore.crearMockDb()
const AHORA = mockFirestore.MOCK_TIMESTAMP.fromMillis(Date.UTC(2026, 9, 21, 15)) as any
const OPCIONES = { motivo: 'Ajuste operativo', autor: 'admin', ahora: AHORA }
const doc = (p: string) => db.__docs.get(p)
const opciones = (motivo = 'Versión inicial') => ({ motivo, autor: 'admin', ahora: AHORA })

const CONSENTIMIENTO = {
  titulo: 'Términos',
  texto: 'Texto legal v1',
  es_obligatorio: true,
  roles_requeridos: [],
  requiere_reconfirmacion_meses: null,
}
const TIPO = 'consentimiento_TERMINOS_SERVICIO'

beforeEach(() => {
  db.__reset()
  limpiarCacheConfiguracion()
})

describe('motor de versionado', () => {
  test('publica la primera versión y deja el puntero en la serie', async () => {
    const r = await publicarVersion(db, TIPO, CONSENTIMIENTO, opciones())
    expect(r).toMatchObject({ version: 1, nueva: true })
    expect(doc(`versionados/${TIPO}`)).toMatchObject({ version_vigente: 1, hash_vigente: r.hash })
    expect(doc(`versionados/${TIPO}/versiones/v1`)).toMatchObject({
      tipo: TIPO, version: 1, esquema: 1, estado: 'ACTIVA', motivo: 'Versión inicial',
      contenido: CONSENTIMIENTO, publicado_por: 'admin',
    })
  })

  test('publicar otra versión archiva la anterior', async () => {
    await publicarVersion(db, TIPO, CONSENTIMIENTO, opciones())
    const r = await publicarVersion(db, TIPO, { ...CONSENTIMIENTO, texto: 'Texto v2' }, opciones('Ajuste legal'))
    expect(r.version).toBe(2)
    expect(doc(`versionados/${TIPO}/versiones/v1`)).toMatchObject({ estado: 'HISTORICA', vigente_hasta: AHORA })
    expect((await obtenerVersionVigente<any>(db, TIPO)).contenido.texto).toBe('Texto v2')
  })

  test('idempotente: el mismo contenido (aunque llegue en otro orden) no crea versión', async () => {
    await publicarVersion(db, TIPO, CONSENTIMIENTO, opciones())
    const reordenado = {
      requiere_reconfirmacion_meses: null, roles_requeridos: [], es_obligatorio: true,
      texto: 'Texto legal v1', titulo: 'Términos',
    }
    const r = await publicarVersion(db, TIPO, reordenado, opciones('Doble toque'))
    expect(r).toMatchObject({ version: 1, nueva: false })
    expect(doc(`versionados/${TIPO}/versiones/v2`)).toBeUndefined()
  })

  test('normaliza: guarda solo campos conocidos', async () => {
    await publicarVersion(db, TIPO, { ...CONSENTIMIENTO, extra: 'x' }, opciones())
    expect(doc(`versionados/${TIPO}/versiones/v1`).contenido).not.toHaveProperty('extra')
  })

  test('reactivar publica una copia como versión nueva, sin tocar la antigua', async () => {
    await publicarVersion(db, TIPO, CONSENTIMIENTO, opciones())
    await publicarVersion(db, TIPO, { ...CONSENTIMIENTO, texto: 'Texto v2' }, opciones('Cambio'))
    const r = await reactivarVersion(db, TIPO, 1, opciones('Volver a v1'))
    expect(r.version).toBe(3)
    expect((await obtenerVersion<any>(db, TIPO, 3)).contenido.texto).toBe('Texto legal v1')
    expect(doc(`versionados/${TIPO}/versiones/v1`).estado).toBe('HISTORICA')
  })

  test('rechaza contenido inválido, motivo vacío y tipos no registrados', async () => {
    await expect(publicarVersion(db, TIPO, { ...CONSENTIMIENTO, titulo: '' }, opciones()))
      .rejects.toMatchObject({ codigo: 'invalid-argument' })
    await expect(publicarVersion(db, TIPO, CONSENTIMIENTO, opciones('  ')))
      .rejects.toThrow(/Motivo/)
    await expect(publicarVersion(db, 'cualquier_cosa', {}, opciones()))
      .rejects.toThrow(/no versionable/)
  })

  test('sin versión publicada, la lectura falla con un error claro', async () => {
    await expect(obtenerVersionVigente(db, TIPO)).rejects.toMatchObject({ codigo: 'not-found' })
  })

  test('hash estable y registro de tipos', () => {
    expect(jsonEstable({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}')
    expect(hashContenido({ a: 1, b: 2 })).toBe(hashContenido({ b: 2, a: 1 }))
    expect(hashContenido({ a: 1 })).toMatch(/^sha256:[0-9a-f]{64}$/)
    for (const tipo of TIPOS_VERSIONABLES) expect(definicionVersionable(tipo)).not.toBeNull()
    expect(definicionVersionable('consentimiento_INVENTADO')).toBeNull()
  })
})

describe('configuración operativa', () => {
  test('sin documento usa los valores del catálogo', async () => {
    expect(await leerConfiguracion(db, 'paseos')).toEqual(valoresPorDefecto('paseos'))
  })

  test('valor guardado inválido: usa el del catálogo', async () => {
    db.__seed('configuracion/paseos', { max_mascotas: 999, escalada_minutos: 45 })
    expect(await leerConfiguracion(db, 'paseos')).toEqual({ ...valoresPorDefecto('paseos'), escalada_minutos: 45 })
  })

  test('actualizar valida, guarda solo lo que cambia y deja historial', async () => {
    await sembrarConfiguracion(db, AHORA)
    const cambiadas = await actualizarConfiguracion(
      db, 'paseos', { max_mascotas: 4, escalada_minutos: 20 }, OPCIONES)
    expect(cambiadas).toEqual(['escalada_minutos'])
    expect(doc('configuracion/paseos')).toMatchObject({ escalada_minutos: 20, actualizado_por: 'admin' })
    const historial = [...db.__docs.entries()].filter(([p]: [string]) =>
      p.startsWith('configuracion/paseos/historial/'))
    expect(historial).toHaveLength(1)
    expect(historial[0][1].cambios).toEqual({ escalada_minutos: { antes: 30, despues: 20 } })
    expect(historial[0][1].motivo).toBe('Ajuste operativo')
    // La lectura ve el valor nuevo (la escritura invalida la caché)
    expect((await leerConfiguracion(db, 'paseos')).escalada_minutos).toBe(20)
  })

  test('sin cambios reales no escribe historial', async () => {
    await sembrarConfiguracion(db, AHORA)
    expect(await actualizarConfiguracion(db, 'paseos', { max_mascotas: 4 }, OPCIONES)).toEqual([])
    expect([...db.__docs.keys()].some((p: string) => p.includes('/historial/'))).toBe(false)
  })

  test('rechaza áreas, claves y valores inválidos', async () => {
    await expect(actualizarConfiguracion(db, 'otra', { x: 1 }, OPCIONES))
      .rejects.toThrow(/Área desconocida/)
    await expect(actualizarConfiguracion(db, 'paseos', { max_mascotas: 3 }, { ...OPCIONES, motivo: ' ' }))
      .rejects.toThrow(/Motivo/)
    expect(validarCambios('paseos', { inventado: 1 })).toEqual(['inventado: no existe en paseos'])
    expect(validarCambios('paseos', { max_mascotas: 0 })[0]).toMatch(/entre 1 y 10/)
    expect(validarCambios('evaluaciones', { dias_revelacion: [] })[0]).toMatch(/lista/)
    expect(validarCambios('funcionalidades', { paseo_compartido: 'si' })[0]).toMatch(/sí o no/)
  })

  test('sembrar crea lo que falta sin pisar lo existente', async () => {
    db.__seed('configuracion/paseos', { max_mascotas: 6 })
    const sembrado = await sembrarConfiguracion(db, AHORA)
    expect(sembrado.paseos).toEqual(
      Object.keys(valoresPorDefecto('paseos')).filter(c => c !== 'max_mascotas')
    )
    expect(doc('configuracion/paseos').max_mascotas).toBe(6)
    expect(doc('configuracion/auth')).toMatchObject({ otp_minutos_expiracion: 10, otp_max_intentos: 3 })
    expect(await sembrarConfiguracion(db, AHORA)).toEqual({})
  })
})

describe('cada ajuste vive en el área de su tema', () => {
  test('exigir_zona es de las zonas, no de los paseos', () => {
    expect(CATALOGO_CONFIGURACION.paseos.valores).not.toHaveProperty('exigir_zona')
    expect(valoresPorDefecto('zonas')).toEqual({ exigir_zona: false })
    expect(validarCambios('zonas', { exigir_zona: true })).toEqual([])
    expect(validarCambios('paseos', { exigir_zona: true })).toEqual(['exigir_zona: no existe en paseos'])
  })

  test('la foto de entrega obligatoria está apagada por defecto y es un booleano válido', () => {
    const def = CATALOGO_CONFIGURACION.paseos.valores.foto_entrega_obligatoria
    expect(def.porDefecto).toBe(false)
    expect(validarValor(def, true)).toBeNull()
    expect(validarValor(def, 'si')).not.toBeNull()
    expect(def.descripcion).not.toMatch(/Storage/)
  })

  test('los ajustes de la habilitación tienen su propia área', () => {
    expect(AREAS_CONFIGURACION).toContain('habilitaciones')
    expect(AREAS_CONFIGURACION).not.toContain('servicios')
    expect(valoresPorDefecto('habilitaciones')).toEqual({ antecedentes_vigencia_meses: 12 })
  })

  test('las áreas que solo usa el servidor no se exponen a la app', () => {
    const soloServidor = AREAS_CONFIGURACION.filter(a => CATALOGO_CONFIGURACION[a].lectura === 'servidor')
    expect(soloServidor).toEqual(expect.arrayContaining(['zonas', 'habilitaciones', 'emparejamiento', 'evaluaciones']))
  })

  test('el ajuste de zonas se lee de su área y no de la de paseos', async () => {
    db.__seed('configuracion/paseos', { exigir_zona: true })
    expect((await leerConfiguracion(db, 'zonas')).exigir_zona).toBe(false)
    db.__seed('configuracion/zonas', { exigir_zona: true })
    limpiarCacheConfiguracion()
    expect((await leerConfiguracion(db, 'zonas')).exigir_zona).toBe(true)
  })
})
