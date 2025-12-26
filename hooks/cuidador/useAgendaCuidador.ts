import { useMemo } from 'react'
import { collection, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '@/firebase.config'
import { useCollection } from '@/hooks/useCollection'
import { ServicioAuth } from '@/services/firebase/auth/auth'
import { Paseo } from '@/models/Paseo'

/**
 * Hook para obtener la agenda de paseos del cuidador actual.
 * Separa los paseos en 'proximos' (activos) y 'historial' (pasados).
 */
export function useAgendaCuidador() {
  const user = ServicioAuth.obtenerUsuarioActual()
  const uid = user?.uid

  // Query para paseos próximos (Activos)
  const qProximos = useMemo(() => {
    if (!uid) return null

    return query(
      collection(db, 'paseos'),
      where('id_cuidador', '==', uid),
      where('estado', 'in', ['CONFIRMADO', 'EN_CAMINO', 'EN_PROGRESO']),
      orderBy('fecha_hora_inicio', 'asc') // Los más cercanos primero
    )
  }, [uid])

  // Query para historial (Inactivos)
  const qHistorial = useMemo(() => {
    if (!uid) return null

    return query(
      collection(db, 'paseos'),
      where('id_cuidador', '==', uid),
      where('estado', 'in', ['COMPLETADO', 'FINALIZADO', 'CANCELADO']),
      orderBy('fecha_hora_inicio', 'desc'), // Los más recientes primero
      limit(30)
    )
  }, [uid])

  const {
    data: proximosData,
    cargando: l1,
    error: e1,
    refetch: r1,
  } = useCollection<Paseo>(qProximos, {
    listen: true,
  })

  const {
    data: historialData,
    cargando: l2,
    error: e2,
    refetch: r2,
  } = useCollection<Paseo>(qHistorial, {
    listen: true,
  })

  return {
    proximos: proximosData || [],
    historial: historialData || [],
    cargando: l1 || l2,
    error: e1 || e2,
    refetch: () => {
      r1()
      r2()
    },
  }
}
