import { useEffect, useMemo, useState } from 'react'
import { ServicioTerritorio } from '@/services/firebase/firestore/colecciones/territorio'
import { combinarZonas } from '@/logic/territorio/zonas'
import type { CeldaTerritorial, ZonaH3 } from '@/models/ZonaH3'

/**
 * Todas las zonas, en tiempo real: oferta y demanda por celda de cobertura y
 * lo observado en cada microzona (ver `combinarZonas`).
 */
export function useZonasH3() {
  const [celdas, setCeldas] = useState<CeldaTerritorial[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return ServicioTerritorio.suscribirATodas(
      nuevas => {
        setCeldas(nuevas)
        setCargando(false)
      },
      err => {
        console.error('[useZonasH3] Error en suscripción:', err)
        setError(err.message)
        setCargando(false)
      }
    )
  }, [])

  const zonas: ZonaH3[] = useMemo(() => combinarZonas(celdas), [celdas])

  return { zonas, celdas, cargando, error }
}
