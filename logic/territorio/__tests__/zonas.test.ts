/* eslint-env jest */
import { combinarZonas, sumarNarrativas } from '../zonas'
import { celdaDe, padreDe } from '@/functions/src/compartido/geografia'
import {
  armarOperativa,
  sumarEvento,
  type CeldaTerritorial,
} from '@/functions/src/compartido/territorio'

const R8 = celdaDe(4.6486, -74.0628, 'cobertura')
const R9_A = celdaDe(4.6486, -74.0628, 'micro')
const R9_B = celdaDe(4.6490, -74.0640, 'micro')
const OTRA_R8 = celdaDe(4.70, -74.00, 'cobertura')

const operativa = armarOperativa({
  cuidadores_count: 3,
  demanda_total: 1,
  paseos_activos: 0,
  paseos_total: 5,
})

const cobertura = (celda: string, op = operativa): CeldaTerritorial => ({
  celda,
  res: 8,
  padre_r8: celda,
  operativa: op,
})
const micro = (celda: string, ...acciones: string[]): CeldaTerritorial => ({
  celda,
  res: 9,
  padre_r8: padreDe(celda, 'cobertura'),
  narrativa: acciones.reduce(
    (n, accion) => sumarEvento(n, accion),
    undefined as ReturnType<typeof sumarEvento> | undefined
  ),
})

describe('sumarNarrativas', () => {
  it('sin microzonas no hay narrativa', () => {
    expect(sumarNarrativas([])).toBeUndefined()
  })

  it('suma eventos por tipo y recalcula los índices', () => {
    const a = micro(R9_A, 'juego', 'juego').narrativa!
    const b = micro(R9_B, 'agua').narrativa!

    const suma = sumarNarrativas([a, b])!

    expect(suma.total_eventos).toBe(3)
    expect(suma.eventos_por_tipo).toEqual({ juego: 2, agua: 1 })
    expect(suma.indices.bienestar).toBeGreaterThan(80)
  })

  it('la identidad es la de la microzona con más eventos', () => {
    const grande = micro(R9_A, 'juego', 'juego', 'juego').narrativa!
    grande.identidad = { tipo: 'parque', confianza: 80 }
    const chica = micro(R9_B, 'agua').narrativa!
    expect(sumarNarrativas([chica, grande])!.identidad.tipo).toBe('parque')
  })

  it('no modifica las narrativas recibidas', () => {
    const a = micro(R9_A, 'juego').narrativa!
    const copia = JSON.stringify(a)
    sumarNarrativas([a, a])
    expect(JSON.stringify(a)).toBe(copia)
  })
})

describe('combinarZonas', () => {
  it('sin datos no hay zonas', () => {
    expect(combinarZonas([])).toEqual([])
  })

  it('una celda de cobertura sin microzonas: oferta y demanda, sin narrativa', () => {
    const [zona, ...resto] = combinarZonas([cobertura(R8)])
    expect(resto).toEqual([])
    expect(zona).toMatchObject({ id: R8, nivel: 8, h3_r8: R8, operativa })
    expect(zona.narrativa).toBeUndefined()
    expect(zona.h3_r9).toBeUndefined()
  })

  it('cada microzona lleva la oferta y demanda de su celda de cobertura', () => {
    const zonas = combinarZonas([cobertura(R8), micro(R9_A, 'juego')])
    const vistaR9 = zonas.find(z => z.nivel === 9)!

    expect(vistaR9).toMatchObject({
      id: R9_A,
      h3_r8: R8,
      h3_r9: R9_A,
      operativa,
    })
    expect(vistaR9.narrativa!.total_eventos).toBe(1)
  })

  it('la vista de la celda de cobertura suma lo observado en sus microzonas', () => {
    const zonas = combinarZonas([
      cobertura(R8),
      micro(R9_A, 'juego', 'juego'),
      micro(R9_B, 'agua'),
    ])
    const vistaR8 = zonas.find(z => z.nivel === 8)!

    expect(vistaR8.narrativa).toMatchObject({
      total_eventos: 3,
      eventos_por_tipo: { juego: 2, agua: 1 },
    })
    expect(zonas.filter(z => z.nivel === 8)).toHaveLength(1)
    expect(zonas.filter(z => z.nivel === 9)).toHaveLength(2)
  })

  it('microzonas observadas en una celda sin oferta ni demanda también aparecen', () => {
    const zonas = combinarZonas([micro(R9_A, 'juego')])
    const vistaR8 = zonas.find(z => z.nivel === 8)!

    expect(vistaR8.h3_r8).toBe(R8)
    expect(vistaR8.operativa).toBeUndefined()
    expect(vistaR8.narrativa!.total_eventos).toBe(1)
    expect(zonas.find(z => z.nivel === 9)!.operativa).toBeUndefined()
  })

  it('celdas de cobertura distintas no se mezclan', () => {
    const otra = armarOperativa({
      cuidadores_count: 0,
      demanda_total: 2,
      paseos_activos: 0,
      paseos_total: 0,
    })
    const zonas = combinarZonas([cobertura(R8), cobertura(OTRA_R8, otra)])
    expect(zonas.find(z => z.id === OTRA_R8)!.operativa!.estado).toBe(
      'sin_cobertura'
    )
    expect(zonas.find(z => z.id === R8)!.operativa!.estado).toBe('activa')
  })

  it('el interés de una celda viaja con su vista de cobertura', () => {
    const [zona] = combinarZonas([
      { celda: R8, res: 8, padre_r8: R8, interes: { tutores: 2, cuidadores: 1 } },
    ])
    expect(zona.interes).toEqual({ tutores: 2, cuidadores: 1 })
    expect(zona.operativa).toBeUndefined()
  })

  it('ignora documentos de otras escalas', () => {
    const macro = {
      celda: celdaDe(4.6486, -74.0628, 'macro'),
      res: 7,
      padre_r8: R8,
    }
    expect(combinarZonas([macro])).toEqual([])
  })

  it('las vistas de cobertura van antes que las de microzona', () => {
    const niveles = combinarZonas([
      micro(R9_A, 'juego'),
      cobertura(R8),
      cobertura(OTRA_R8),
    ]).map(z => z.nivel)
    expect(niveles).toEqual([8, 8, 9])
  })
})
