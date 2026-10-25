/* eslint-env jest */
import { cellToChildren } from 'h3-js'
import {
  SIN_ZONA,
  ciudadesDe,
  filtrarPorCiudad,
  mapaDeCeldas,
  resumenPorZona,
  resumenSinServicio,
  zonaDeCelda,
} from '../zonasDeNegocio'
import { celdaDe } from '@/functions/src/compartido/geografia'
import { armarOperativa } from '@/functions/src/compartido/territorio'
import type { Zona } from '@/functions/src/compartido/zonas'
import type { ZonaH3 } from '@/models/ZonaH3'

const R7 = celdaDe(4.6486, -74.0628, 'macro')
const R8 = celdaDe(4.6486, -74.0628, 'cobertura')
const R9 = celdaDe(4.6486, -74.0628, 'micro')
const OTRO_R8 = cellToChildren(R7, 8).find(c => c !== R8) as string
const LEJOS_R8 = celdaDe(6.25, -75.57, 'cobertura') // Medellín

const zona = (id: string, ciudad: string, extra: Partial<Zona> = {}): Zona => ({
  id,
  nombre: id,
  ciudad,
  estado: 'activa',
  celdas: [],
  excluidas: [],
  ...extra,
})
const chico = zona('bogota-chico', 'Bogotá')
const norte = zona('bogota-chico-norte', 'Bogotá')
const poblado = zona('medellin-poblado', 'Medellín')

const mapa = mapaDeCeldas([
  { celda: R7, zona_id: 'bogota-chico' },
  { celda: R8, zona_id: 'bogota-chico-norte' },
  { celda: LEJOS_R8, zona_id: 'medellin-poblado' },
])

describe('mapaDeCeldas y zonaDeCelda', () => {
  it('una celda fina gana sobre el barrio que la contiene', () => {
    expect(zonaDeCelda(R9, mapa)).toBe('bogota-chico-norte')
    expect(zonaDeCelda(OTRO_R8, mapa)).toBe('bogota-chico')
    expect(zonaDeCelda(LEJOS_R8, mapa)).toBe('medellin-poblado')
  })

  it('fuera de las zonas, ninguna', () => {
    expect(zonaDeCelda(celdaDe(10, -70, 'cobertura'), mapa)).toBeNull()
    expect(zonaDeCelda(R8, mapaDeCeldas([]))).toBeNull()
  })

  it('un hueco deja la celda sin zona', () => {
    const conHueco = mapaDeCeldas([
      { celda: R7, zona_id: 'bogota-chico' },
      { celda: OTRO_R8, zona_id: null, excluida_de: 'bogota-chico' },
    ])
    expect(zonaDeCelda(OTRO_R8, conHueco)).toBeNull()
    expect(zonaDeCelda(R8, conHueco)).toBe('bogota-chico')
  })
})

describe('ciudadesDe', () => {
  it('ciudades sin repetir y en orden', () => {
    expect(ciudadesDe([poblado, chico, norte])).toEqual(['Bogotá', 'Medellín'])
    expect(ciudadesDe([])).toEqual([])
  })
})

describe('filtrarPorCiudad', () => {
  const vista = (id: string): ZonaH3 => ({ id, nivel: 8, h3_r8: id })
  const vistas = [vista(R8), vista(OTRO_R8), vista(LEJOS_R8), vista(celdaDe(10, -70))]
  const zonas = [chico, norte, poblado]

  it('deja las celdas de la ciudad', () => {
    expect(filtrarPorCiudad(vistas, 'Bogotá', zonas, mapa).map(v => v.id)).toEqual([
      R8,
      OTRO_R8,
    ])
    expect(filtrarPorCiudad(vistas, 'Medellín', zonas, mapa).map(v => v.id)).toEqual([
      LEJOS_R8,
    ])
  })

  it('"Sin zona" deja las que no pertenecen a ninguna', () => {
    const resultado = filtrarPorCiudad(vistas, SIN_ZONA, zonas, mapa)
    expect(resultado).toHaveLength(1)
    expect(resultado[0].id).toBe(celdaDe(10, -70))
  })
})

describe('resumenPorZona', () => {
  const celda = (id: string, op: Parameters<typeof armarOperativa>[0]) => ({
    celda: id,
    res: 8,
    padre_r8: id,
    operativa: armarOperativa(op),
  })

  it('suma pedidos y paseos de las celdas de cada zona', () => {
    const resumen = resumenPorZona(
      [chico, norte, poblado],
      [
        celda(R8, { cuidadores_count: 4, demanda_total: 2, paseos_activos: 1, paseos_total: 10 }),
        celda(OTRO_R8, { cuidadores_count: 2, demanda_total: 1, paseos_activos: 0, paseos_total: 5 }),
        celda(LEJOS_R8, { cuidadores_count: 0, demanda_total: 3, paseos_activos: 0, paseos_total: 0 }),
      ],
      mapa
    )

    const por = (id: string) => resumen.find(r => r.zona.id === id)!
    expect(por('bogota-chico-norte')).toMatchObject({
      celdas: 1, demanda: 2, paseosActivos: 1, paseosTotal: 10, coberturaMedia: 4,
    })
    expect(por('bogota-chico')).toMatchObject({
      celdas: 1, demanda: 1, paseosTotal: 5, coberturaMedia: 2,
    })
    expect(por('medellin-poblado')).toMatchObject({
      demanda: 3, coberturaMedia: 0, celdasSinCobertura: 1,
    })
  })

  it('la cobertura es un promedio por celda: un cuidador que cubre varias no se cuenta varias veces', () => {
    const resumen = resumenPorZona(
      [chico],
      [
        celda(OTRO_R8, { cuidadores_count: 1, demanda_total: 0, paseos_activos: 0, paseos_total: 0 }),
        celda(cellToChildren(R7, 8)[2], { cuidadores_count: 1, demanda_total: 0, paseos_activos: 0, paseos_total: 0 }),
      ],
      mapa
    )
    expect(resumen[0].celdas).toBe(2)
    expect(resumen[0].coberturaMedia).toBe(1)
  })

  it('una zona sin datos aparece en ceros; las celdas sin zona o sin operativa se ignoran', () => {
    const resumen = resumenPorZona(
      [chico],
      [
        { celda: R9, res: 9, padre_r8: R8 },
        { celda: R8, res: 8, padre_r8: R8 },
        celda(celdaDe(10, -70), { cuidadores_count: 9, demanda_total: 9, paseos_activos: 9, paseos_total: 9 }),
      ],
      mapa
    )
    expect(resumen).toEqual([
      expect.objectContaining({ celdas: 0, demanda: 0, coberturaMedia: 0 }),
    ])
  })
})

describe('resumenSinServicio', () => {
  const conInteres = (celda: string, tutores: number, cuidadores: number) => ({
    celda,
    res: 8,
    padre_r8: celda,
    interes: { tutores, cuidadores },
  })
  const cerrada = zona('bogota-cerrada', 'Bogotá', { estado: 'cerrada' })
  const mapaConCerrada = mapaDeCeldas([
    { celda: R7, zona_id: 'bogota-chico' },
    { celda: LEJOS_R8, zona_id: 'bogota-cerrada' },
  ])

  it('suma el interés de las celdas fuera de toda zona o en zonas cerradas', () => {
    const resumen = resumenSinServicio(
      [chico, cerrada],
      [
        conInteres(celdaDe(10, -70), 3, 1), // sin zona
        conInteres(LEJOS_R8, 2, 0), // zona cerrada
      ],
      mapaConCerrada
    )
    expect(resumen).toEqual({ tutores: 5, cuidadores: 1, celdas: 2 })
  })

  it('donde ya se atiende (zona activa o piloto) no cuenta', () => {
    const resumen = resumenSinServicio(
      [chico, zona('piloto', 'Bogotá', { estado: 'piloto' })],
      [conInteres(R8, 4, 4)],
      mapaConCerrada
    )
    expect(resumen).toEqual({ tutores: 0, cuidadores: 0, celdas: 0 })
  })

  it('una celda sin interesados, o que no es de cobertura, se ignora', () => {
    const resumen = resumenSinServicio(
      [chico],
      [
        conInteres(celdaDe(10, -70), 0, 0),
        { celda: R9, res: 9, padre_r8: R8, interes: { tutores: 9, cuidadores: 9 } },
        { celda: celdaDe(10, -70), res: 8, padre_r8: celdaDe(10, -70) },
      ],
      mapa
    )
    expect(resumen.celdas).toBe(0)
  })
})
