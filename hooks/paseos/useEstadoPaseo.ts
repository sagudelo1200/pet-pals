import { useState, useRef, useCallback } from 'react'
import {
  crearMaquinaPaseo,
  MaquinaEstadosPaseo,
  PaseoEvent,
  TransitionPayload,
} from '@/logic/paseos/maquinaEstados'
import { Paseo, PaseoStatus } from '@/models/Paseo'
import { ServicioPaseo } from '@/services/firebase'

export function useEstadoPaseo(paseoInicial?: Partial<Paseo>) {
  // Referencia a la máquina para mantener la instancia entre renders
  const maquinaRef = useRef<MaquinaEstadosPaseo>(
    crearMaquinaPaseo(paseoInicial)
  )

  // Estado reactivo para la UI
  const [estado, setEstado] = useState<PaseoStatus>(maquinaRef.current.estado)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Verifica si una transición es posible desde el estado actual
   */
  const puede = useCallback((evento: PaseoEvent): boolean => {
    return maquinaRef.current.puede(evento)
  }, [])

  /**
   * Ejecuta una transición de estado y la persiste.
   */
  const transicion = useCallback(
    async (
      evento: PaseoEvent,
      payload?: TransitionPayload
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        setError(null)
        // 1. Validar y actualizar estado local (optimista)
        const anterior = maquinaRef.current.estado
        const nuevoEstado = maquinaRef.current.transicion(evento, payload)
        setEstado(nuevoEstado) // Actualización optimista

        // 2. Persistir si hay ID
        if (paseoInicial?.id) {
          setCargando(true)
          const res = await ServicioPaseo.actualizarEstado(
            paseoInicial.id,
            nuevoEstado,
            payload as any
          )

          if (!res.success) {
            // Revertir en caso de error
            console.error('Error persistiendo estado:', res.error)
            setError(res.error || 'Error al guardar el estado')
            // Revertir máquina (truco: crear nueva instancia con el anterior)
            maquinaRef.current = crearMaquinaPaseo({
              ...paseoInicial,
              estado: anterior,
            })
            setEstado(anterior)
            return { success: false, error: res.error }
          }
        }

        return { success: true }
      } catch (e: any) {
        setError(e.message)
        console.error('Error en transición/persistencia:', e)
        return { success: false, error: e.message }
      } finally {
        setCargando(false)
      }
    },
    [paseoInicial?.id]
  )

  /**
   * Reinicia la máquina con nuevos datos (útil cuando carga desde backend)
   */
  const sincronizar = useCallback((paseo: Partial<Paseo>) => {
    // Si el estado remoto es diferente al local, actualizamos
    if (paseo.estado && paseo.estado !== maquinaRef.current.estado) {
      maquinaRef.current = crearMaquinaPaseo(paseo)
      setEstado(maquinaRef.current.estado)
    }
  }, [])

  return {
    estado,
    cargando, // Nuevo
    error,
    puede,
    transicion,
    sincronizar,
  }
}
