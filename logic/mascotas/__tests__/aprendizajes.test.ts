/* eslint-env jest */
import { cantidadPorRevisar, llegadasRecientes } from '../aprendizajes'

const llegada = (paseo: string, valor: string, fecha: number) => ({
  paseo_id: paseo,
  llegada: valor,
  fecha_ms: fecha,
})

describe('llegadasRecientes', () => {
  test('devuelve las más recientes primero, con su emoji', () => {
    const r = llegadasRecientes({
      ultimas_llegadas: [
        llegada('p1', 'tranquilo', 100),
        llegada('p3', 'con_molestia', 300),
        llegada('p2', 'agitado', 200),
      ],
    })
    expect(r.map(l => [l.paseo_id, l.llegada, l.emoji])).toEqual([
      ['p3', 'con_molestia', '🤕'],
      ['p2', 'agitado', '😰'],
      ['p1', 'tranquilo', '😌'],
    ])
  })

  test('respeta el máximo y no modifica el original', () => {
    const original = [
      llegada('p1', 'tranquilo', 1),
      llegada('p2', 'tranquilo', 2),
      llegada('p3', 'tranquilo', 3),
    ]
    const copia = JSON.stringify(original)
    expect(llegadasRecientes({ ultimas_llegadas: original }, 2)).toHaveLength(2)
    expect(JSON.stringify(original)).toBe(copia)
  })

  test('ignora respuestas que no son del catálogo y expedientes ausentes', () => {
    expect(
      llegadasRecientes({ ultimas_llegadas: [llegada('p1', 'feliz', 1)] })
    ).toEqual([])
    expect(llegadasRecientes(undefined)).toEqual([])
  })
})

describe('cantidadPorRevisar', () => {
  test('cuenta los aprendizajes sensibles que esperan al tutor', () => {
    const item = (clave: string) => ({ clave }) as any
    expect(
      cantidadPorRevisar({
        resumen: { por_confirmar: [item('a'), item('b')] } as any,
      })
    ).toBe(2)
  })

  test('sin expediente o sin pendientes es cero', () => {
    expect(cantidadPorRevisar(undefined)).toBe(0)
    expect(cantidadPorRevisar({ resumen: { por_confirmar: [] } as any })).toBe(
      0
    )
    expect(cantidadPorRevisar({ resumen: {} as any })).toBe(0)
  })
})
