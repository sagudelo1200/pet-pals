/* eslint-env jest */
import { COLORES_ESTADO, estadoParaMapa } from '../territorioVivoHtml'
import { armarOperativa } from '@/functions/src/compartido/territorio'
import type { ZonaH3 } from '@/models/ZonaH3'

const vista = (extra: Partial<ZonaH3>): ZonaH3 => ({
  id: 'c',
  nivel: 8,
  h3_r8: 'c',
  ...extra,
})
const operativa = (cuidadores_count: number, demanda_total: number) =>
  armarOperativa({ cuidadores_count, demanda_total, paseos_activos: 0, paseos_total: 0 })

describe('estadoParaMapa', () => {
  it('una celda con interesados y nada más es "interés sin servicio"', () => {
    expect(estadoParaMapa(vista({ interes: { tutores: 1, cuidadores: 0 } }))).toBe('interes')
    expect(
      estadoParaMapa(
        vista({ operativa: operativa(0, 0), interes: { tutores: 0, cuidadores: 2 } })
      )
    ).toBe('interes')
    expect(COLORES_ESTADO.interes.label).toMatch(/sin servicio/i)
  })

  it('si ya tiene actividad, manda su estado de siempre', () => {
    expect(
      estadoParaMapa(
        vista({ operativa: operativa(3, 1), interes: { tutores: 5, cuidadores: 5 } })
      )
    ).toBe('activa')
  })

  it('sin interesados queda su estado (o ninguno)', () => {
    expect(estadoParaMapa(vista({ operativa: operativa(2, 0) }))).toBe('disponible')
    expect(estadoParaMapa(vista({ interes: { tutores: 0, cuidadores: 0 } }))).toBeUndefined()
    expect(estadoParaMapa(vista({}))).toBeUndefined()
  })
})
