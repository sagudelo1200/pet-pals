/* eslint-env jest */
import {
  MAX_CELDAS_CONSULTA,
  celdasDeSolicitudes,
  ordenarSolicitudes,
} from '../solicitudes'
import { celdasDeCobertura, coordsAH3 } from '@/services/geo/h3Utils'

const CASA = coordsAH3(4.6486, -74.0628)
// Un vecino inmediato de la casa y una celda a 3 anillos de distancia
const CERCA = celdasDeCobertura(CASA, 1).find(c => c !== CASA) as string
const LEJOS = celdasDeCobertura(CASA, 3).find(
  c => !celdasDeCobertura(CASA, 2).includes(c)
) as string

describe('celdasDeSolicitudes', () => {
  it('por defecto usa el área de cobertura alrededor de su casa, la casa primero', () => {
    const celdas = celdasDeSolicitudes({ h3_r8: CASA })
    expect(celdas[0]).toBe(CASA)
    expect(new Set(celdas)).toEqual(new Set(celdasDeCobertura(CASA)))
  })

  it('si eligió celdas manualmente, usa esas (y siempre incluye su casa)', () => {
    const celdas = celdasDeSolicitudes({
      h3_r8: CASA,
      celdas_cobertura: [CERCA, LEJOS],
    })
    expect(celdas).toEqual([CASA, CERCA, LEJOS])
  })

  it('nunca pasa del máximo de una consulta, dejando las más cercanas', () => {
    const muchas = celdasDeCobertura(CASA, 4) // 61 celdas
    expect(muchas.length).toBeGreaterThan(MAX_CELDAS_CONSULTA)
    const celdas = celdasDeSolicitudes({ h3_r8: CASA, celdas_cobertura: muchas })
    expect(celdas).toHaveLength(MAX_CELDAS_CONSULTA)
    expect(celdas[0]).toBe(CASA)
  })

  it('sin casa y sin celdas no hay nada que consultar', () => {
    expect(celdasDeSolicitudes({})).toEqual([])
  })
})

describe('ordenarSolicitudes', () => {
  const solicitud = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    creado_por: 'tutor',
    h3_r8: CERCA,
    creado_en: new Date(2030, 0, 1),
    ...extra,
  })

  it('primero las dirigidas a él, luego las más cercanas, luego las más nuevas', () => {
    const lista = ordenarSolicitudes(
      [
        solicitud('lejos', { h3_r8: LEJOS }),
        solicitud('cerca_vieja'),
        solicitud('cerca_nueva', { creado_en: new Date(2030, 0, 5) }),
        solicitud('mia', { id_cuidador: 'yo', h3_r8: LEJOS }),
      ],
      'yo',
      CASA
    )
    expect(lista.map(s => s.id)).toEqual([
      'mia',
      'cerca_nueva',
      'cerca_vieja',
      'lejos',
    ])
  })

  it('quita las que creó él mismo y las dirigidas a otro cuidador', () => {
    const lista = ordenarSolicitudes(
      [
        solicitud('propia', { creado_por: 'yo' }),
        solicitud('de_otro', { id_cuidador: 'otro' }),
        solicitud('abierta'),
      ],
      'yo',
      CASA
    )
    expect(lista.map(s => s.id)).toEqual(['abierta'])
  })

  it('una solicitud que llega por la zona y como dirigida sale una sola vez', () => {
    const lista = ordenarSolicitudes(
      [solicitud('x', { id_cuidador: 'yo' }), solicitud('x', { id_cuidador: 'yo' })],
      'yo',
      CASA
    )
    expect(lista).toHaveLength(1)
  })

  it('sin celda en la solicitud queda después de las que sí tienen', () => {
    const lista = ordenarSolicitudes(
      [solicitud('sin_celda', { h3_r8: undefined }), solicitud('lejos', { h3_r8: LEJOS })],
      'yo',
      CASA
    )
    expect(lista.map(s => s.id)).toEqual(['lejos', 'sin_celda'])
  })

  it('no modifica la lista original', () => {
    const original = [solicitud('b', { h3_r8: LEJOS }), solicitud('a')]
    const copia = original.map(s => s.id)
    ordenarSolicitudes(original, 'yo', CASA)
    expect(original.map(s => s.id)).toEqual(copia)
  })
})
