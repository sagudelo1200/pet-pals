import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ServicioExploracionTerritorial } from '@/services/firebase'
import { ExploracionTerritorial } from '@/models/ExploracionTerritorial'

export function useHistorialExploraciones() {
  const { user } = useAuth()
  const [exploraciones, setExploraciones] = useState<ExploracionTerritorial[]>(
    []
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Configurar listener en tiempo real
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return undefined
    }

    setLoading(true)

    const unsubscribe = ServicioExploracionTerritorial.escucharPorUsuario(
      user.uid,
      data => {
        setExploraciones(data)
        setLoading(false)
        setError(null)
      },
      errorMsg => {
        setError(errorMsg)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user?.uid])

  const refetch = useCallback(async () => {
    if (!user?.uid) return

    setLoading(true)
    const result = await ServicioExploracionTerritorial.obtenerPorUsuario(
      user.uid
    )
    if (result.success) {
      setExploraciones(result.data || [])
      setError(null)
    } else {
      setError(result.error || 'Error al cargar exploraciones')
    }
    setLoading(false)
  }, [user?.uid])

  return {
    exploraciones,
    loading,
    error,
    refetch,
  }
}
