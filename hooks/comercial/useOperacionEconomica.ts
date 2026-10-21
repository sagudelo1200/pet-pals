import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase.config'
import type { OperacionEconomica } from '@/models/operacionesEconomicas'

const REINTENTO_MS = 3000
const MAX_REINTENTOS = 10

/**
 * Operación económica en tiempo real. La genera el servidor al finalizar el
 * paseo: mientras no exista, las reglas niegan la lectura, así que se
 * reintenta unos segundos antes de reportar error.
 */
export function useOperacionEconomica(operacionId: string | null) {
  const [operacion, setOperacion] = useState<OperacionEconomica | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!operacionId) return undefined
    let cancelado = false
    let intentos = 0
    let unsub: (() => void) | null = null
    let temporizador: ReturnType<typeof setTimeout> | null = null

    const reintentar = (motivo: string) => {
      if (cancelado) return
      if (++intentos > MAX_REINTENTOS) {
        setError(motivo)
        return
      }
      temporizador = setTimeout(suscribir, REINTENTO_MS)
    }

    function suscribir() {
      unsub = onSnapshot(
        doc(db, 'operaciones_economicas', operacionId as string),
        snap => {
          // Si no existe y se pudo leer, el listener sigue activo y avisará
          // cuando el servidor la cree
          if (snap.exists()) {
            setOperacion(snap.data() as OperacionEconomica)
            setError(null)
          }
        },
        // Un error cierra el listener: se vuelve a suscribir
        err => reintentar(err.message)
      )
    }

    suscribir()
    return () => {
      cancelado = true
      if (temporizador) clearTimeout(temporizador)
      if (unsub) unsub()
    }
  }, [operacionId])

  return { operacion, error }
}
