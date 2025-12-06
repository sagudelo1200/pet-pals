import { useState, useCallback } from 'react'
import { MOCK_MASCOTAS, MOCK_CUIDADORES } from '@/mocks/paseos.mock'

interface ConfirmarPaseoProps {
  petIds: string[]
  walkerId: string | null
  hora: string | null
}

export const useConfirmarPaseo = ({ petIds, walkerId, hora }: ConfirmarPaseoProps) => {
  const [loading, setLoading] = useState(false)

  // Obtener datos completos de los ID
  const mascotas = MOCK_MASCOTAS.filter(p => petIds.includes(p.id))
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
    setLoading(true)
    // Simular llamada API
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setLoading(false)
        resolve()
      }, 1500)
    })
  }, [])

  return {
    mascotas,
    cuidador,
    total,
    loading,
    confirmarReserva
  }
}
