import { useEffect, useState, useRef } from 'react'
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import { Paseo, ESTADOS_PASEO } from '@/models/Paseo'
import { paseoActivo, completarPaseo } from '@/logic/paseos'
import { useGestorPaseoActivo } from '@/hooks/paseos/useGestorPaseoActivo'
import { ServicioAuth } from '@/services/firebase/auth/auth'

export function useMonitorPaseoGlobal() {
  const user = ServicioAuth.obtenerUsuarioActual()
  const { paseo } = useGestorPaseoActivo()
  const [showFinishedModal, setShowFinishedModal] = useState(false)
  const lastPaseoId = useRef<string | null>(null)

  // 1. Sincronizador Global: Escucha paseos activos del usuario
  useEffect(() => {
    if (!user?.uid) {
      // No user: no listener. Return a noop cleanup for consistent return type.
      return () => {}
    }

    // Buscar cualquier paseo que esté en curso o recién finalizado
    const q = query(
      collection(db, 'paseos'),
      where('creado_por', '==', user.uid),
      where('estado', 'in', [
        ESTADOS_PASEO.CONFIRMADO,
        ESTADOS_PASEO.EN_CAMINO,
        ESTADOS_PASEO.EN_PROGRESO,
        ESTADOS_PASEO.FINALIZADO,
      ]),
      orderBy('creado_en', 'desc'),
      limit(1)
    )

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0]
          const data = { id: doc.id, ...doc.data() } as Paseo
          paseoActivo.setPaseoActivo(data)
        } else {
          if (paseoActivo.getPaseoActivo() !== null) {
            paseoActivo.limpiarPaseoActivo()
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
      await completarPaseo(paseo.id)
    }
    setShowFinishedModal(false)
    paseoActivo.limpiarPaseoActivo()
  }

  return {
    showFinishedModal,
    paseo,
    handleClose,
  }
}
