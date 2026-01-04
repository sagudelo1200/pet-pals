/* eslint-env jest */
import {
  agregarUbicacionRef,
  fijarPrincipalRef,
  eliminarUbicacionRef,
} from '../referencias'
import { UbicacionRef } from '@/models/Ubicacion'

describe('Ubicaciones Referencias', () => {
  const mockRefs: UbicacionRef[] = [
    {
      ubicacion_id: 'u1',
      es_principal: true,
      alias: 'Casa',
      desde: new Date(),
    },
  ]

  test('agregarUbicacionRef marca como principal si es la primera', () => {
    const { lista, idPrincipal } = agregarUbicacionRef([], 'u1', 'Casa')
    expect(lista).toHaveLength(1)
    expect(lista[0].es_principal).toBe(true)
    expect(idPrincipal).toBe('u1')
  })

  test('agregarUbicacionRef no marca como principal si ya hay otras', () => {
    const { lista, idPrincipal } = agregarUbicacionRef(
      mockRefs,
      'u2',
      'Trabajo'
    )
    expect(lista).toHaveLength(2)
    expect(lista[1].es_principal).toBe(false)
    expect(idPrincipal).toBe('u1')
  })

  test('agregarUbicacionRef evita duplicados', () => {
    const { lista } = agregarUbicacionRef(mockRefs, 'u1')
    expect(lista).toHaveLength(1)
  })

  test('fijarPrincipalRef cambia la principal correctamente', () => {
    const refs = [
      ...mockRefs,
      {
        ubicacion_id: 'u2',
        es_principal: false,
        alias: 'X',
        desde: new Date(),
      },
    ]
    const { lista, idPrincipal } = fijarPrincipalRef(refs, 'u2')
    expect(idPrincipal).toBe('u2')
    expect(lista.find(u => u.ubicacion_id === 'u1')?.es_principal).toBe(false)
    expect(lista.find(u => u.ubicacion_id === 'u2')?.es_principal).toBe(true)
  })

  test('eliminarUbicacionRef asigna nueva principal si se borra la actual', () => {
    const refs = [
      { ubicacion_id: 'u1', es_principal: true, alias: 'A', desde: new Date() },
      {
        ubicacion_id: 'u2',
        es_principal: false,
        alias: 'B',
        desde: new Date(),
      },
    ]
    const { lista, idPrincipal } = eliminarUbicacionRef(refs, 'u1')
    expect(lista).toHaveLength(1)
    expect(lista[0].ubicacion_id).toBe('u2')
    expect(lista[0].es_principal).toBe(true)
    expect(idPrincipal).toBe('u2')
  })
})
