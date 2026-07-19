/**
 * Hook: useZonaH3
 *
 * Lee una zona H3 unificada (narrativa + operativa) desde Firestore en tiempo real.
 * Reemplaza a useTerritorio() con acceso a ambas secciones.
 */

import { useState, useEffect } from 'react'
import { collection, doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase.config'
import type { ZonaH3 } from '@/models/ZonaH3'
import { mapFirebaseError } from '@/services/firebase/comun'

interface UseZonaH3Result {
  zona: ZonaH3 | null
  loading: boolean
  error: string | null
}

/**
 * Hook que lee una zona H3 en tiempo real desde Firestore
 * @param h3_r9 Identificador de la zona (nivel detalle)
 * @returns { zona, loading, error }
 */
export function useZonaH3(h3_r9?: string): UseZonaH3Result {
  const [zona, setZona] = useState<ZonaH3 | null>(null)
  const [loading, setLoading] = useState(h3_r9 ? true : false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!h3_r9) {
      setZona(null)
      setLoading(false)
      return () => {}
    }

    setLoading(true)
    setError(null)

    try {
      const zonaRef = doc(collection(db, 'h3_zonas'), h3_r9)

      const unsubscribe = onSnapshot(
        zonaRef,
        snapshot => {
          try {
            if (snapshot.exists()) {
              setZona(snapshot.data() as ZonaH3)
            } else {
              setZona(null)
            }
            setError(null)
            setLoading(false)
          } catch (err) {
            const mensaje = mapFirebaseError(err)
            setError(mensaje)
            setLoading(false)
          }
        },
        err => {
          const mensaje = mapFirebaseError(err)
          console.warn('[useZonaH3] Error escuchando zona:', err)
          setError(mensaje)
          setLoading(false)
        }
      )

      return () => {
        try {
          unsubscribe()
        } catch (_err) {
          // Ignorar errores en cleanup
        }
      }
    } catch (err) {
      const mensaje = mapFirebaseError(err)
      setError(mensaje)
      setLoading(false)
      return () => {}
    }
  }, [h3_r9])

  return { zona, loading, error }
}
