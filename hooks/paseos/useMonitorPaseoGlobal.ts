import { useEffect, useState, useRef } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { Paseo, ESTADOS_PASEO } from '@/models/Paseo'
import { GestorPaseos } from '@/logic/paseos'
import { useGestorPaseoActivo } from '@/hooks/paseos/useGestorPaseoActivo'
import { GestorAuth } from '@/logic/auth'

export function useMonitorPaseoGlobal() {
  const user = GestorAuth.obtenerUsuarioActual()
  const { paseo } = useGestorPaseoActivo()
  const [showFinishedModal, setShowFinishedModal] = useState(false)
  const lastPaseoId = useRef<string | null>(null)

  // 1. Sincronizador Global: Escucha paseos activos del usuario
  useEffect(() => {
    if (!user?.uid) {
      // No user: no listener. Return a noop cleanup for consistent return type.
      return () => {}
    }

    // Buscar cualquier paseo que esté en curso o recién finalizado a través del gestor
    const q = GestorPaseos.obtenerQueryMonitorPaseoGlobal(user.uid)

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0]
          const data = { id: doc.id, ...doc.data() } as Paseo
          GestorPaseos.paseoActivo.setPaseoActivo(data)
        } else {
          if (GestorPaseos.paseoActivo.getPaseoActivo() !== null) {
            GestorPaseos.paseoActivo.limpiarPaseoActivo()
          }
        }
      },
      error => {
        console.error(
          '[useMonitorPaseoGlobal] Error listening to active walks:',
          error
        )
      }
    )

    return () => unsubscribe()
  }, [user?.uid])

  // 2. Lógica de UI Global
  useEffect(() => {
    if (!paseo) {
      setShowFinishedModal(false)
      return
    }

    // Detectar transición a FINALIZADO
    if (paseo.estado === ESTADOS_PASEO.FINALIZADO) {
      if (lastPaseoId.current !== paseo.id) {
        setShowFinishedModal(true)
        lastPaseoId.current = paseo.id
      }
    }
  }, [paseo?.estado, paseo?.id])

  const handleClose = async () => {
    if (paseo?.id) {
      await GestorPaseos.completarPaseo(paseo.id)
    }
    setShowFinishedModal(false)
    GestorPaseos.paseoActivo.limpiarPaseoActivo()
  }

  return {
    showFinishedModal,
    paseo,
    handleClose,
  }
}
