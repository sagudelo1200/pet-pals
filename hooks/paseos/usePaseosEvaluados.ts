import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase.config'
import { GestorAuth } from '@/logic/auth'

/**
 * Paseos donde el usuario actual YA dejó alguna evaluación propia
 * (actor == uid). Se usa para la repesca: mostrar "Completar registro"
 * solo en paseos terminados que aún no registró.
 * Lectura permitida por rules (actor siempre lee lo suyo, sin get()).
 */
export function usePaseosEvaluados(): Set<string> {
  const uid = GestorAuth.obtenerUsuarioActual()?.uid
  const [paseos, setPaseos] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!uid) return undefined

    const q = query(
      collection(db, 'evaluaciones'),
      where('actor.id', '==', uid)
    )

    const unsub = onSnapshot(
      q,
      snap => {
        const set = new Set<string>()
        snap.docs.forEach(d => {
          const data = d.data() as Record<string, any>
          const contextoId = data.contexto?.id
          if (typeof contextoId === 'string') set.add(contextoId)
        })
        setPaseos(set)
      },
      () => {
        // Sin permisos o sin conexión: se ignora (la agenda funciona igual)
      }
    )

    return unsub
  }, [uid])

  return paseos
}
