import * as admin from 'firebase-admin'

type UsuarioData = {
  nombre?: string | null
  foto?: string | null
  verificado?: boolean | null
}

type PerfilPublico = {
  id: string
  nombre: string | null
  foto: string | null
  verificacion: 'verificado' | 'pendiente'
  rating_promedio: number
  cantidad_paseos_realizados: number
  creado_en: admin.firestore.FieldValue
  actualizado_en: admin.firestore.FieldValue
  creado_por: string
  actualizado_por: string
}

/**
 * Construye el objeto base para el `perfil_publico` de un usuario.
 * @param {string} uid UID del usuario
 * @param {UsuarioData} usuarioData Datos del documento de usuario
 * @return {PerfilPublico} Objeto listo para persistir en
 * `perfiles_publicos/{uid}`
 */
export function construirDatosPerfil(
  uid: string,
  usuarioData: UsuarioData
): PerfilPublico {
  // Obtener serverTimestamp de forma segura: algunos entornos (emulador)
  // pueden no exponer `FieldValue` exactamente igual; usamos un fallback
  // a `Timestamp.now()` o `new Date()` si es necesario.
  const FieldValue = (admin.firestore as any)?.FieldValue
  const TimestampObj = (admin.firestore as any)?.Timestamp
  const ts =
    FieldValue && typeof FieldValue.serverTimestamp === 'function'
      ? FieldValue.serverTimestamp()
      : TimestampObj && typeof TimestampObj.now === 'function'
        ? TimestampObj.now()
        : new Date()

  return {
    id: uid,
    nombre: usuarioData?.nombre ?? null,
    foto: usuarioData?.foto ?? null,
    verificacion: usuarioData?.verificado ? 'verificado' : 'pendiente',
    rating_promedio: 0,
    cantidad_paseos_realizados: 0,
    creado_en: ts,
    actualizado_en: ts,
    creado_por: uid,
    actualizado_por: uid,
  }
}

/**
 * Construye el objeto de actualización para el `perfil_publico`.
 * Devuelve `null` si no hay campos a actualizar.
 * @param {Partial<UsuarioData>} nuevo Datos nuevos del documento de usuario
 * @param {string} uid UID del usuario
 * @return {Record<string, unknown> | null} Objeto con los campos a actualizar
 * o `null`
 */
export function construirActualizacion(
  nuevo: Partial<UsuarioData>,
  uid: string
): Record<string, unknown> | null {
  const actualizar: Record<string, unknown> = {}

  if ('nombre' in nuevo) {
    actualizar.nombre = nuevo.nombre ?? null
  }

  if ('foto' in nuevo) {
    actualizar.foto = nuevo.foto ?? null
  }

  if ('verificado' in nuevo) {
    actualizar.verificacion = nuevo.verificado ? 'verificado' : 'pendiente'
  }

  if (Object.keys(actualizar).length === 0) {
    return null
  }
  const FieldValue = (admin.firestore as any)?.FieldValue
  const TimestampObj = (admin.firestore as any)?.Timestamp
  const ts =
    FieldValue && typeof FieldValue.serverTimestamp === 'function'
      ? FieldValue.serverTimestamp()
      : TimestampObj && typeof TimestampObj.now === 'function'
        ? TimestampObj.now()
        : new Date()
  actualizar.actualizado_en = ts
  actualizar.actualizado_por = uid
  return actualizar
}

/**
 * Extrae un objeto plano con campos desde un evento de Firestore.
 * Soporta DocumentSnapshot-like (`data.data()`) y CloudEvent proto (`data.value.fields`).
 */
export function extraerDatosUsuarioDesdeEvento(
  event: unknown
): Record<string, unknown> {
  const evt = event as any
  const data = evt?.data
  if (!data) return {}

  if (typeof data.data === 'function') {
    try {
      return (data.data() as Record<string, unknown>) ?? {}
    } catch (e) {
      return {}
    }
  }

  const value = data.value ?? data
  const fields = value.fields ?? value
  if (!fields || typeof fields !== 'object') return {}

  const parseValue = (fv: any): any => {
    if (fv == null) return null
    if (fv.stringValue !== undefined) return fv.stringValue
    if (fv.booleanValue !== undefined) return fv.booleanValue
    if (fv.integerValue !== undefined) return Number(fv.integerValue)
    if (fv.doubleValue !== undefined) return Number(fv.doubleValue)
    if (fv.nullValue !== undefined) return null
    if (fv.mapValue && fv.mapValue.fields) {
      const o: Record<string, any> = {}
      for (const k of Object.keys(fv.mapValue.fields))
        o[k] = parseValue(fv.mapValue.fields[k])
      return o
    }
    if (fv.arrayValue && Array.isArray(fv.arrayValue.values)) {
      return fv.arrayValue.values.map(parseValue)
    }
    return undefined
  }

  const out: Record<string, unknown> = {}
  for (const k of Object.keys(fields)) {
    out[k] = parseValue(fields[k])
  }
  return out
}

/**
 * Extrae `antes` y `despues` desde un evento de actualización de Firestore.
 * Devuelve objetos planos para ambos (pueden estar vacíos si no existen).
 */
export function extraerAntesYDespuesDesdeEvento(event: unknown): {
  antes: Record<string, unknown>
  despues: Record<string, unknown>
} {
  const evt = event as any
  const data = evt?.data
  if (!data) return { antes: {}, despues: {} }

  const tryExtract = (obj: any) => {
    if (!obj) return {}
    if (typeof obj.data === 'function') {
      try {
        return obj.data() as Record<string, unknown>
      } catch (e) {
        return {}
      }
    }
    const value = obj.value ?? obj
    const fields = value.fields ?? value
    if (!fields || typeof fields !== 'object') return {}
    const out: Record<string, unknown> = {}
    const parseValue = (fv: any): any => {
      if (fv == null) return null
      if (fv.stringValue !== undefined) return fv.stringValue
      if (fv.booleanValue !== undefined) return fv.booleanValue
      if (fv.integerValue !== undefined) return Number(fv.integerValue)
      if (fv.doubleValue !== undefined) return Number(fv.doubleValue)
      if (fv.nullValue !== undefined) return null
      if (fv.mapValue && fv.mapValue.fields) {
        const o: Record<string, any> = {}
        for (const k of Object.keys(fv.mapValue.fields))
          o[k] = parseValue(fv.mapValue.fields[k])
        return o
      }
      if (fv.arrayValue && Array.isArray(fv.arrayValue.values)) {
        return fv.arrayValue.values.map(parseValue)
      }
      return undefined
    }
    for (const k of Object.keys(fields)) out[k] = parseValue(fields[k])
    return out
  }

  const antes = tryExtract(data.before ?? data.oldValue ?? data.old)
  const despues = tryExtract(data.after ?? data.value ?? data.new)
  return { antes, despues }
}
