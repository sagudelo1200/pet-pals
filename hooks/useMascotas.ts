import { useContext } from 'react'
import { MascotasContext } from '@/context/MascotasContext'
import type { Mascota } from '@/models/Mascota'

interface UseMascotasReturn {
  mascotas: Mascota[]
  loading: boolean
  error: string | null
  refrescar: () => Promise<void>
  // eslint-disable-next-line
  crear: (data: Partial<Mascota>) => Promise<void>
  // eslint-disable-next-line
  actualizar: (id: string, data: Partial<Mascota>) => Promise<void>
  // eslint-disable-next-line
  eliminar: (id: string) => Promise<void>
}

export const useMascotas = (): UseMascotasReturn => {
  const context = useContext(MascotasContext)
  
  if (context === undefined) {
    throw new Error('useMascotas must be used within a MascotasProvider')
  }

  return context
}
