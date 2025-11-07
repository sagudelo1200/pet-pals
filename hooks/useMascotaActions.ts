import { useCallback, useState } from 'react'
import type { Mascota } from '@/models/Mascota'
import { ServicioMascota } from '@/services/firebase'
import type { CrudResult } from '@/services/firebase/types'
import { mapFirebaseError } from '@/services/firebase/errors'

// Entrada mínima para crear una mascota desde la UI
export type MascotaCreateInput = Pick<
  Mascota,
  'nombre' | 'especie' | 'foto' | 'tamano' | 'raza' | 'peso' | 'descripcion'
>

export function useMascotaActions() {
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

  const crear = useCallback(
    async (data: MascotaCreateInput): Promise<CrudResult<Mascota>> => {
      return wrap(() => ServicioMascota.crear(data as any))
    },
    [wrap]
  )

  const actualizar = useCallback(
    async (
      id: string,
      data: Partial<Mascota>
    ): Promise<CrudResult<Mascota>> => {
      return wrap(() => ServicioMascota.actualizar(id, data as any))
    },
    [wrap]
  )

  const eliminar = useCallback(
    async (id: string): Promise<CrudResult<boolean>> => {
      return wrap(() => ServicioMascota.eliminar(id))
    },
    [wrap]
  )

  return { crear, actualizar, eliminar, cargando, error }
}
