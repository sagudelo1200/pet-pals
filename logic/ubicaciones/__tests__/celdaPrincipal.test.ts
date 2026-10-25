/* eslint-env jest */
import { celdaPrincipalDe } from '../celdaPrincipal'
import { coordsAH3 } from '@/services/geo/h3Utils'

const CELDA = coordsAH3(4.6486, -74.0628)
const coordenadas = { latitude: 4.6486, longitude: -74.0628 }

describe('celdaPrincipalDe', () => {
  it('usa la celda guardada en la ubicación principal', () => {
    expect(
      celdaPrincipalDe({
        ubicaciones: [
          { ubicacion_id: 'a', es_principal: false, h3_r8: 'otra' },
          { ubicacion_id: 'b', es_principal: true, h3_r8: CELDA },
        ],
      })
    ).toBe(CELDA)
  })

  it('reconoce la principal también por su id', () => {
    expect(
      celdaPrincipalDe({
        id_ubicacion_principal: 'b',
        ubicaciones: [
          { ubicacion_id: 'a', h3_r8: 'otra' },
          { ubicacion_id: 'b', h3_r8: CELDA },
        ],
      })
    ).toBe(CELDA)
  })

  it('en datos viejos, sin celda guardada, la calcula de las coordenadas', () => {
    expect(
      celdaPrincipalDe({
        ubicaciones: [{ ubicacion_id: 'b', es_principal: true, coordenadas }],
      })
    ).toBe(CELDA)
  })

  it('sin dirección principal, o sin datos, no hay celda', () => {
    expect(celdaPrincipalDe({ ubicaciones: [{ ubicacion_id: 'a' }] })).toBeNull()
    expect(
      celdaPrincipalDe({
        ubicaciones: [{ ubicacion_id: 'a', es_principal: true }],
      })
    ).toBeNull()
    expect(celdaPrincipalDe({})).toBeNull()
    expect(celdaPrincipalDe(null)).toBeNull()
    expect(celdaPrincipalDe(undefined)).toBeNull()
  })
})
