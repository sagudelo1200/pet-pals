import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  doc,
  getDoc,
  onSnapshot,
  type DocumentReference,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import { toDomain } from '@/services/firebase/converters'
import type { BaseModel } from '@/models/BaseModel'

/**
 * Hook para leer un documento de Firestore como objeto de dominio (con Date).
 * - Convierte automáticamente Timestamp -> Date usando `toDomain`.
 * - Permite modo realtime (listen) o fetch único.
 */
export function useDoc<T extends BaseModel = any>(
  collectionName: string,
  id: string,
  options?: { listen?: boolean }
) {
  const { listen = false } = options || {}
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | undefined>(undefined)

  // Guardamos la ref para evitar recrearla en cada render
  const ref = useMemo<DocumentReference>(
    () => doc(db, collectionName, id),
    [collectionName, id]
  )

  const unsubRef = useRef<Unsubscribe | null>(null)

  const fetchOnce = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const snap = await getDoc(ref)
      if (snap.exists()) {
        setData({ id: snap.id, ...(toDomain(snap.data()) as T) })
      } else {
        setData(undefined)
        setError('NOT_FOUND')
      }
    } catch (e: any) {
      setError(e?.message || 'UNKNOWN')
    } finally {
      setLoading(false)
    }
  }, [ref])

  useEffect(() => {
    if (!listen) {
      void fetchOnce()
      return () => {}
    }
    setLoading(true)
    setError(undefined)
    const unsub = onSnapshot(
      ref,
      snap => {
        if (snap.exists()) {
          setData({ id: snap.id, ...(toDomain(snap.data()) as T) })
          setLoading(false)
        } else {
          setData(undefined)
          setError('NOT_FOUND')
          setLoading(false)
        }
      },
      err => {
        setError(err?.message || 'UNKNOWN')
        setLoading(false)
      }
    )

    unsubRef.current = unsub
    return () => {
      if (unsubRef.current) unsubRef.current()
      unsubRef.current = null
    }
  }, [listen, ref, fetchOnce])

  return { data, loading, error, refetch: fetchOnce }
}
