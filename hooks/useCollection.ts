import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getDocs,
  onSnapshot,
  type Query,
  type Unsubscribe,
} from 'firebase/firestore'
import { toDomain } from '@/services/firebase/converters'
// ERR codes are produced via mapFirebaseError
import { mapFirebaseError } from '@/services/firebase/errors'
import type { BaseModel } from '@/models/BaseModel'

/**
 * Hook para leer una colección (o query) de Firestore como objetos de dominio (con Date).
 * - Acepta una Query creada con Firestore (`query(collection(...), where(...), orderBy(...))`).
 * - `listen=true` para realtime; `false` para fetch único.
 */
export function useCollection<T extends BaseModel = any>(
  q: Query,
  options?: { listen?: boolean }
) {
  const { listen = false } = options || {}
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | undefined>(undefined)

  const unsubRef = useRef<Unsubscribe | null>(null)

  const fetchOnce = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const snap = await getDocs(q)
      const items: T[] = []
      snap.forEach(doc => {
        items.push({ id: doc.id, ...(toDomain(doc.data()) as T) })
      })
      setData(items)
    } catch (e: any) {
      setError(mapFirebaseError(e))
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    if (!listen) {
      void fetchOnce()
      return () => {}
    }

    setLoading(true)
    setError(undefined)
    const unsub = onSnapshot(
      q,
      snap => {
        const items: T[] = []
        snap.forEach(doc => {
          items.push({ id: doc.id, ...(toDomain(doc.data()) as T) })
        })
        setData(items)
        setLoading(false)
      },
      err => {
        setError(mapFirebaseError(err))
        setLoading(false)
      }
    )

    unsubRef.current = unsub
    return () => {
      if (unsubRef.current) unsubRef.current()
      unsubRef.current = null
    }
  }, [listen, q, fetchOnce])

  return { data, loading, error, refetch: fetchOnce }
}
