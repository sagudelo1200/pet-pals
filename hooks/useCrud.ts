import { useCallback, useMemo, useState } from 'react'
import { BaseCrudService } from '@/services/firebase'
import type { BaseModel } from '@/models/BaseModel'
import type { CrudResult } from '@/services/firebase/types'

/**
 * Hook fino para exponer un CRUD por colección basado en BaseCrudService.
 * - Centraliza loading y error.
 * - Devuelve helpers tipados.
 */
export function useCrud<T extends BaseModel = any>(collectionName: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const wrap = useCallback(async <R>(fn: () => Promise<R>): Promise<R> => {
    setLoading(true)
    setError(undefined)
    try {
      return await fn()
    } catch (e: any) {
      setError(e?.message || 'UNKNOWN')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const actions = useMemo(() => {
    return {
      create: (
        data: Omit<
          T,
          'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
        >
      ): Promise<CrudResult<T>> =>
        wrap(() => BaseCrudService.create<T>(collectionName, data)),
      update: (
        id: string,
        data: Partial<Omit<T, 'id' | 'createdAt' | 'createdBy'>>
      ): Promise<CrudResult<T>> =>
        wrap(() => BaseCrudService.update<T>(collectionName, id, data)),
      remove: (id: string): Promise<CrudResult<boolean>> =>
        wrap(() => BaseCrudService.delete(collectionName, id)),
      getById: (id: string): Promise<CrudResult<T>> =>
        wrap(() => BaseCrudService.getById<T>(collectionName, id)),
      getAll: (): Promise<CrudResult<T[]>> =>
        wrap(() => BaseCrudService.getAll<T>(collectionName)),
      getWhere: (field: string, value: any): Promise<CrudResult<T[]>> =>
        wrap(() => BaseCrudService.getWhere<T>(collectionName, field, value)),
    }
  }, [collectionName, wrap])

  return { ...actions, loading, error }
}
