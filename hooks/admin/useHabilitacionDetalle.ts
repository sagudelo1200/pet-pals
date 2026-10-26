import { useEffect, useMemo, useState } from 'react'
import { ServicioHabilitaciones } from '@/services/firebase/firestore/colecciones/habilitaciones'
import type { EntradaHistorial, Habilitacion } from '@/models/Habilitacion'

/** Una habilitación y su historial (lo más reciente primero), en tiempo real. */
export function useHabilitacionDetalle(id: string) {
  const [habilitacion, setHabilitacion] = useState<Habilitacion | null>(null)
  const [historial, setHistorial] = useState<EntradaHistorial[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCargando(true)
    setError(null)
    const fallo = (err: Error) => {
      console.error('[useHabilitacionDetalle] Error en suscripción:', err)
      setError(err.message)
      setCargando(false)
    }
    const cancelarDetalle = ServicioHabilitaciones.suscribirADetalle(
      id,
      h => {
        setHabilitacion(h)
        setCargando(false)
      },
      fallo
    )
    const cancelarHistorial = ServicioHabilitaciones.suscribirAHistorial(
      id,
      setHistorial,
      fallo
    )
    return () => {
      cancelarDetalle()
      cancelarHistorial()
    }
  }, [id])

  const recientes = useMemo(
    () =>
      [...historial].sort(
        (a, b) => (b.en?.getTime() ?? 0) - (a.en?.getTime() ?? 0)
      ),
    [historial]
  )
  return { habilitacion, historial: recientes, cargando, error }
}
