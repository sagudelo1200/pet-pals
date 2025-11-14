/* eslint-env jest */
import {
  toDomain,
  toDb,
  isFirestoreTimestamp,
} from '@/services/firebase/converters'
import { Timestamp } from 'firebase/firestore'

describe('convertidores - unitario', () => {
  // Verifica que isFirestoreTimestamp detecte objetos que implementan toDate/toMillis
  test('isFirestoreTimestamp detecta objetos con toDate y toMillis', () => {
    const fake = { toDate: () => new Date(), toMillis: () => 123 }
    expect(isFirestoreTimestamp(fake)).toBe(true)
  })

  // Comprueba que toDomain transforma timestamps (incluidos en arrays/objetos) a Date
  test('toDomain convierte timestamps a Date recursivamente', () => {
    const fakeTimestamp = {
      toDate: () => new Date('2020-01-01T00:00:00.000Z'),
      toMillis: () => 0,
    }
    const input = {
      createdAt: fakeTimestamp,
      nested: { arr: [fakeTimestamp] },
      name: 'Fido',
    }
    const out = toDomain(input as any)
    expect(out.name).toBe('Fido')
    expect(out.createdAt instanceof Date).toBe(true)
    expect((out.createdAt as Date).toISOString()).toBe(
      '2020-01-01T00:00:00.000Z'
    )
    expect(Array.isArray(out.nested.arr)).toBe(true)
    expect(out.nested.arr[0] instanceof Date).toBe(true)
  })

  // Asegura que toDb convierte Date a Timestamp de Firestore (roundtrip)
  test('toDb convierte Date a Timestamp de Firestore', () => {
    const d = new Date('2021-06-01T12:00:00.000Z')
    const out = toDb({ when: d }) as any
    // Esperar instancia de Timestamp de firebase
    expect(out.when).toBeInstanceOf(Timestamp)
    // Y el roundtrip a Date coincide con el original (via toDate())
    expect((out.when as Timestamp).toDate().toISOString()).toBe(d.toISOString())
  })
})
