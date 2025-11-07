import { useCallback, useMemo, useState } from 'react'
import { ServicioCrudBase } from '@/services/firebase'
import type { BaseModel } from '@/models/BaseModel'
import type { CrudResult } from '@/services/firebase/types'
import { mapFirebaseError } from '@/services/firebase/errors'

/**
 * Hook fino para exponer un CRUD por colección basado en ServicioCrudBase.
 * - Centraliza cargando y error.
 * - Devuelve helpers tipados.
 */
export function useCrud<T extends BaseModel = any>(collectionName: string) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const wrap = useCallback(async <R>(fn: () => Promise<R>): Promise<R> => {
    setCargando(true)
    setError(undefined)
    try {
      return await fn()
    } catch (e: any) {
      setError(mapFirebaseError(e))
      throw e
    } finally {
      setCargando(false)
    }
  }, [])

  const acciones = useMemo(() => {
    return {
      crear: (
        data: Omit<
          T,
          | 'id'
          | 'creado_en'
          | 'actualizado_en'
          | 'creado_por'
          | 'actualizado_por'
        >
      ): Promise<CrudResult<T>> =>
        wrap(() => ServicioCrudBase.crear<T>(collectionName, data)),
      actualizar: (
        id: string,
        data: Partial<Omit<T, 'id' | 'creado_en' | 'creado_por'>>
      ): Promise<CrudResult<T>> =>
        wrap(() => ServicioCrudBase.actualizar<T>(collectionName, id, data)),
      eliminar: (id: string): Promise<CrudResult<boolean>> =>
        wrap(() => ServicioCrudBase.eliminar(collectionName, id)),
      obtenerPorId: (id: string): Promise<CrudResult<T>> =>
        wrap(() => ServicioCrudBase.obtenerPorId<T>(collectionName, id)),
      obtenerTodos: (): Promise<CrudResult<T[]>> =>
        wrap(() => ServicioCrudBase.obtenerTodos<T>(collectionName)),
      buscar: (field: string, value: any): Promise<CrudResult<T[]>> =>
        wrap(() => ServicioCrudBase.buscar<T>(collectionName, field, value)),
    }
  }, [collectionName, wrap])

  return { ...acciones, cargando, error }
}
