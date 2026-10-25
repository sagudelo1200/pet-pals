/**
 * Zonas de negocio para las pantallas: a qué zona pertenece una celda, cuántas
 * zonas hay por ciudad y cómo va cada zona.
 */
import {
  resolverZonaId,
  type EntradaCeldaZona,
  type Zona,
} from '@/functions/src/compartido/zonas'
import type { CeldaTerritorial } from '@/functions/src/compartido/territorio'
import type { ZonaH3 } from '@/models/ZonaH3'

/** `celdas_zona` como mapa `celda → entrada`. */
export type MapaCeldasZona = ReadonlyMap<string, EntradaCeldaZona>

/** Etiqueta de lo que no pertenece a ninguna zona. */
export const SIN_ZONA = 'Sin zona'

/**
 * Arma el mapa de celdas a partir de los documentos de `celdas_zona`.
 * @param docs Documentos con el id de su celda.
 */
export function mapaDeCeldas(
  docs: ReadonlyArray<EntradaCeldaZona & { celda: string }>
): MapaCeldasZona {
  return new Map(
    docs.map(({ celda, zona_id, excluida_de }) => [
      celda,
      excluida_de !== undefined ? { zona_id, excluida_de } : { zona_id },
    ])
  )
}

/**
 * Zona de una celda (gana la celda más específica con dueña).
 * @returns Id de la zona, o null si no pertenece a ninguna.
 */
export function zonaDeCelda(celda: string, mapa: MapaCeldasZona): string | null {
  return resolverZonaId(celda, c => mapa.get(c))
}

/** Ciudades que tienen zonas, sin repetir y en orden. */
export function ciudadesDe(zonas: readonly Zona[]): string[] {
  return [...new Set(zonas.map(z => z.ciudad))].sort((a, b) =>
    a.localeCompare(b, 'es')
  )
}

/**
 * Deja solo las vistas del territorio que están en una ciudad. `SIN_ZONA` deja
 * las que no pertenecen a ninguna zona.
 */
export function filtrarPorCiudad(
  vistas: readonly ZonaH3[],
  ciudad: string,
  zonas: readonly Zona[],
  mapa: MapaCeldasZona
): ZonaH3[] {
  const ciudadDe = new Map(zonas.map(z => [z.id, z.ciudad]))
  return vistas.filter(v => {
    const zonaId = zonaDeCelda(v.id, mapa)
    const ciudadVista = zonaId ? ciudadDe.get(zonaId) : undefined
    return ciudad === SIN_ZONA ? !ciudadVista : ciudadVista === ciudad
  })
}

export interface ResumenZona {
  zona: Zona
  /** Celdas de cobertura de la zona que tienen datos. */
  celdas: number
  /** Pedidos pendientes. */
  demanda: number
  paseosActivos: number
  paseosTotal: number
  /** Cuidadores verificados que cubren una celda, en promedio. */
  coberturaMedia: number
  /** Celdas con pedidos y ningún cuidador. */
  celdasSinCobertura: number
}

/**
 * Cómo va cada zona: suma lo de sus celdas de cobertura. Los cuidadores no se
 * suman (uno cubre varias celdas y se contaría varias veces): se da la
 * cobertura media por celda.
 */
export function resumenPorZona(
  zonas: readonly Zona[],
  celdas: readonly CeldaTerritorial[],
  mapa: MapaCeldasZona
): ResumenZona[] {
  const acumulado = new Map<string, Omit<ResumenZona, 'zona'> & { cuidadores: number }>()
  for (const c of celdas) {
    if (c.res !== 8 || !c.operativa) continue
    const zonaId = zonaDeCelda(c.celda, mapa)
    if (!zonaId) continue
    const a = acumulado.get(zonaId) ?? {
      celdas: 0,
      demanda: 0,
      paseosActivos: 0,
      paseosTotal: 0,
      coberturaMedia: 0,
      celdasSinCobertura: 0,
      cuidadores: 0,
    }
    a.celdas += 1
    a.demanda += c.operativa.demanda_total
    a.paseosActivos += c.operativa.paseos_activos
    a.paseosTotal += c.operativa.paseos_total
    a.cuidadores += c.operativa.cuidadores_count
    if (c.operativa.estado === 'sin_cobertura') a.celdasSinCobertura += 1
    acumulado.set(zonaId, a)
  }

  return zonas.map(zona => {
    const { cuidadores, ...resto } = acumulado.get(zona.id) ?? {
      celdas: 0,
      demanda: 0,
      paseosActivos: 0,
      paseosTotal: 0,
      coberturaMedia: 0,
      celdasSinCobertura: 0,
      cuidadores: 0,
    }
    return {
      zona,
      ...resto,
      coberturaMedia: resto.celdas ? cuidadores / resto.celdas : 0,
    }
  })
}

export interface ResumenSinServicio {
  /** Tutores que intentaron pedir un paseo donde no se atiende. */
  tutores: number
  /** Cuidadores que viven donde no se atiende. */
  cuidadores: number
  /** Celdas de cobertura con interesados. */
  celdas: number
}

/**
 * Cuánto interés hay donde todavía no se atiende: celdas con interesados que
 * están fuera de toda zona o en una zona cerrada.
 */
export function resumenSinServicio(
  zonas: readonly Zona[],
  celdas: readonly CeldaTerritorial[],
  mapa: MapaCeldasZona
): ResumenSinServicio {
  const estadoDe = new Map(zonas.map(z => [z.id, z.estado]))
  const resumen: ResumenSinServicio = { tutores: 0, cuidadores: 0, celdas: 0 }
  for (const c of celdas) {
    const interes = c.interes
    if (c.res !== 8 || !interes || interes.tutores + interes.cuidadores === 0) {
      continue
    }
    const zonaId = zonaDeCelda(c.celda, mapa)
    const estado = zonaId ? estadoDe.get(zonaId) : undefined
    if (estado === 'activa' || estado === 'piloto') continue
    resumen.tutores += interes.tutores
    resumen.cuidadores += interes.cuidadores
    resumen.celdas += 1
  }
  return resumen
}
