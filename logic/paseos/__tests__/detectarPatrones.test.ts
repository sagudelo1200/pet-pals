/* eslint-env jest */
import {
  detectarPatron,
  mascotasDelEvento,
  sonDelMismoHilo,
} from '../detectarPatrones'
import type { EventoPaseo } from '@/models/Paseo'

const evento = (accion: string, mascota_ids?: string[]): EventoPaseo =>
  ({
    tipoEvento: 'bitacora',
    payload: { accion, ...(mascota_ids && { mascota_ids }) },
  }) as any

describe('mascotasDelEvento / sonDelMismoHilo', () => {
  test('sin mascota_ids es del grupo completo', () => {
    expect(mascotasDelEvento(evento('juego'))).toEqual([])
    expect(mascotasDelEvento(evento('juego', ['m1']))).toEqual(['m1'])
  })

  test('mismo hilo si alguno es del grupo o comparten mascota', () => {
    expect(sonDelMismoHilo(evento('a'), evento('b', ['m1']))).toBe(true)
    expect(
      sonDelMismoHilo(evento('a', ['m1']), evento('b', ['m1', 'm2']))
    ).toBe(true)
    expect(sonDelMismoHilo(evento('a', ['m1']), evento('b', ['m2']))).toBe(
      false
    )
  })
})

describe('detectarPatron con varios perros', () => {
  test('el patrón de un perro no se mezcla con las acciones de otro', () => {
    // m1 jugó, luego m2 descansó: no es "juego_descanso" de nadie
    const patron = detectarPatron(evento('descanso', ['m2']), [
      evento('juego', ['m1']),
    ])
    expect(patron).toBeNull()
  })

  test('detecta el patrón cuando es del mismo perro', () => {
    const patron = detectarPatron(evento('descanso', ['m1']), [
      evento('juego', ['m2']),
      evento('juego', ['m1']),
    ])
    expect(patron).toBe('juego_descanso')
  })

  test('un evento del grupo completo cuenta para todos', () => {
    const patron = detectarPatron(evento('descanso', ['m1']), [evento('juego')])
    expect(patron).toBe('juego_descanso')
  })

  test('paseos de un solo perro o eventos antiguos se comportan como antes', () => {
    expect(detectarPatron(evento('descanso'), [evento('tomo_agua')])).toBe(
      'agua_descanso'
    )
    expect(
      detectarPatron(evento('descanso', ['m1']), [evento('tomo_agua', ['m1'])])
    ).toBe('agua_descanso')
  })
})
