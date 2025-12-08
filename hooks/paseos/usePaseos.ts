import { useMemo } from 'react'
import {
  collection,
  query,
  where,
  orderBy
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import { useCollection } from '@/hooks/useCollection'
import { ServicioAuth } from '@/services/firebase/auth'
import { Paseo } from '@/models/Paseo'

/**
 * Hook para obtener los paseos del usuario actual (Tutor).
 * Se suscribe a cambios en tiempo real.
 */
export function usePaseos() {
  const user = ServicioAuth.obtenerUsuarioActual()
  const uid = user?.uid

  // Crear query memoizada
  const q = useMemo(() => {
    if (!uid) return null
    
    return query(
      collection(db, 'paseos'),
      where('creado_por', '==', uid),
      orderBy('fecha_hora_inicio', 'desc')
    )
  }, [uid])

  // Usar useCollection con listen=true
  const { data, cargando, error, refetch } = useCollection<Paseo>(q, { listen: true })

  return {
    paseos: data,
    cargando,
    error,
    refetch
  }
}
