import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase.config'
import { Paseo } from '@/models/Paseo'
import { toDomain } from '@/services/firebase/converters'

/**
 * Hook para manejar la lógica de un paseo en progreso (Tutor).
 * Se suscribe al documento del paseo en tiempo real.
 */
export const usePaseoActivo = (paseoId: string) => {
  const [paseo, setPaseo] = useState<Paseo | null>(null)
  const [loading, setLoading] = useState(true)
  const [ruta, setRuta] = useState<{ latitude: number; longitude: number }[]>([])
  const [ubicacionActual, setUbicacionActual] = useState<{ latitude: number; longitude: number } | null>(null)

  useEffect(() => {
    if (!paseoId) return () => {}

    setLoading(true)

    // 1. Suscripción al documento principal del paseo
    const paseoRef = doc(db, 'paseos', paseoId)
    const unsubPaseo = onSnapshot(paseoRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = toDomain(snapshot.data()) as Paseo
        setPaseo({ id: snapshot.id, ...data })
      } else {
        setPaseo(null)
      }
      setLoading(false)
    }, (error) => {
      console.error('[Firebase] Error suscribiendo al paseo:', error)
      setLoading(false)
    })

    return () => {
      unsubPaseo()
    }
  }, [paseoId])

  return {
    paseo,
    loading,
    ruta,
    ubicacionActual,
  }
}
