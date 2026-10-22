import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { escucharConfiguracion } from '@/services/firebase/configuracion'
import {
  valoresPorDefecto,
  type AreaConfiguracion,
  type ConfiguracionAreas,
} from '@/functions/src/compartido/configuracion'

/**
 * Valores de un área de configuración, en tiempo real. Empieza con los
 * valores del catálogo, así nunca hay que esperar ni manejar null. Se vuelve
 * a suscribir al cambiar la sesión (sin sesión las reglas niegan la lectura).
 */
export function useConfiguracion<A extends AreaConfiguracion>(
  area: A
): ConfiguracionAreas[A] {
  const uid = useAuth().user?.uid
  const [valores, setValores] = useState(() => valoresPorDefecto(area))

  useEffect(() => escucharConfiguracion(area, setValores), [area, uid])

  return valores
}
