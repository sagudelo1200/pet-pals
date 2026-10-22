/* eslint-env jest */
/**
 * Lado app de la configuración y el versionado: conversión del formulario,
 * valores por defecto ante fallos y orden de las versiones escuchadas.
 */

// Firestore simulado: onSnapshot guarda el callback y getDoc se controla
const mockSnapshots: Array<(_snap: any) => void> = []
const mockGetDoc = jest.fn()
jest.mock('@/firebase.config', () => ({ db: {}, functions: {} }))
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }))
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...ruta: string[]) => ruta.join('/'),
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  getDoc: (ruta: string) => mockGetDoc(ruta),
  onSnapshot: (_ref: unknown, alCambiar: (_snap: any) => void) => {
    mockSnapshots.push(alCambiar)
    return jest.fn()
  },
}))

import {
  CATALOGO_CONFIGURACION,
  valoresPorDefecto,
} from '@/functions/src/compartido/configuracion'
import { aEditable, cambiosDe, desdeEditable } from '@/logic/configuracion/formulario'
import { leerConfiguracion } from '@/services/firebase/configuracion'
import { escucharVersionVigente } from '@/services/firebase/versionado'

const snapshot = (data: unknown) => ({ data: () => data, exists: () => data !== undefined })

beforeEach(() => {
  mockSnapshots.length = 0
  mockGetDoc.mockReset()
})

describe('formulario de configuración', () => {
  const paseos = CATALOGO_CONFIGURACION.paseos.valores as any
  const evaluaciones = CATALOGO_CONFIGURACION.evaluaciones.valores as any

  test('convierte valores a texto editable y de vuelta', () => {
    expect(aEditable([6, 9, 12])).toBe('6, 9, 12')
    expect(aEditable(true)).toBe(true)
    expect(desdeEditable(evaluaciones.dias_revelacion, '6, 9 ,12,')).toEqual([6, 9, 12])
    expect(desdeEditable(paseos.max_mascotas, '3')).toBe(3)
    // Vacío o no numérico: NaN, para que la validación del catálogo lo rechace
    expect(desdeEditable(paseos.max_mascotas, '')).toBeNaN()
  })

  test('solo envía lo que cambió', () => {
    const actuales = { max_mascotas: 4, escalada_minutos: 30 }
    expect(cambiosDe(paseos, { max_mascotas: '4', escalada_minutos: '45' }, actuales))
      .toEqual({ escalada_minutos: 45 })
    expect(cambiosDe(paseos, { max_mascotas: '4', escalada_minutos: '30' }, actuales))
      .toEqual({})
  })
})

describe('leerConfiguracion', () => {
  test('completa lo que falta con el catálogo', async () => {
    mockGetDoc.mockResolvedValue(snapshot({ max_mascotas: 2 }))
    expect(await leerConfiguracion('paseos')).toEqual({ ...valoresPorDefecto('paseos'), max_mascotas: 2 })
  })

  test('si no se puede leer, usa el catálogo en vez de fallar', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockGetDoc.mockRejectedValue(new Error('permission-denied'))
    expect(await leerConfiguracion('paseos')).toEqual(valoresPorDefecto('paseos'))
  })
})

describe('escucharVersionVigente', () => {
  test('si se publican dos versiones seguidas entrega solo la última', async () => {
    let resolverV1: (_snap: unknown) => void = () => {}
    mockGetDoc.mockImplementation((ruta: string) =>
      ruta.endsWith('/v1')
        ? new Promise(r => { resolverV1 = r })
        : Promise.resolve(snapshot({ version: 2 }))
    )
    const recibidas: unknown[] = []
    escucharVersionVigente('politica_comercial', v => recibidas.push(v), jest.fn())

    mockSnapshots[0](snapshot({ version_vigente: 1 }))
    mockSnapshots[0](snapshot({ version_vigente: 2 }))
    await new Promise(r => setTimeout(r, 0))
    resolverV1(snapshot({ version: 1 })) // la lectura vieja llega tarde
    await new Promise(r => setTimeout(r, 0))

    expect(recibidas).toEqual([{ version: 2 }])
  })

  test('sin versión publicada avisa con null', () => {
    const recibidas: unknown[] = []
    escucharVersionVigente('politica_comercial', v => recibidas.push(v), jest.fn())
    mockSnapshots[0](snapshot(undefined))
    expect(recibidas).toEqual([null])
  })
})
