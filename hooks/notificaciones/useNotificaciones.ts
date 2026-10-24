import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ServicioNotificacion } from '@/services/firebase/firestore/colecciones/notificacion'
import type { Notificacion } from '@/models/Notificacion'

/** Bandeja del usuario en tiempo real, con acciones de lectura. */
export function useNotificaciones() {
  const { user } = useAuth()
  const uid = user?.uid
  const [avisos, setAvisos] = useState<Notificacion[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!uid) {
      setAvisos([])
      setCargando(false)
      return undefined
    }
    setCargando(true)
    return ServicioNotificacion.escuchar(
      uid,
      lista => {
        setAvisos(lista)
        setCargando(false)
      },
      () => setCargando(false)
    )
  }, [uid])

  const marcarLeida = useCallback(
    async (id: string) => {
      if (uid) await ServicioNotificacion.marcarLeida(uid, id)
    },
    [uid]
  )

  const marcarTodasLeidas = useCallback(async () => {
    if (!uid) return
    const ids = avisos.filter(a => !a.leido).map(a => a.id)
    await ServicioNotificacion.marcarTodasLeidas(uid, ids)
  }, [uid, avisos])

  return { avisos, cargando, marcarLeida, marcarTodasLeidas }
}
