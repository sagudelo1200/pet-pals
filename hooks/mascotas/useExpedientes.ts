import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase.config'
import type { Expediente } from '@/models/Expediente'

/**
 * Expedientes de varias mascotas, en tiempo real. Los lee el tutor de la
 * mascota o el cuidador autorizado (las reglas lo deciden); si un expediente
 * aún no existe o no se puede leer, esa mascota queda sin él.
 * @param mascotaIds Mascotas a escuchar.
 */
export function useExpedientes(mascotaIds: readonly string[]) {
  // Clave estable: una lista nueva con los mismos ids no re-suscribe
  const clave = useMemo(() => [...mascotaIds].sort().join(','), [mascotaIds])
  const [expedientes, setExpedientes] = useState<
    Record<string, Expediente | undefined>
  >({})
  const [cargando, setCargando] = useState(!!clave)

  useEffect(() => {
    const ids = clave ? clave.split(',') : []
    if (ids.length === 0) {
      setExpedientes({})
      setCargando(false)
      return undefined
    }
    setCargando(true)
    const pendientes = new Set(ids)
    const terminar = (id: string) => {
      pendientes.delete(id)
      if (pendientes.size === 0) setCargando(false)
    }
    const cancelar = ids.map(id =>
      onSnapshot(
        doc(db, 'expedientes', id),
        snap => {
          setExpedientes(prev => ({
            ...prev,
            [id]: snap.exists() ? (snap.data() as Expediente) : undefined,
          }))
          terminar(id)
        },
        () => {
          // Sin permiso o sin expediente: se sigue sin él
          setExpedientes(prev => ({ ...prev, [id]: undefined }))
          terminar(id)
        }
      )
    )
    return () => cancelar.forEach(c => c())
  }, [clave])

  return { expedientes, cargando }
}
