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
  const { user, cargando: authCargando } = useAuth()
  const { listen = true } = options || {}

  const q = useMemo<Query | null>(() => {
    if (!user?.uid) return null
    return query(
      collection(db, 'mascotas'),
      where('creado_por', '==', user.uid)
    )
  }, [user?.uid])
  const { data, cargando, error, refetch } = useCollection<Mascota>(q, {
    listen,
  })

  const effectiveLoading = authCargando || cargando
  const effectiveError = q
    ? error
    : authCargando
      ? undefined
      : ERR.COMUN.NO_AUTENTICADO

  return {
    mascotas: data,
    cargando: effectiveLoading,
    error: effectiveError,
    refetch,
  }
}
