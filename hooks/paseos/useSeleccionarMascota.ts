import { useState, useCallback } from 'react'
import { Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useMascotas } from '@/hooks/useMascotas'
import { MAX_MASCOTAS_POR_PASEO } from '@/constants/limits'
import { MOCK_MASCOTAS } from '@/mocks/paseos.mock'

export const useSeleccionarMascota = (initialSelectedIds: string[] = []) => {
  const { t } = useTranslation()
  const { mascotas: mascotasReales } = useMascotas()
  // Mock data as per incremental strategy
  const [mascotas, setMascotas] = useState(MOCK_MASCOTAS)
  const [mascotasSeleccionadas, setMascotasSeleccionadas] = useState<string[]>(initialSelectedIds)

  const toggleMascota = useCallback((id: string) => {
    setMascotasSeleccionadas(prev => {
      if (prev.includes(id)) {
        return prev.filter(p => p !== id)
      }
      if (prev.length >= MAX_MASCOTAS_POR_PASEO) {
        Alert.alert(
          t('paseos:errores.LIMITE_DE_MASCOTAS_SUPERADO'),
          '',
          [{ text: 'OK' }]
        )
        return prev
      }
      return [...prev, id]
    })
  }, [t])

  return {
    mascotas,
    mascotasSeleccionadas,
    toggleMascota
  }
}
