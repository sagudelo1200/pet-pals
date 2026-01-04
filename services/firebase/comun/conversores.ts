import {
  Timestamp,
  serverTimestamp,
  type FieldValue,
  GeoPoint,
} from 'firebase/firestore'
import { serverTimestamp as rtdbServerTimestamp } from 'firebase/database'

// Comprobaciones de tipo
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

export function isFirestoreGeoPoint(value: unknown): value is GeoPoint {
  return (
    !!value &&
    typeof value === 'object' &&
    (typeof (value as any).latitude === 'number' ||
      typeof (value as any)._lat === 'number')
  )
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date
}

export function isPlainObject(value: unknown): value is Record<string, any> {
  return (
    !!value &&
    typeof value === 'object' &&
    Object.prototype.toString.call(value) === '[object Object]'
  )
}

/**
 * Convierte un GeoPoint o un objeto con lat/lng a un objeto de coordenadas estándar {latitude, longitude}.
 */
export function geoPointToCoords(
  gp: any
): { latitude: number; longitude: number } | undefined {
  if (!gp) return undefined
  if (gp.latitude !== undefined && gp.longitude !== undefined)
    return { latitude: gp.latitude, longitude: gp.longitude }
  if (gp.lat !== undefined && gp.lng !== undefined)
    return { latitude: gp.lat, longitude: gp.lng }
  return undefined
}

/**
 * Convierte un objeto de coordenadas a un GeoPoint de Firestore.
 */
export function coordsToGeoPoint(
  coords:
    | { latitude?: number; longitude?: number }
    | { lat?: number; lng?: number }
) {
  const lat = (coords as any).latitude ?? (coords as any).lat
  const lng = (coords as any).longitude ?? (coords as any).lng
  return new GeoPoint(lat || 0, lng || 0)
}

// Conversores genéricos
export function toDomain<T = any>(input: any): T {
  if (input == null) return input as T

  if (Array.isArray(input)) {
    return input.map(item => toDomain(item)) as unknown as T
  }

  // Convertir Timestamp a Date
  if (isFirestoreTimestamp(input)) {
    return input.toDate() as unknown as T
  }

  // Convertir GeoPoint a objeto plano {latitude, longitude}
  if (isFirestoreGeoPoint(input)) {
    const gp = input as any
    return {
      latitude: gp.latitude ?? gp._lat,
      longitude: gp.longitude ?? gp._long,
    } as unknown as T
  }

  // Solo recorrer objetos llanos. Evita transformar sentinelas de Firestore
  // (FieldValue), DocumentReference, etc.
  if (isPlainObject(input)) {
    const out: any = {}
    for (const [k, v] of Object.entries(input)) {
      if (isFirestoreTimestamp(v)) {
        out[k] = (v as Timestamp).toDate()
      } else if (isFirestoreGeoPoint(v)) {
        const gp = v as any
        out[k] = {
          latitude: gp.latitude ?? gp._lat,
          longitude: gp.longitude ?? gp._long,
        }
      } else if (Array.isArray(v)) {
        out[k] = v.map(item => toDomain(item))
      } else if (isPlainObject(v)) {
        out[k] = toDomain(v)
      } else {
        // Para objetos no llanos (sentinelas FieldValue, DocumentReference, ...)
        // conservar el valor tal cual; el consumidor puede manejarlo si es necesario.
        out[k] = v
      }
    }
    return out as T
  }

  return input as T
}

export function toDb<T = any>(input: any): T {
  if (input === undefined) return undefined as any
  if (input === null) return null as any

  if (Array.isArray(input)) {
    return input
      .map(item => toDb(item))
      .filter(item => item !== undefined) as unknown as T
  }

  if (isDate(input)) {
    return Timestamp.fromDate(input) as unknown as T
  }

  // Convertir objetos con latitude/longitude a GeoPoint
  // Solo acepta el formato estándar: {latitude, longitude}
  if (isPlainObject(input)) {
    const coords = input as any
    if (coords.latitude !== undefined && coords.longitude !== undefined) {
      if (
        typeof coords.latitude === 'number' &&
        typeof coords.longitude === 'number'
      ) {
        return new GeoPoint(coords.latitude, coords.longitude) as unknown as T
      }
    }
  }

  // Solo recorrer objetos llanos. Evita transformar sentinelas de Firestore
  // (`serverTimestamp()`, `increment()`, etc.) que no deben modificarse.
  if (isPlainObject(input)) {
    const out: any = {}
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined) continue
      if (v === null) {
        out[k] = null
        continue
      }

      if (isDate(v)) {
        out[k] = Timestamp.fromDate(v as Date)
      } else if (Array.isArray(v)) {
        out[k] = v.map(item => toDb(item)).filter(item => item !== undefined)
      } else if (isPlainObject(v)) {
        const coords = v as any
        // Solo convertir a GeoPoint si tiene latitude/longitude (formato estándar)
        if (coords.latitude !== undefined && coords.longitude !== undefined) {
          if (
            typeof coords.latitude === 'number' &&
            typeof coords.longitude === 'number'
          ) {
            out[k] = new GeoPoint(coords.latitude, coords.longitude)
            continue
          }
        }
        // Si no es coordenada, procesar como objeto normal
        out[k] = toDb(v)
      } else {
        // Para objetos no llanos (FieldValue, DocumentReference, ...), conservar tal cual
        out[k] = v
      }
    }
    return out as T
  }

  return input as T
}

export const nowServerTimestamp = (): FieldValue => serverTimestamp()

/**
 * Retorna el marcador de posición para el timestamp del servidor en Realtime Database.
 */
export const ahoraRealtime = () => rtdbServerTimestamp()

export type { Timestamp } from 'firebase/firestore'
