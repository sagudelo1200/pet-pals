import { useState, useCallback } from 'react'
import { useMascotas } from '@/hooks/useMascotas'
import { MOCK_CUIDADORES } from '@/mocks/paseos.mock'
import { ServicioPaseo } from '@/services/firebase/paseo'
import { PaseoStatus } from '@/models/Paseo'

interface ConfirmarPaseoProps {
  petIds: string[]
  walkerId: string | null
  fecha: Date | null
  hora: string | null
}

export const useConfirmarPaseo = ({ petIds, walkerId, fecha, hora }: ConfirmarPaseoProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { mascotas: todasLasMascotas } = useMascotas()

  // Obtener datos completos de los ID
  const mascotas = todasLasMascotas.filter(p => petIds.includes(p.id))
  const cuidador = MOCK_CUIDADORES.find(w => w.id === walkerId)

  // Cálculo simple de costos (Simulado)
  const tarifaBase = cuidador?.tarifa || 0
  const tarifaMascotaAdicional = 5000 // Mock value
  const numMascotas = mascotas.length
  
  // Si es más de una, sumamos extra por cada adicional
  const total = numMascotas > 0 
    ? tarifaBase + ((numMascotas - 1) * tarifaMascotaAdicional)
    : 0

  const confirmarReserva = useCallback(async () => {
    if (!fecha || !hora) {
      setError('Fecha y hora requeridas')
      return false
    }

    setLoading(true)
    setError(null)
    
    try {
      // Combinar fecha y hora
      const fechaInicio = new Date(fecha)
      const [hours, minutes] = hora.split(':').map(Number)
      fechaInicio.setHours(hours, minutes, 0, 0)

      const result = await ServicioPaseo.crearConMascotas({
        tipo_paseo: 'solicitado', // O 'programado' según lógica de negocio, por ahora solicitado
        estado: PaseoStatus.PENDIENTE,
        fecha_hora_inicio: fechaInicio,
        duracion_estimada: 60, // Default 1h o seleccionar
        precio: total,
        ubicacion_inicio: 'Ubicación actual', // TODO: Obtener ubicación real
        id_cuidador: walkerId || undefined,
        es_multiple: mascotas.length > 1,
        cupo_maximo_mascotas: mascotas.length // Por defecto el tamaño del grupo
      }, petIds)

      if (!result.success) {
        throw new Error(result.error)
      }

      return true
    } catch (e: any) {
      console.error('Error creando paseo:', e)
      setError(e.message || 'Error desconocido')
      return false
    } finally {
      setLoading(false)
    }
  }, [fecha, hora, total, walkerId, petIds, mascotas.length])

  return {
    mascotas,
    cuidador,
    total,
    loading,
    error,
    confirmarReserva
  }
}
