import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ServicioNotificacion } from '@/services/firebase/firestore/colecciones/notificacion'

interface NotificacionesContextType {
  /** Avisos sin leer (tope LIMITE_CONTADOR). */
  noLeidas: number
}

const NotificacionesContext = createContext<NotificacionesContextType>({
  noLeidas: 0,
})

/** Una sola suscripción al contador para toda la app (lo usa cada campana). */
export const NotificacionesProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const { user } = useAuth()
  const uid = user?.uid
  const [noLeidas, setNoLeidas] = useState(0)

  useEffect(() => {
    if (!uid) {
      setNoLeidas(0)
      return undefined
    }
    return ServicioNotificacion.escucharNoLeidas(uid, setNoLeidas)
  }, [uid])

  return (
    <NotificacionesContext.Provider value={{ noLeidas }}>
      {children}
    </NotificacionesContext.Provider>
  )
}

export const useNoLeidas = (): number =>
  useContext(NotificacionesContext).noLeidas
