import * as admin from 'firebase-admin'

type UsuarioData = {
  nombre?: string | null
  foto?: string | null
  verificado?: boolean | null
}

/**
 * Small helper: if `v` is an object, return it as a record.
 * Otherwise returns `undefined`.
 */
function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined
}

/**
 * Parse a Firestore 'Value' node or plain JS value into
 * a primitive or object.
 */
function parseFirestoreValue(v: unknown): unknown {
  if (v == null) return null
  if (typeof v !== 'object') return v
  const obj = v as Record<string, unknown>
  if ('stringValue' in obj) return obj.stringValue as string
  if ('booleanValue' in obj) return obj.booleanValue as boolean
  if ('integerValue' in obj) return Number(obj.integerValue as unknown)
  if ('doubleValue' in obj) return Number(obj.doubleValue as unknown)
  if ('nullValue' in obj) return null
  const mapVal = asRecord(obj.mapValue)?.fields
  if (mapVal && typeof mapVal === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(mapVal)) {
      out[k] = parseFirestoreValue((mapVal as Record<string, unknown>)[k])
    }
    return out
  }
  const arr = asRecord(obj.arrayValue)?.values as unknown[] | undefined
  if (Array.isArray(arr)) return arr.map(parseFirestoreValue)
  return undefined
}

/**
 * Extract plain fields from a Firestore event payload.
 * Supports DocumentSnapshot-like (`data.data()`) and CloudEvent proto.
 * @param event Incoming trigger event
 * @return Plain object with extracted fields
 */
export function extraerDatosUsuarioDesdeEvento(
  event: unknown
): Record<string, unknown> {
  const evt = event as unknown as Record<string, unknown>
  const data = asRecord(evt)?.data ?? evt
  if (!data) return {}

  const maybeSnapshot = asRecord(data)?.data
  if (typeof maybeSnapshot === 'function') {
    try {
      const res = (maybeSnapshot as () => unknown)()
      return (res as Record<string, unknown>) ?? {}
    } catch {
      return {}
    }
  }

  const value = (asRecord(data)?.value ?? data) as unknown
  const fields = asRecord(value)?.fields ?? value
  if (!fields || typeof fields !== 'object') return {}

  const out: Record<string, unknown> = {}
  const fieldsObj = asRecord(fields) ?? {}
  for (const k of Object.keys(fieldsObj)) {
    out[k] = parseFirestoreValue((fieldsObj as Record<string, unknown>)[k])
  }
  return out
}

/**
 * Extract `before` and `after` plain objects from an update event.
 * @param event Trigger event
 * @return Object with before/after fields
 */
export function extraerAntesYDespuesDesdeEvento(event: unknown): {
  antes: Record<string, unknown>
  despues: Record<string, unknown>
} {
  const evt = event as unknown as Record<string, unknown>
  const data = asRecord(evt)?.data ?? evt
  if (!data) return { antes: {}, despues: {} }

  const resolve = (obj: unknown): Record<string, unknown> => {
    if (!obj) return {}
    const maybeSnapshot = asRecord(obj)?.data
    if (typeof maybeSnapshot === 'function') {
      try {
        return (maybeSnapshot as () => unknown)() as Record<string, unknown>
      } catch {
        return {}
      }
    }
    const value = (asRecord(obj)?.value ?? obj) as unknown
    const fields = asRecord(value)?.fields ?? value
    if (!fields || typeof fields !== 'object') return {}
    const out: Record<string, unknown> = {}
    const fieldsObj = asRecord(fields) ?? {}
    for (const k of Object.keys(fieldsObj)) {
      out[k] = parseFirestoreValue((fieldsObj as Record<string, unknown>)[k])
    }
    return out
  }

  const antes = resolve(
    (asRecord(data)?.before ??
      asRecord(data)?.oldValue ??
      asRecord(data)?.old) as unknown
  )
  const despues = resolve(
    (asRecord(data)?.after ??
      asRecord(data)?.value ??
      asRecord(data)?.new) as unknown
  )
  return { antes, despues }
}

/**
 * Construye el objeto de actualización para el `perfil_publico`.
 * Devuelve `null` si no hay campos a actualizar.
 * @param nuevo Partial changes
 * @param uid User ID
 * @return Update object or null
 */
export function construirActualizacion(
  nuevo: Partial<UsuarioData>,
  uid: string
): Record<string, unknown> | null {
  const actualizar: Record<string, unknown> = {}
  if (Object.prototype.hasOwnProperty.call(nuevo, 'nombre')) {
    actualizar.nombre = nuevo.nombre ?? null
  }
  if (Object.prototype.hasOwnProperty.call(nuevo, 'foto')) {
    actualizar.foto = nuevo.foto ?? null
  }
  if (Object.prototype.hasOwnProperty.call(nuevo, 'verificado')) {
    actualizar.verificacion =
      nuevo.verificado === true ? 'verificado' : 'pendiente'
  }
  if (Object.keys(actualizar).length === 0) return null

  const af = admin.firestore as unknown as Record<string, unknown>
  const FieldValue = af?.FieldValue
  const TimestampObj = af?.Timestamp
  let ts: unknown
  if (
    FieldValue &&
    typeof (FieldValue as { serverTimestamp?: unknown }).serverTimestamp ===
      'function'
  ) {
    const serverTimestampFn = (
      FieldValue as { serverTimestamp?: () => unknown }
    ).serverTimestamp
    ts = serverTimestampFn ? serverTimestampFn() : undefined
  } else if (
    TimestampObj &&
    typeof (TimestampObj as { now?: unknown }).now === 'function'
  ) {
    const nowFn = (TimestampObj as { now?: () => unknown }).now
    ts = nowFn ? nowFn() : undefined
  } else {
    ts = new Date()
  }
  actualizar.actualizado_en = ts
  actualizar.actualizado_por = uid
  return actualizar
}
