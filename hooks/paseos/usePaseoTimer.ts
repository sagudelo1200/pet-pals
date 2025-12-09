import { useState, useEffect, useRef } from 'react'
import { PaseoStatus } from '@/models/Paseo'

export function usePaseoTimer(estado: PaseoStatus, fechaInicio?: Date | null) {
  const [segundos, setSegundos] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (estado === PaseoStatus.EN_PROGRESO && fechaInicio) {
      // Asegurar que fechaInicio sea un objeto Date
      const start =
        fechaInicio instanceof Date ? fechaInicio : new Date(fechaInicio)

      // Función para actualizar el tiempo
      const updateTime = () => {
        const now = new Date()
        const diff = Math.max(
          0,
          Math.floor((now.getTime() - start.getTime()) / 1000)
        )
        setSegundos(diff)
      }

      // Actualizar inmediatamente
      updateTime()

      // Iniciar intervalo
      intervalRef.current = setInterval(updateTime, 1000)
    } else {
      // Limpiar si no está en progreso
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      // Si no está en progreso, reseteamos a 0 (o podríamos mantener el último valor si quisiéramos)
      if (estado !== PaseoStatus.EN_PROGRESO) {
        setSegundos(0)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [estado, fechaInicio])

  // Formatear a HH:MM:SS
  const formatoTiempo = () => {
    const hrs = Math.floor(segundos / 3600)
    const mins = Math.floor((segundos % 3600) / 60)
    const secs = segundos % 60

    const h = hrs.toString().padStart(2, '0')
    const m = mins.toString().padStart(2, '0')
    const s = secs.toString().padStart(2, '0')

    return `${h}:${m}:${s}`
  }

  return {
    tiempo: formatoTiempo(),
    segundos,
  }
}
