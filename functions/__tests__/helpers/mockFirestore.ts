/**
 * Mock en memoria de Firestore (Admin SDK) para tests unitarios de las
 * Cloud Functions de evaluaciones.
 *
 * NO es una réplica fiel del SDK: cubre solo las operaciones que usan las CFs:
 * - doc().get() / create() / set() / update() / collection()
 * - collection().where().get() (con filtros '==' e 'in')
 * - batch().set/update/delete/commit (no usado por las CFs actuales, por completitud)
 *
 * El mismo objeto `db` persiste durante todo el archivo de test; cada test debe
 * llamar `db.__reset()` en beforeEach y sembrar datos con `db.__seed(path, data)`.
 */

export interface MockDocSnap {
  exists: boolean
  data: () => Record<string, unknown> | undefined
}

function errorConCodigo(code: string, message: string): Error {
  const e = new Error(message) as Error & { code: string }
  e.code = code
  return e
}

function valorEnRuta(obj: unknown, ruta: string): unknown {
  return ruta
    .split('.')
    .reduce(
      (acc: unknown, k: string) =>
        acc == null ? undefined : (acc as Record<string, unknown>)[k],
      obj
    )
}

export function crearMockDb(): any {
  const docs = new Map<string, Record<string, unknown>>()

  const db: any = {
    __docs: docs,
    __seed(path: string, data: Record<string, unknown>): void {
      docs.set(path, { ...data })
    },
    __reset(): void {
      docs.clear()
    },
    doc(path: string) {
      const ref = {
        path,
        async get(): Promise<MockDocSnap> {
          return { exists: docs.has(path), data: () => docs.get(path) }
        },
        async create(data: Record<string, unknown>): Promise<void> {
          if (docs.has(path)) {
            throw errorConCodigo('already-exists', 'document already exists')
          }
          docs.set(path, { ...data })
        },
        async set(
          data: Record<string, unknown>,
          opts?: { merge?: boolean }
        ): Promise<void> {
          if (opts?.merge) {
            docs.set(path, { ...(docs.get(path) || {}), ...data })
          } else {
            docs.set(path, { ...data })
          }
        },
        async update(data: Record<string, unknown>): Promise<void> {
          if (!docs.has(path)) {
            throw errorConCodigo('not-found', 'document not found')
          }
          docs.set(path, { ...docs.get(path)!, ...data })
        },
        collection(sub: string) {
          return db.collection(`${path}/${sub}`)
        },
      }
      return ref
    },
    collection(path: string) {
      const filtros: Array<{ campo: string; op: string; valor: unknown }> = []
      const queryObj = {
        path,
        doc(id: string) {
          return db.doc(`${path}/${id}`)
        },
        where(campo: string, op: string, valor: unknown) {
          filtros.push({ campo, op, valor })
          return queryObj
        },
        // Agregación count(): reutiliza los mismos filtros de la query
        count() {
          return {
            get: async () => {
              const snap = await queryObj.get()
              return { data: () => ({ count: snap.docs.length }) }
            },
          }
        },
        async get() {
          const prefix = `${path}/`
          const resultado: Array<{
            id: string
            data: () => Record<string, unknown>
          }> = []
          for (const [p, data] of docs) {
            if (!p.startsWith(prefix)) continue
            const resto = p.slice(prefix.length)
            if (resto.includes('/')) continue // solo documentos directos
            const docObj = { id: resto, ...data }
            const cumple = filtros.every(f => {
              const v = valorEnRuta(docObj, f.campo)
              if (f.op === '==') return v === f.valor
              if (f.op === 'in')
                return (
                  Array.isArray(f.valor) &&
                  (f.valor as unknown[]).includes(v)
                )
              return true
            })
            if (cumple) resultado.push({ id: resto, data: () => data })
          }
          return { docs: resultado }
        },
      }
      return queryObj
    },
    batch() {
      const ops: Array<() => void> = []
      return {
        set(ref: any, data: Record<string, unknown>, opts?: { merge?: boolean }) {
          ops.push(() => ref.set(data, opts))
        },
        update(ref: any, data: Record<string, unknown>) {
          ops.push(() => ref.update(data))
        },
        delete(ref: any) {
          ops.push(() => {
            docs.delete(ref.path)
          })
        },
        async commit() {
          for (const op of ops) op()
        },
      }
    },
  }

  return db
}

export const MOCK_TIMESTAMP = {
  now: () => ({ seconds: 1_700_000_000, nanoseconds: 0, __mock: 'Timestamp.now' }),
}

export const MOCK_FIELD_VALUE = {
  serverTimestamp: () => ({ __mock: 'serverTimestamp' }),
  delete: () => ({ __mock: 'FieldValue.delete' }),
}
