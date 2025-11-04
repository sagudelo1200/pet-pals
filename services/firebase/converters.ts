import { Timestamp, serverTimestamp, type FieldValue } from 'firebase/firestore'

// Type guards
export function isFirestoreTimestamp(value: unknown): value is Timestamp {
  return (
    !!value &&
    typeof value === 'object' &&
    // @ts-ignore
    typeof (value as any).toDate === 'function' &&
    // @ts-ignore
    typeof (value as any).toMillis === 'function'
  )
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date
}

// Deep converters
export function toDomain<T = any>(input: any): T {
  if (input == null) return input as T

  if (Array.isArray(input)) {
    return input.map(item => toDomain(item)) as unknown as T
  }

  if (isFirestoreTimestamp(input)) {
    return input.toDate() as unknown as T
  }

  if (typeof input === 'object') {
    const out: any = {}
    for (const [k, v] of Object.entries(input)) {
      if (isFirestoreTimestamp(v)) {
        out[k] = (v as Timestamp).toDate()
      } else if (Array.isArray(v)) {
        out[k] = v.map(item => toDomain(item))
      } else if (v && typeof v === 'object') {
        out[k] = toDomain(v)
      } else {
        out[k] = v
      }
    }
    return out as T
  }

  return input as T
}

export function toDb<T = any>(input: any): T {
  if (input == null) return input as T

  if (Array.isArray(input)) {
    return input.map(item => toDb(item)) as unknown as T
  }

  if (isDate(input)) {
    return Timestamp.fromDate(input) as unknown as T
  }

  if (typeof input === 'object') {
    const out: any = {}
    for (const [k, v] of Object.entries(input)) {
      if (isDate(v)) {
        out[k] = Timestamp.fromDate(v as Date)
      } else if (Array.isArray(v)) {
        out[k] = v.map(item => toDb(item))
      } else if (v && typeof v === 'object') {
        out[k] = toDb(v)
      } else {
        out[k] = v
      }
    }
    return out as T
  }

  return input as T
}

export const nowServerTimestamp = (): FieldValue => serverTimestamp()

export type { Timestamp } from 'firebase/firestore'
