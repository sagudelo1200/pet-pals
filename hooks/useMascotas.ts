import { useMemo } from 'react'
import { collection, query, where, type Query } from 'firebase/firestore'
import { db } from '@/firebase.config'
import type { Mascota } from '@/models/Mascota'
import { useCollection } from './useCollection'
import { useAuth } from '@/services/context/AuthContext'
import { ERR } from '@/constants'

/**
 * Hook de dominio: lista de mascotas del usuario autenticado.
 * - Usa realtime por defecto (listen=true) para reflejar cambios al instante.
 * - Si no hay usuario (y auth ya resolvió), expone error 'NO_AUTENTICADO'.
 */
export function useMascotasDelUsuario(options?: { listen?: boolean }) {
  const { user, loading: authLoading } = useAuth()
  const { listen = true } = options || {}

  const q = useMemo<Query | null>(() => {
    if (!user?.uid) return null
    return query(collection(db, 'mascotas'), where('createdBy', '==', user.uid))
  }, [user?.uid])

  // Cuando aún carga el estado de auth, devolvemos loading.
  if (!q) {
    return {
      mascotas: [] as Mascota[],
      loading: authLoading,
      error: authLoading ? undefined : ERR.NO_AUTENTICADO,
      refetch: async () => {},
    }
  }

  const { data, loading, error, refetch } = useCollection<Mascota>(q, {
    listen,
  })

  return { mascotas: data, loading, error, refetch }
}
