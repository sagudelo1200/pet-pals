import { useState } from 'react'
import { MOCK_CUIDADORES } from '@/mocks/paseos.mock'

export const useSeleccionarCuidador = () => {
  // En el futuro, aquí se filtrarían cuidadores según ubicación, disponibilidad, etc.
  const [cuidadores, setCuidadores] = useState(MOCK_CUIDADORES)
  const [cuidadorSeleccionado, setCuidadorSeleccionado] = useState<string | null>(null)

  const seleccionarCuidador = (id: string) => {
    setCuidadorSeleccionado(id)
  }

  return {
    cuidadores,
    cuidadorSeleccionado,
    seleccionarCuidador
  }
}
