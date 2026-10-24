import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ServicioNotificacion } from '@/services/firebase/firestore/colecciones/notificacion'
import type { PreferenciasNotificacion } from '@/functions/src/compartido/notificaciones'

const POR_DEFECTO: PreferenciasNotificacion = { push: true, email: true }

/** Preferencias de canales del usuario; cada cambio se guarda al instante. */
export function usePreferenciasNotificaciones() {
  const { user } = useAuth()
  const uid = user?.uid
  const [preferencias, setPreferencias] =
    useState<PreferenciasNotificacion>(POR_DEFECTO)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!uid) {
      setCargando(false)
      return
    }
    ServicioNotificacion.obtenerPreferencias(uid)
      .then(setPreferencias)
      .catch(error => console.warn('[Preferencias] No se pudo leer:', error))
      .finally(() => setCargando(false))
  }, [uid])

  const cambiar = useCallback(
    async (canal: keyof PreferenciasNotificacion, activo: boolean) => {
      if (!uid) return
      const anterior = preferencias
      const nuevas = { ...preferencias, [canal]: activo }
      setPreferencias(nuevas)
      try {
        await ServicioNotificacion.guardarPreferencias(uid, nuevas)
      } catch (error) {
        console.warn('[Preferencias] No se pudo guardar:', error)
        setPreferencias(anterior)
      }
    },
    [uid, preferencias]
  )

  return { preferencias, cargando, cambiar }
}
