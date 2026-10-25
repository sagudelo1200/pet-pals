/**
 * Fachada de la app sobre la geografía compartida
 * (functions/src/compartido/geografia.ts): ahí viven los roles de resolución y
 * las funciones de celdas. Aquí quedan los nombres que ya usa la app y lo que
 * solo le importa a la app (densificar rutas del mapa).
 */
import { latLngToCell } from 'h3-js'
import {
  RADIO_COBERTURA,
  RESOLUCIONES,
  celdaDe,
  celdasAlrededor,
  distanciaKmEntreCeldas,
  distanciaMetros,
  type Coordenada,
  type RolResolucion,
} from '@/functions/src/compartido/geografia'
import { estadoDeCelda } from '@/functions/src/compartido/territorio'

export {
  RESOLUCIONES,
  RADIO_COBERTURA,
  celdaDe,
  padreDe,
  esCeldaValida,
  type RolResolucion,
} from '@/functions/src/compartido/geografia'
export type { EstadoCelda as EstadoZona } from '@/functions/src/compartido/territorio'

/** Resolución estándar de la app: la de cobertura (R8, ~460 m). */
export const RESOLUCION_H3_DEFAULT = RESOLUCIONES.cobertura
/** Anillos de cobertura de un cuidador (19 celdas, ~2 km). */
export const RADIO_COBERTURA_DEFAULT = RADIO_COBERTURA

export type CoordenadaGeo = Coordenada

/**
 * Celda de un punto. Acepta un rol (`'cobertura'`, `'micro'`...) o, por
 * compatibilidad, una resolución numérica.
 */
export function coordsAH3(
  latitud: number,
  longitud: number,
  resolucion: RolResolucion | number = 'cobertura'
): string {
  return typeof resolucion === 'string'
    ? celdaDe(latitud, longitud, resolucion)
    : latLngToCell(latitud, longitud, resolucion)
}

/** Celdas del vecindario de una celda (k anillos, incluida ella). */
export function celdasDeCobertura(
  indiceCelda: string,
  radio = RADIO_COBERTURA_DEFAULT
): string[] {
  return celdasAlrededor(indiceCelda, radio)
}

/** Distancia en km entre los centros de dos celdas H3. */
export function distanciaKmEntreH3(celdaA: string, celdaB: string): number {
  return distanciaKmEntreCeldas(celdaA, celdaB)
}

/** Distancia en metros entre dos coordenadas (Haversine). */
export const haversineMetros = distanciaMetros

/** Estado de una celda según su oferta y demanda. */
export const calcularEstadoZona = estadoDeCelda

function interpolarSegmento(
  a: CoordenadaGeo,
  b: CoordenadaGeo,
  separacionMetros = 8
): CoordenadaGeo[] {
  const d = haversineMetros(a, b)
  const pasos = Math.min(Math.ceil(d / separacionMetros), 20)
  const puntos: CoordenadaGeo[] = []
  for (let i = 1; i <= pasos; i++) {
    const t = i / (pasos + 1)
    puntos.push({
      latitude: a.latitude + (b.latitude - a.latitude) * t,
      longitude: a.longitude + (b.longitude - a.longitude) * t,
    })
  }
  return puntos
}

/**
 * Densifica una ruta insertando puntos intermedios entre cada par de coordenadas.
 * Reduce los saltos visuales en la polyline del mapa durante el paseo.
 */
export function densificarRuta(ruta: CoordenadaGeo[]): CoordenadaGeo[] {
  if (!ruta || ruta.length < 2) return ruta
  const resultado: CoordenadaGeo[] = [ruta[0]]
  for (let i = 1; i < ruta.length; i++) {
    const intermedios = interpolarSegmento(ruta[i - 1], ruta[i])
    resultado.push(...intermedios)
    resultado.push(ruta[i])
  }
  return resultado
}
