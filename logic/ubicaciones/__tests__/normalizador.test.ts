/* eslint-env jest */
import { normalizeComponentsForLATAM } from '../normalizador'

describe('Ubicaciones Normalizador', () => {
  test('normalizeComponentsForLATAM mapea correctamente componentes de Google', () => {
    const components = {
      country: 'Colombia',
      administrative_area_level_1: 'Bogotá',
      locality: 'Bogotá',
      sublocality: 'Usaquén',
      neighborhood: 'Cedritos',
      route: 'Calle 140',
      street_number: '10-20',
    }
    const normalized = normalizeComponentsForLATAM(components)
    expect(normalized.pais).toBe('Colombia')
    expect(normalized.departamento).toBe('Bogotá')
    expect(normalized.ciudad).toBe('Bogotá')
    expect(normalized.barrio).toBe('Cedritos')
    expect(normalized.numero).toBe('10-20')
  })

  test('devuelve objeto vacío si no hay componentes', () => {
    expect(normalizeComponentsForLATAM(undefined)).toEqual({})
  })
})
