import { useState, useEffect } from 'react'
import { Paseo } from '@/models/Paseo'
import { useSeguimientoPaseo } from './useSeguimientoPaseo'
import { iniciarSincronizador, EventoPaseo } from '@/logic/paseos/sincronizador'

/**
 * Hook "Sincronizador".
 * Su responsabilidad es escuchar Firebase y mantener actualizado al Singleton `GestorPaseos.paseoActivo`.
 * También devuelve los datos crudos para quien lo invoca (legacy support).
 *
 * @param paseoId ID del paseo a sincronizar
 */
export const useSincronizadorPaseo = (paseoId: string) => {
  const [paseo, setPaseo] = useState<Paseo | null>(null)
  const [loading, setLoading] = useState(true)
  const [eventos, setEventos] = useState<EventoPaseo[]>([])

  // Integración con Realtime Database para el tracking
  // Nota: Esto quizás debería moverse a otro lado si queremos desacoplar totalmente,
  // pero por ahora lo mantenemos aquí para no romper funcionalidad.
  const { ubicacionActual, ruta } = useSeguimientoPaseo(paseoId)

  useEffect(() => {
    if (!paseoId) return () => {}

    setLoading(true)
    const unsub = iniciarSincronizador(paseoId, {
      onPaseo: p => {
        setPaseo(p)
        setLoading(false)
      },
      onEventos: ev => setEventos(ev),
      onError: err => {
        console.error('[useSincronizadorPaseo] Error sincronizador:', err)
        setLoading(false)
      },
    })

    return () => {
      try {
        unsub()
      } catch (_e) {
        // Ignorar errores en limpieza
        console.error('[useSincronizadorPaseo] Error al limpiar sincronizador')
      }
    }
  }, [paseoId])

  return {
    paseo,
    loading,
    eventos,
    ruta,
    ubicacionActual,
  }
}
