/**
 * Hook: useZonaH3
 *
 * Lee en tiempo real lo observado en una microzona (R9): `territorio/{celda}`.
 * Solo lectura: lo escribe el servidor.
 */

import { useState, useEffect, useMemo } from 'react'
import { ServicioTerritorio } from '@/services/firebase/firestore/colecciones/territorio'
import { combinarZonas } from '@/logic/territorio/zonas'
import { mapFirebaseError } from '@/services/firebase/comun'
import { useConfiguracion } from '@/hooks/configuracion/useConfiguracion'
import type { CeldaTerritorial, ZonaH3 } from '@/models/ZonaH3'

interface UseZonaH3Result {
  zona: ZonaH3 | null
  loading: boolean
  error: string | null
}

/**
 * @param h3_r9 Microzona (celda de resolución micro).
 * @returns { zona, loading, error }; `zona` es null si aún no hay datos.
 */
export function useZonaH3(h3_r9?: string): UseZonaH3Result {
  const [celda, setCelda] = useState<CeldaTerritorial | null>(null)
  const { min_datos_indices: minimo } = useConfiguracion('territorio')
  const [loading, setLoading] = useState(!!h3_r9)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!h3_r9) {
      setCelda(null)
      setLoading(false)
      return () => {}
    }

    setLoading(true)
    setError(null)
    return ServicioTerritorio.suscribirACelda(
      h3_r9,
      nueva => {
        setCelda(nueva)
        setError(null)
        setLoading(false)
      },
      err => {
        console.warn('[useZonaH3] Error escuchando zona:', err)
        setError(mapFirebaseError(err))
        setLoading(false)
      }
    )
  }, [h3_r9])

  const zona = useMemo<ZonaH3 | null>(
    () =>
      celda
        ? (combinarZonas([celda], minimo).find(z => z.nivel === 9) ?? null)
        : null,
    [celda, minimo]
  )

  return { zona, loading, error }
}
