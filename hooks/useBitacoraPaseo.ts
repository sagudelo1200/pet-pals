import { useState, useEffect } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  type Query,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import { EventoPaseo } from '@/models/Paseo'

interface BitacoraConId extends EventoPaseo {
  id: string
}

/**
 * Hook para leer la bitácora de un paseo en tiempo real.
 * Obtiene todos los eventos registrados por el cuidador, ordenados cronológicamente.
 * Mantiene sincronización automática con Firestore.
 */
export function useBitacoraPaseo(paseoId: string) {
  const [bitacoras, setBitacoras] = useState<BitacoraConId[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!paseoId) {
      setBitacoras([])
      setCargando(false)
      return undefined
    }

    setCargando(true)
    setError(null)

    try {
      const q: Query = query(
        collection(db, 'paseos', paseoId, 'eventos'),
        orderBy('creado_en', 'desc')
      )

      const unsub = onSnapshot(
        q,
        snapshot => {
          const datos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as BitacoraConId[]
          setBitacoras(datos)
          setCargando(false)
        },
        err => {
          console.error('[useBitacoraPaseo] Error:', err)
          setError(err.message)
          setCargando(false)
        }
      )

      return unsub
    } catch (err: any) {
      console.error('[useBitacoraPaseo] Setup error:', err)
      setError(err.message)
      setCargando(false)
      return undefined
    }
  }, [paseoId])

  return { bitacoras, cargando, error }
}
