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
import { ERR } from '@/constants'
import { mapFirebaseError } from '@/services/firebase/errors'
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
  const [cargando, setCargando] = useState<boolean>(true)
  const [error, setError] = useState<string | undefined>(undefined)

  // Guardamos la ref para evitar recrearla en cada render
  const ref = useMemo<DocumentReference>(
    () => doc(db, collectionName, id),
    [collectionName, id]
  )

  const unsubRef = useRef<Unsubscribe | null>(null)

  const fetchOnce = useCallback(async () => {
    setCargando(true)
    setError(undefined)
    try {
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const domainData = toDomain(snap.data()) as T | undefined | null
        setData({ id: snap.id, ...(domainData ?? {}) } as unknown as T)
      } else {
        setData(undefined)
        setError(ERR.DOCUMENTO_NO_ENCONTRADO)
      }
    } catch (e: any) {
      setError(mapFirebaseError(e))
    } finally {
      setCargando(false)
    }
  }, [ref])

  useEffect(() => {
    if (!listen) {
      void fetchOnce()
      return () => {}
    }
    setCargando(true)
    setError(undefined)
    const unsub = onSnapshot(
      ref,
      snap => {
        if (snap.exists()) {
          const domainData = toDomain(snap.data()) as T | undefined | null
          setData({ id: snap.id, ...(domainData ?? {}) } as unknown as T)
          setCargando(false)
        } else {
          setData(undefined)
          setError(ERR.DOCUMENTO_NO_ENCONTRADO)
          setCargando(false)
        }
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
  }, [listen, ref, fetchOnce])

  return { data, cargando, error, refetch: fetchOnce }
}
