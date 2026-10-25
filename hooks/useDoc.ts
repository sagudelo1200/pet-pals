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
  idOrOptions?: string | { listen?: boolean; enabled?: boolean },
  maybeOptions?: { listen?: boolean; enabled?: boolean }
) {
  // Normalizar a valores primitivos: así un objeto de opciones creado en
  // cada render ({ listen: true }) no cambia la referencia ni re-suscribe
  // (evita bucles "Maximum update depth exceeded")
  const opciones =
    typeof idOrOptions === 'object' && idOrOptions !== null
      ? idOrOptions
      : maybeOptions
  const listen = !!opciones?.listen
  // enabled:false = no consultar nada (p. ej. aún no hay sesión o id)
  const enabled = opciones?.enabled !== false
  const id = typeof idOrOptions === 'string' ? idOrOptions : ''

  const docRef = useMemo<DocumentReference | null>(() => {
    if (!enabled) return null
    if (
      typeof refOrCollection === 'object' &&
      refOrCollection !== null &&
      'path' in refOrCollection
    ) {
      // Called with DocumentReference
      return refOrCollection as DocumentReference
    }
    // Called with collectionName, id, options?
    return doc(db, refOrCollection as string, id)
  }, [enabled, refOrCollection, id])

  const [data, setData] = useState<T | undefined>(undefined)
  const [cargando, setCargando] = useState<boolean>(true)
  const [error, setError] = useState<string | undefined>(undefined)

  // Guardamos el unsubscribe y el fetchOnce similar al patrón anterior
  const unsubRef = useRef<Unsubscribe | null>(null)

  const fetchOnce = useCallback(async () => {
    if (!docRef) return
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
    if (!docRef) {
      setData(undefined)
      setError(undefined)
      setCargando(false)
      return () => {}
    }
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
