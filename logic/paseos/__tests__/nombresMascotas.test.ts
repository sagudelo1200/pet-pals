/* eslint-env jest */
import { listarNombres, nombresDeMascotas } from '../nombresMascotas'

describe('listarNombres', () => {
  test('una mascota', () => {
    expect(listarNombres(['Max'])).toBe('Max')
  })

  test('dos mascotas', () => {
    expect(listarNombres(['Max', 'Luna'])).toBe('Max y Luna')
  })

  test('tres o más mascotas', () => {
    expect(listarNombres(['Max', 'Luna', 'Rocky'])).toBe('Max, Luna y Rocky')
    expect(listarNombres(['A', 'B', 'C', 'D'])).toBe('A, B, C y D')
  })

  test('sin mascotas devuelve vacío y descarta nombres vacíos', () => {
    expect(listarNombres([])).toBe('')
    expect(listarNombres(['', 'Max', '  '])).toBe('Max')
  })
})

describe('nombresDeMascotas', () => {
  test('aplana las mascotas de todos los tutores en orden', () => {
    expect(
      nombresDeMascotas([
        { mascotas: [{ nombre: 'Max' }, { nombre: 'Luna' }] },
        { mascotas: [{ nombre: 'Rocky' }] },
      ])
    ).toEqual(['Max', 'Luna', 'Rocky'])
  })

  test('sin tutores devuelve lista vacía', () => {
    expect(nombresDeMascotas([])).toEqual([])
  })
})
