import { useMemo } from 'react'
import { useCollection } from '@/hooks/useCollection'
import { GestorAuth } from '@/logic/auth'
import { GestorPaseos } from '@/logic/paseos'
import { Paseo } from '@/models/Paseo'

/**
 * Hook para obtener la agenda de paseos del cuidador actual.
 * Separa los paseos en 'proximos' (activos) y 'historial' (pasados).
 */
export function useAgendaCuidador() {
  const user = GestorAuth.obtenerUsuarioActual()
  const uid = user?.uid

  // Query para paseos próximos (Activos) a través del gestor
  const qProximos = useMemo(() => {
    if (!uid) return null
    return GestorPaseos.obtenerQueryAgendaCuidador(uid)
  }, [uid])

  // Query para historial (Inactivos) a través del gestor
  const qHistorial = useMemo(() => {
    if (!uid) return null
    return GestorPaseos.obtenerQueryHistorialCuidador(uid)
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
