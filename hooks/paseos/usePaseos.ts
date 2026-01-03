import { useMemo } from 'react'
import { useCollection } from '@/hooks/useCollection'
import { GestorAuth } from '@/logic/auth'
import { GestorPaseos } from '@/logic/paseos'
import { Paseo } from '@/models/Paseo'

/**
 * Hook para obtener los paseos del usuario actual (Tutor).
 * Se suscribe a cambios en tiempo real.
 */
export function usePaseos() {
  const user = GestorAuth.obtenerUsuarioActual()
  const uid = user?.uid

  // Crear query memoizada a través del gestor
  const q = useMemo(() => {
    if (!uid) return null
    return GestorPaseos.obtenerQueryPaseosTutor(uid)
  }, [uid])

  // Usar useCollection con listen=true
  const { data, cargando, error, refetch } = useCollection<Paseo>(q, {
    listen: true,
  })

  return {
    paseos: data,
    cargando,
    error,
    refetch,
  }
}
