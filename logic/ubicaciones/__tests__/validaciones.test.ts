/* eslint-env jest */
import {
  validarPayload,
  esCoordenadaValida,
} from '@/logic/ubicaciones/validaciones'

const validPayload: any = {
  proveedor: 'google',
  proveedor_place_id: 'place_123',
  direccion_formateada: 'Calle 1 #2-3',
  coordenadas: { latitude: 4.65, longitude: -74.06 },
}

describe('esCoordenadaValida', () => {
  it('debe validar coordenadas correctas {latitude, longitude}', () => {
    expect(esCoordenadaValida({ latitude: 4, longitude: -74 })).toBe(true)
  })

  it('debe validar coordenadas correctas {lat, lng}', () => {
    expect(esCoordenadaValida({ lat: 4, lng: -74 })).toBe(true)
  })

  it('debe rechazar coordenadas fuera de rango', () => {
    expect(esCoordenadaValida({ lat: 91, lng: 0 })).toBe(false)
    expect(esCoordenadaValida({ lat: 0, lng: 181 })).toBe(false)
  })

  it('debe rechazar valores no numéricos', () => {
    expect(esCoordenadaValida({ lat: '4' as any, lng: -74 })).toBe(false)
  })

  it('debe rechazar undefined/null', () => {
    expect(esCoordenadaValida(undefined)).toBe(false)
  })
})

describe('validarPayload - ubicaciones', () => {
  it('debe devolver null para payload válido', () => {
    expect(validarPayload(validPayload)).toBeNull()
  })

  it('debe detectar proveedor inválido', () => {
    const p = { ...validPayload, proveedor: 'otro' }
    expect(validarPayload(p)).toBe('PROVEEDOR_INVALIDO')
  })

  it('debe requerir proveedor_place_id', () => {
    const p = { ...validPayload, proveedor_place_id: '' }
    expect(validarPayload(p)).toBe('PROVEEDOR_O_PLACE_ID_REQUERIDO')
  })

  it('debe requerir coordenadas', () => {
    const p = { ...validPayload, coordenadas: undefined }
    expect(validarPayload(p)).toBe('COORDENADAS_REQUERIDAS')
  })

  it('debe validar formato de direccion', () => {
    const p = { ...validPayload, direccion_formateada: '   ' }
    expect(validarPayload(p)).toBe('DIRECCION_FORMATO_REQUERIDO')
  })

  it('debe detectar componentes demasiado grandes si raw es array largo', () => {
    const componentes = new Array(201).fill({
      long_name: 'X',
      types: ['route'],
    })
    const p = { ...validPayload, componentes_raw: componentes }
    expect(validarPayload(p)).toBe('COMPONENTES_TOO_LARGE')
  })
})
