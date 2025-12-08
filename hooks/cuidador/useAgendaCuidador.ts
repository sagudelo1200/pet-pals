import { useMemo } from 'react'
import { collection, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '@/firebase.config'
import { useCollection } from '@/hooks/useCollection'
import { ServicioAuth } from '@/services/firebase/auth'
import { Paseo } from '@/models/Paseo'

/**
 * Hook para obtener la agenda de paseos del cuidador actual.
 * Filtra por paseos donde el usuario es el cuidador asignado.
 */
export function useAgendaCuidador() {
  const user = ServicioAuth.obtenerUsuarioActual()
  const uid = user?.uid

  // Crear query memoizada
  const q = useMemo(() => {
    if (!uid) return null

    return query(
      collection(db, 'paseos'),
      where('id_cuidador', '==', uid),
      orderBy('fecha_hora_inicio', 'desc'),
      limit(50)
    )
  }, [uid])

  // Usar useCollection con listen=true para actualizaciones en tiempo real
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
