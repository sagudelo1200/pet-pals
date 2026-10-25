import { useEffect, useState } from 'react'
import { consultarServicio } from '@/services/firebase/zonas'
import type { EstadoServicio } from '@/functions/src/compartido/zonas'

/**
 * ¿Se atiende en esta celda de cobertura? Lo responde el servidor (misma regla
 * que usa para aceptar pedidos). Si no se puede saber, se asume que sí: nunca
 * se avisa de "sin servicio" por un error de red.
 * @param celda Celda de cobertura, o null si no hay dirección.
 */
export function useEstadoDeServicio(celda: string | null) {
  const [servicio, setServicio] = useState<EstadoServicio | null>(null)

  useEffect(() => {
    setServicio(null)
    if (!celda) return undefined
    let vigente = true
    consultarServicio({ celda })
      .then(estado => {
        if (vigente) setServicio(estado)
      })
      .catch(error => {
        console.warn('[useEstadoDeServicio] No se pudo consultar:', error)
      })
    return () => {
      vigente = false
    }
  }, [celda])

  return servicio
}
