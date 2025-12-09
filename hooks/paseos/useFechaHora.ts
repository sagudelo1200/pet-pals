import { useState } from 'react'

export type Periodo = 'manana' | 'tarde' | 'noche'

interface UseFechaHoraProps {
  initialDate?: Date | null
  initialTime?: string | null
}

export const useFechaHora = ({
  initialDate,
  initialTime,
}: UseFechaHoraProps = {}) => {
  const [fecha, setFecha] = useState<Date | undefined>(initialDate || undefined)
  const [hora, setHora] = useState<string | null>(initialTime || null)

  // Calcular periodo inicial basado en la hora guardada
  const getInitialPeriod = (): Periodo | null => {
    if (!initialTime) return null
    // Simple check based on known slots
    if (['07:00', '08:00', '09:00', '10:00', '11:00'].includes(initialTime))
      return 'manana'
    if (
      ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].includes(
        initialTime
      )
    )
      return 'tarde'
    if (['18:00', '19:00', '20:00'].includes(initialTime)) return 'noche'
    return null
  }

  const [periodo, setPeriodo] = useState<Periodo | null>(getInitialPeriod())

  // Slots hardcoded por ahora
  const slotsPorPeriodo: Record<Periodo, string[]> = {
    manana: ['07:00', '08:00', '09:00', '10:00', '11:00'],
    tarde: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
    noche: ['18:00', '19:00', '20:00'],
  }

  const seleccionarFecha = (date: Date) => {
    setFecha(date)
  }

  // Acepta un periodo o null para limpiar selección de periodo sin tocar la hora
  const seleccionarPeriodo = (p: Periodo | null) => {
    if (p === null) {
      setPeriodo(null)
      return
    }

    if (periodo !== p) {
      setPeriodo(p)
      setHora(null) // Reset hora al cambiar periodo
    }
  }

  const seleccionarHora = (h: string | null) => {
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
    esValido,
  }
}
