import { useState } from 'react'

export type Periodo = 'manana' | 'tarde' | 'noche'

export const useFechaHora = () => {
  const [fecha, setFecha] = useState<Date | undefined>(undefined)
  const [periodo, setPeriodo] = useState<Periodo | null>(null)
  const [hora, setHora] = useState<string | null>(null)

  // Slots hardcoded por ahora
  const slotsPorPeriodo: Record<Periodo, string[]> = {
    manana: ['07:00', '08:00', '09:00', '10:00', '11:00'],
    tarde: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
    noche: ['18:00', '19:00', '20:00'],
  }

  const seleccionarFecha = (date: Date) => {
    setFecha(date)
  }

  const seleccionarPeriodo = (p: Periodo) => {
    if (periodo !== p) {
      setPeriodo(p)
      setHora(null) // Reset hora al cambiar periodo
    }
  }

  const seleccionarHora = (h: string) => {
    setHora(h)
  }

  const esValido = !!fecha && !!hora

  return {
    fecha,
    periodo,
    hora,
    slotsPorPeriodo,
    seleccionarFecha,
    seleccionarPeriodo,
    seleccionarHora,
    esValido
  }
}
