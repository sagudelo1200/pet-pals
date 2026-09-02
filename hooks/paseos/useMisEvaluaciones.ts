import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase.config'
import { GestorAuth } from '@/logic/auth'

/**
 * Evaluaciones propias del tutor como `evaluacion_cuidador`.
 * Devuelve un mapa `paseoId → rating` para mostrar "Tu calificación" en el
 * historial y permitir la repesca (calificar paseos completados pendientes).
 *
 * Lectura permitida por rules: solo se leen documentos donde
 * `actor.id == uid` (el propio usuario).
 */
export function useMisEvaluacionesTutor(): Record<string, number> {
  const uid = GestorAuth.obtenerUsuarioActual()?.uid
  const [porPaseo, setPorPaseo] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!uid) return undefined

    const q = query(
      collection(db, 'evaluaciones'),
      where('actor.id', '==', uid)
    )

    const unsub = onSnapshot(
      q,
      snap => {
        const mapa: Record<string, number> = {}
        snap.docs.forEach(d => {
          const data = d.data() as Record<string, any>
          if (data.tipo !== 'evaluacion_cuidador') return
          const rating = data.datos?.rating
          const contextoId = data.contexto?.id
          if (typeof rating === 'number' && typeof contextoId === 'string') {
            mapa[contextoId] = rating
          }
        })
        setPorPaseo(mapa)
      },
      () => {
        // Sin permisos o sin conexión: se ignora (el historial funciona igual)
      }
    )

    return unsub
  }, [uid])

  return porPaseo
}
