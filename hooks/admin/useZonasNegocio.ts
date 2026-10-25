import { useEffect, useMemo, useState } from 'react'
import {
  ServicioZonas,
  type CeldaZonaDoc,
} from '@/services/firebase/firestore/colecciones/zonas'
import { mapaDeCeldas } from '@/logic/territorio/zonasDeNegocio'
import type { Zona } from '@/models/Zona'

/**
 * Zonas de negocio y el índice de a quién pertenece cada celda, en tiempo
 * real. Se usa para filtrar el territorio por ciudad y para editar zonas.
 */
export function useZonasNegocio() {
  const [zonas, setZonas] = useState<Zona[]>([])
  const [docs, setDocs] = useState<CeldaZonaDoc[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let zonasListas = false
    let celdasListas = false
    const listo = () => {
      if (zonasListas && celdasListas) setCargando(false)
    }
    const fallo = (err: Error) => {
      console.error('[useZonasNegocio] Error en suscripción:', err)
      setError(err.message)
      setCargando(false)
    }
    const cancelarZonas = ServicioZonas.suscribirAZonas(nuevas => {
      setZonas(nuevas)
      zonasListas = true
      listo()
    }, fallo)
    const cancelarCeldas = ServicioZonas.suscribirACeldasZona(nuevas => {
      setDocs(nuevas)
      celdasListas = true
      listo()
    }, fallo)
    return () => {
      cancelarZonas()
      cancelarCeldas()
    }
  }, [])

  const mapa = useMemo(() => mapaDeCeldas(docs), [docs])

  return { zonas, mapa, cargando, error }
}
