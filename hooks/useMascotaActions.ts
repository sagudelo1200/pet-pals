import { useCallback, useState } from 'react'
import { Mascota } from '@/models/Mascota'
import { MascotaService } from '@/services/firebase/mascota'
import type { CrudResult } from '@/services/firebase/types'
import { mapFirebaseError } from '@/services/firebase/errors'

// Entrada mínima para crear una mascota desde la UI
export type MascotaCreateInput = Pick<
  Mascota,
  'nombre' | 'especie' | 'foto' | 'tamano' | 'raza' | 'peso' | 'descripcion'
>

export function useMascotaActions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const wrap = useCallback(async <R>(fn: () => Promise<R>): Promise<R> => {
    setLoading(true)
    setError(undefined)
    try {
      return await fn()
    } catch (e: any) {
      setError(mapFirebaseError(e))
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const create = useCallback(
    async (data: MascotaCreateInput): Promise<CrudResult<Mascota>> => {
      return wrap(() =>
        // creado_por lo fija el servicio con el UID actual; aquí no lo pedimos a la UI
        MascotaService.create(data as any)
      )
    },
    [wrap]
  )

  const update = useCallback(
    async (
      id: string,
      data: Partial<Mascota>
    ): Promise<CrudResult<Mascota>> => {
      return wrap(() => MascotaService.update(id, data as any))
    },
    [wrap]
  )

  const remove = useCallback(
    async (id: string): Promise<CrudResult<boolean>> => {
      return wrap(() => MascotaService.delete(id))
    },
    [wrap]
  )

  return { create, update, remove, loading, error }
}
