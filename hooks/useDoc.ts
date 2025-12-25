import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  doc,
  getDoc,
  onSnapshot,
  type DocumentReference,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import { toDomain, mapFirebaseError } from '@/services/firebase/comun'
import { ERR } from '@/constants'
import type { BaseModel } from '@/models/BaseModel'

/**
 * Hook para leer un documento de Firestore como objeto de dominio (con Date).
 * - Convierte automáticamente Timestamp -> Date usando `toDomain`.
 * - Permite modo realtime (listen) o fetch único.
 */
/**
 * useDoc
 * Flexible hook to read a document as domain object (with Date conversion).
 * Accepts either a Firestore DocumentReference<T> or (collectionName, id).
 */
export function useDoc<T extends BaseModel = any>(
  refOrCollection: DocumentReference | string,
  idOrOptions?: string | { listen?: boolean },
  maybeOptions?: { listen?: boolean }
) {
  // Normalize arguments with memoization to prevent infinite loops
  const { docRef, listen } = useMemo(() => {
    let isListen = false
    let ref: DocumentReference

    if (
      typeof refOrCollection === 'object' &&
      refOrCollection !== null &&
      'path' in refOrCollection
    ) {
      // Called with DocumentReference
      ref = refOrCollection as DocumentReference
      if (typeof idOrOptions === 'object' && idOrOptions !== null)
        isListen = !!idOrOptions.listen
    } else {
      // Called with collectionName, id, options?
      const collectionName = refOrCollection as string
      const id = typeof idOrOptions === 'string' ? idOrOptions : ''
      const options = (maybeOptions ??
        (typeof idOrOptions === 'object' ? idOrOptions : undefined)) as
        | { listen?: boolean }
        | undefined
      isListen = !!options?.listen
      ref = doc(db, collectionName, id)
    }
    return { docRef: ref, listen: isListen }
  }, [refOrCollection, idOrOptions, maybeOptions])

  const [data, setData] = useState<T | undefined>(undefined)
  const [cargando, setCargando] = useState<boolean>(true)
  const [error, setError] = useState<string | undefined>(undefined)

  // Guardamos el unsubscribe y el fetchOnce similar al patrón anterior
  const unsubRef = useRef<Unsubscribe | null>(null)

  const fetchOnce = useCallback(async () => {
    setCargando(true)
    setError(undefined)
    try {
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        const domainData = toDomain(snap.data()) as T | undefined | null
        setData({ id: snap.id, ...(domainData ?? {}) } as unknown as T)
      } else {
        setData(undefined)
        setError(ERR.COMUN.DOCUMENTO_NO_ENCONTRADO)
      }
    } catch (e: any) {
      setError(mapFirebaseError(e))
    } finally {
      setCargando(false)
    }
  }, [docRef])

  useEffect(() => {
    if (!listen) {
      void fetchOnce()
      return () => {}
    }

    setCargando(true)
    setError(undefined)
    const unsub = onSnapshot(
      docRef,
      snap => {
        if (snap.exists()) {
          const domainData = toDomain(snap.data()) as T | undefined | null
          setData({ id: snap.id, ...(domainData ?? {}) } as unknown as T)
          setCargando(false)
        } else {
          setData(undefined)
          setError(ERR.COMUN.DOCUMENTO_NO_ENCONTRADO)
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
  }, [listen, docRef, fetchOnce])

  return { data, cargando, error, refetch: fetchOnce, ref: docRef }
}
