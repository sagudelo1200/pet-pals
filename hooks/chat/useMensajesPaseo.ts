import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import { Mensaje, Conversacion } from '@/models/Chat'
import { ServicioChat } from '@/services/firebase'
import { toDomain } from '@/services/firebase/comun'

/**
 * Hook realtime para mensajes de un paseo.
 * Setup: conversación → listener → enviarMensaje + marcar leído
 */
export function useMensajesPaseo(paseoId: string | undefined) {
  const [conversacion, setConversacion] = useState<Conversacion | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Obtener conversación por paseo_id (una sola vez)
  useEffect(() => {
    if (!paseoId) {
      setLoading(false)
      setConversacion(null)
      return undefined
    }

    let unmounted = false

    ;(async () => {
      try {
        const result = await ServicioChat.obtenerPorPaseoId(paseoId)
        if (result.success && result.data && !unmounted) {
          setConversacion(result.data)
          setLoading(false)
        } else if (!result.success && !unmounted) {
          // Conversación aún no existe (paseo no confirmado, o no hay permisos)
          // Tratamos "PERMISOS_INSUFICIENTES" y "DOCUMENTO_NO_ENCONTRADO" como "conversación no existe aún"
          const esPermisosONoEncontrado =
            result.error?.includes('PERMISOS_INSUFICIENTES') ||
            result.error?.includes('DOCUMENTO_NO_ENCONTRADO')

          console.log(
            '[useMensajesPaseo] Conversación no encontrada para paseo:',
            paseoId,
            'Error:',
            result.error
          )
          setConversacion(null)
          setError(
            esPermisosONoEncontrado
              ? 'Paseo no confirmado aún. El chat se activará cuando sea confirmado.'
              : result.error
          )
          setLoading(false)
        }
      } catch (err) {
        if (!unmounted) {
          console.error(
            '[useMensajesPaseo] Error obteniendo conversación:',
            err
          )
          setError(String(err))
          setLoading(false)
        }
      }
    })()

    return (() => {
      unmounted = true
    }) as any
  }, [paseoId])

  // Setup listener para mensajes de la conversación
  useEffect(() => {
    if (!conversacion?.id) {
      setMensajes([])
      setLoading(false)
      return undefined
    }

    const msgRef = collection(db, 'conversaciones', conversacion.id, 'mensajes')
    const q = query(msgRef, orderBy('creado_en', 'asc'), limit(100))

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        try {
          const serverMensajes: Mensaje[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...(toDomain(doc.data()) as any),
          }))
          setMensajes(serverMensajes)
          setError(null)
          setLoading(false)
        } catch (err) {
          setError(String(err))
          setLoading(false)
        }
      },
      error => {
        setError(String(error))
        setLoading(false)
      }
    )

    return unsubscribe as any
  }, [conversacion?.id])

  /**
   * Enviar mensaje en la conversación
   */
  const enviarMensaje = useCallback(
    async (contenido: string) => {
      if (!conversacion?.id) {
        setError('Conversación no disponible')
        return false
      }

      if (!contenido?.trim()) {
        setError('Mensaje vacío')
        return false
      }

      setEnviando(true)
      try {
        const result = await ServicioChat.enviarMensaje(
          conversacion.id,
          contenido
        )

        if (result.success) {
          setError(null)
          setEnviando(false)
          return true
        } else {
          setError(result.error)
          setEnviando(false)
          return false
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        setError(errorMsg)
        setEnviando(false)
        return false
      }
    },
    [conversacion?.id]
  )

  /**
   * Marcar mensaje como leído
   */
  const marcarComoLeido = useCallback(
    async (mensajeId: string) => {
      if (!conversacion?.id) return false

      try {
        const result = await ServicioChat.marcarComoLeido(
          conversacion.id,
          mensajeId
        )
        return result.success
      } catch (err) {
        console.error('Error marcando como leído:', err)
        return false
      }
    },
    [conversacion?.id]
  )

  /**
   * Obtener cantidad de mensajes no leídos
   */
  const obtenerNoLeidos = useCallback(async () => {
    if (!conversacion?.id) return 0

    try {
      const result = await ServicioChat.obtenerNoLeidosPorUsuario(
        conversacion.id
      )
      return result.success ? result.data : 0
    } catch (err) {
      console.error('Error obteniendo no leídos:', err)
      return 0
    }
  }, [conversacion?.id])

  return {
    conversacion,
    mensajes,
    loading,
    error,
    enviando,
    enviarMensaje,
    marcarComoLeido,
    obtenerNoLeidos,
  }
}
