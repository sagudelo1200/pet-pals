import { useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ServicioExploracionTerritorial } from '@/services/firebase'
import { ExploracionTerritorial } from '@/models/ExploracionTerritorial'
import { useUbicacionDispositivo } from '../useUbicacionDispositivo'
import {
  HUELLAS_INMEDIATAS_POR_CAPTURA,
  ESTADO_INICIAL_EXPLORACION,
} from '@/constants'

interface CapturPayload {
  tipo_punto: ExploracionTerritorial['tipo_punto']
  mascotas_visibles: number
  flujo_peatonal: ExploracionTerritorial['flujo_peatonal']
  observaciones?: string
  foto_url?: string
}

export function useExploracionTerritorial() {
  const { user } = useAuth()
  const { obtenerPosicion } = useUbicacionDispositivo()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Capturar una observación territorial
   */
  const capturar = useCallback(
    async (payload: CapturPayload): Promise<ExploracionTerritorial | null> => {
      setLoading(true)
      setError(null)

      try {
        if (!user?.uid) {
          throw new Error('Usuario no autenticado')
        }

        // Obtener posición actual del dispositivo
        const position = await obtenerPosicion()
        if (!position) {
          throw new Error('No se pudo obtener la ubicación')
        }

        const { latitude, longitude } = position.coords

        // Preparar datos
        // NOTA: NO calculamos H3 aquí. El Servicio es responsable de toda decisión territorial.
        const dataToSave = {
          id_explorador: user.uid,
          coordenadas: {
            latitude,
            longitude,
          },
          tipo_punto: payload.tipo_punto,
          mascotas_visibles: payload.mascotas_visibles,
          flujo_peatonal: payload.flujo_peatonal,
          observaciones: payload.observaciones || '',
          foto_url: payload.foto_url || '',
          estado: ESTADO_INICIAL_EXPLORACION,
          huellas_inmediatas: HUELLAS_INMEDIATAS_POR_CAPTURA,
        }

        // Guardar en Firestore
        const result = await ServicioExploracionTerritorial.crear(
          dataToSave as any,
          user.uid
        )

        if (!result.success) {
          throw new Error(
            result.error || 'Error desconocido al crear exploración'
          )
        }

        console.log(
          '[useExploracionTerritorial] Exploración guardada exitosamente con creado_por:',
          user.uid
        )
        return result.data || null
      } catch (err: any) {
        const errorMsg = err.message || 'Error al capturar exploración'
        setError(errorMsg)
        console.error('[useExploracionTerritorial] Error completo:', {
          message: err.message,
          code: err.code,
          stack: err.stack,
        })
        return null
      } finally {
        setLoading(false)
      }
    },
    [user, obtenerPosicion]
  )

  return {
    capturar,
    loading,
    error,
    limpiarError: () => setError(null),
  }
}
