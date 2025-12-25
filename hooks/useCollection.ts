import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import {
  getDocs,
  onSnapshot,
  collection,
  query as firestoreQuery,
  type Query,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import { toDomain, mapFirebaseError } from '@/services/firebase/comun'
import type { BaseModel } from '@/models/BaseModel'

/**
 * Hook para leer una colección (o query) de Firestore como objetos de dominio (con Date).
 * - Acepta una Query creada con Firestore (`query(collection(...), where(...), orderBy(...))`).
 * - `listen=true` para realtime; `false` para fetch único.
 */
export function useCollection<T extends BaseModel = any>(
  qOrCollection: Query | string | null,
  options?: { listen?: boolean }
) {
  const { listen = false } = options || {}

  // Allow passing either a Firestore Query or a collection name string.
  const q = useMemo<Query | null>(() => {
    if (!qOrCollection) return null
    if (typeof qOrCollection === 'string') {
      // collection name provided -> simple query without filters
      return firestoreQuery(collection(db, qOrCollection))
    }
    return qOrCollection
  }, [qOrCollection])
  const [data, setData] = useState<T[]>([])
  const [cargando, setCargando] = useState<boolean>(true)
  const [error, setError] = useState<string | undefined>(undefined)

  const unsubRef = useRef<Unsubscribe | null>(null)

  const fetchOnce = useCallback(async () => {
    setCargando(true)
    setError(undefined)
    try {
      if (!q) {
        // No query: expose empty result
        setData([])
        setCargando(false)
        return
      }

      const snap = await getDocs(q)
      const items: T[] = []
      snap.forEach(doc => {
        const domainData = toDomain(doc.data()) as T | undefined | null
        items.push({ id: doc.id, ...(domainData ?? {}) } as unknown as T)
      })
      setData(items)
    } catch (e: any) {
      setError(mapFirebaseError(e))
    } finally {
      setCargando(false)
    }
  }, [q])

  useEffect(() => {
    // If not in realtime mode, just fetch once (fetchOnce handles q==null)
    if (!listen) {
      void fetchOnce()
      return () => {}
    }

    // Realtime mode: if q is null, expose empty data and avoid subscribing
    if (!q) {
      setData([])
      setCargando(false)
      setError(undefined)
      return () => {}
    }

    setCargando(true)
    setError(undefined)
    const unsub = onSnapshot(
      q as Query,
      snap => {
        const items: T[] = []
        snap.forEach(doc => {
          const domainData = toDomain(doc.data()) as T | undefined | null
          items.push({ id: doc.id, ...(domainData ?? {}) } as unknown as T)
        })
        setData(items)
        setCargando(false)
      },
      err => {
        setError(mapFirebaseError(err))
        setCargando(false)
      }
    )

    unsubRef.current = unsub
    return () => {
      if (unsubRef.current) unsubRef.current()
      unsubRef.current = null
    }
  }, [listen, q, fetchOnce])

  return { data, cargando, error, refetch: fetchOnce }
}
