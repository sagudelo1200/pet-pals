import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase.config'
import { GestorAuth } from '@/logic/auth'

export interface FeedbackRecibido {
  paseoId: string
  rating: number
  comentario: string
  comentario_privado: string
  creadoMs: number
}

/**
 * Feedback REVELADO que el cuidador recibió de tutores.
 * Solo lee evaluaciones donde él es el objetivo y están `revelada: true`
 * (la regla de lectura lo permite sin get(), así la query funciona).
 * El comentario privado (si existe) se muestra solo aquí, nunca en público.
 */
export function useFeedbackRecibido(): FeedbackRecibido[] {
  const uid = GestorAuth.obtenerUsuarioActual()?.uid
  const [feedback, setFeedback] = useState<FeedbackRecibido[]>([])

  useEffect(() => {
    if (!uid) return undefined

    const q = query(
      collection(db, 'evaluaciones'),
      where('objetivo.id', '==', uid)
    )

    const unsub = onSnapshot(
      q,
      snap => {
        const lista: FeedbackRecibido[] = []
        snap.docs.forEach(d => {
          const data = d.data() as Record<string, any>
          if (data.tipo !== 'evaluacion_cuidador') return
          if (data.revelada !== true) return // doble ciego: solo lo revelado

          const datos = (data.datos ?? {}) as Record<string, unknown>
          const creadoEn = data.creado_en
          const creadoMs =
            creadoEn && typeof creadoEn.toMillis === 'function'
              ? creadoEn.toMillis()
              : 0

          lista.push({
            paseoId: (data.contexto?.id as string) ?? '',
            rating: typeof datos.rating === 'number' ? datos.rating : 0,
            comentario:
              typeof datos.comentario === 'string' ? datos.comentario : '',
            comentario_privado:
              typeof datos.comentario_privado === 'string'
                ? datos.comentario_privado
                : '',
            creadoMs,
          })
        })

        // Últimos 5, más recientes primero
        lista.sort((a, b) => b.creadoMs - a.creadoMs)
        setFeedback(lista.slice(0, 5))
      },
      () => {
        // Sin permisos o sin conexión: se ignora (el dashboard funciona igual)
      }
    )

    return unsub
  }, [uid])

  return feedback
}
