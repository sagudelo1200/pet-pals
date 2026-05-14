import { useEffect, useState } from 'react'
import {
  ServicioZonasH3,
  type ZonaH3,
} from '@/services/firebase/firestore/colecciones/h3_zonas'

export function useZonasH3() {
  const [zonas, setZonas] = useState<ZonaH3[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cancelar = ServicioZonasH3.suscribirATodas(
      nuevasZonas => {
        setZonas(nuevasZonas)
        setCargando(false)
      },
      err => {
        setError(err.message)
        setCargando(false)
      }
    )
    return cancelar
  }, [])

  return { zonas, cargando, error }
}
