import { useEffect, useMemo, useState } from 'react'
import { ServicioHabilitaciones } from '@/services/firebase/firestore/colecciones/habilitaciones'
import { ordenarCola } from '@/logic/habilitaciones/presentacion'
import type { EstadoHabilitacion } from '@/functions/src/compartido/habilitacion'
import type { Habilitacion } from '@/models/Habilitacion'

/**
 * Habilitaciones en un estado, en tiempo real y ya ordenadas para la cola de
 * revisión del admin.
 */
export function useHabilitaciones(estado: EstadoHabilitacion) {
  const [lista, setLista] = useState<Habilitacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCargando(true)
    setError(null)
    return ServicioHabilitaciones.suscribirPorEstado(
      estado,
      nuevas => {
        setLista(nuevas)
        setCargando(false)
      },
      err => {
        console.error('[useHabilitaciones] Error en suscripción:', err)
        setError(err.message)
        setCargando(false)
      }
    )
  }, [estado])

  const habilitaciones = useMemo(
    () => ordenarCola(lista, estado),
    [lista, estado]
  )
  return { habilitaciones, cargando, error }
}
