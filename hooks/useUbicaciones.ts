import { useEffect, useState, useRef } from 'react'
import { ServicioUbicacion } from '@/services/firebase/ubicacion'
import { Ubicacion } from '@/models/Ubicacion'

type MapById = Record<string, Ubicacion>

export function useUbicaciones(ids: string[] | undefined): {
  loading: boolean
  data: MapById
} {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<MapById>({})
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!ids || ids.length === 0) return undefined
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const res = await ServicioUbicacion.obtenerPorIds(ids)
      if (cancelled) return
      if (res.success && res.data) {
        const map: MapById = {}
        for (const u of res.data) map[u.id] = u
        if (mounted.current) setData(map)
      }
      if (mounted.current) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [ids?.join('|')])

  return { loading, data }
}
