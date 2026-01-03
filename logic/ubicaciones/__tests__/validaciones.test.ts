/* eslint-env jest */
import { validarPayload } from '@/logic/ubicaciones/validaciones'

const validPayload: any = {
  proveedor: 'google',
  proveedor_place_id: 'place_123',
  direccion_formateada: 'Calle 1 #2-3',
  coordenadas: { latitude: 4.65, longitude: -74.06 },
}

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
