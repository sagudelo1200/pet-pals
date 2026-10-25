import { useEffect, useMemo, useState } from 'react'
import { useZonasH3 } from './useZonasH3'
import { useZonasNegocio } from './useZonasNegocio'
import {
  SIN_ZONA,
  ciudadesDe,
  filtrarPorCiudad,
} from '@/logic/territorio/zonasDeNegocio'

/**
 * Territorio para el mapa del admin, filtrado por ciudad. Las ciudades salen
 * de las zonas de negocio; mientras no haya ninguna se muestra todo.
 */
export function useZonasH3Filtrado() {
  const territorio = useZonasH3()
  const negocio = useZonasNegocio()
  const [seleccion, setSeleccion] = useState('')

  const hayZonas = negocio.zonas.length > 0
  const ciudades = useMemo(() => {
    if (!hayZonas) return []
    const conZona = ciudadesDe(negocio.zonas)
    const haySinZona = territorio.zonas.some(
      v => filtrarPorCiudad([v], SIN_ZONA, negocio.zonas, negocio.mapa).length > 0
    )
    return haySinZona ? [...conZona, SIN_ZONA] : conZona
  }, [hayZonas, negocio.zonas, negocio.mapa, territorio.zonas])

  // La ciudad elegida debe existir; si no, la primera
  const ciudadSeleccionada = ciudades.includes(seleccion)
    ? seleccion
    : (ciudades[0] ?? '')

  useEffect(() => {
    if (ciudadSeleccionada !== seleccion) setSeleccion(ciudadSeleccionada)
  }, [ciudadSeleccionada, seleccion])

  const zonas = useMemo(
    () =>
      hayZonas
        ? filtrarPorCiudad(
            territorio.zonas,
            ciudadSeleccionada,
            negocio.zonas,
            negocio.mapa
          )
        : territorio.zonas,
    [hayZonas, territorio.zonas, ciudadSeleccionada, negocio.zonas, negocio.mapa]
  )

  return {
    zonas,
    ciudades,
    ciudadSeleccionada,
    setCiudadSeleccionada: setSeleccion,
    cargando: territorio.cargando || negocio.cargando,
    error: territorio.error ?? negocio.error,
    totalZonas: territorio.zonas.length,
  }
}
