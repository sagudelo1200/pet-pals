import { useAuth } from '@/context/AuthContext'
import { useDoc } from '@/hooks/useDoc'

export interface BloqueoFinanciero {
  activo: boolean
  desde: Date
  obligacion_ids: string[]
}

/**
 * Bloqueo del usuario por cobros vencidos (lo marca y quita el servidor).
 * Mientras exista, las reglas impiden solicitar o unirse a nuevos paseos.
 */
export function useBloqueoFinanciero() {
  const { user } = useAuth()
  const { data } = useDoc<any>('usuarios', user?.uid || '__sin_sesion__', {
    listen: !!user?.uid,
  })
  const bloqueo = (data?.bloqueo_financiero ?? null) as BloqueoFinanciero | null
  return { bloqueado: !!bloqueo?.activo, bloqueo }
}
