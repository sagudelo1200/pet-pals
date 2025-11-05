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
  const { data, loading, error, refetch } = useCollection<Mascota>(q, {
    listen,
  })

  // When auth is still loading, surface that as loading; when there's no query (no user)
  // expose NO_AUTENTICADO once auth finished.
  const effectiveLoading = authLoading || loading
  const effectiveError = q
    ? error
    : authLoading
      ? undefined
      : ERR.NO_AUTENTICADO

  return {
    mascotas: data,
    loading: effectiveLoading,
    error: effectiveError,
    refetch,
  }
}
