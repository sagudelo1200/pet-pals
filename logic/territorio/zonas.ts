/**
 * Zonas para las pantallas: combina los documentos de `territorio` (oferta y
 * demanda en R8, lo observado en R9) en una vista por celda.
 */
import {
  calcularIndices,
  type CeldaTerritorial,
  type Narrativa,
  type SeveridadIncidente,
} from '@/functions/src/compartido/territorio'
import type { NarrativaVista, ZonaH3 } from '@/models/ZonaH3'

/**
 * Cuántos datos respaldan lo observado: momentos de la bitácora más incidentes.
 * @param narrativa Lo observado en la zona.
 */
export function datosDe(narrativa: Narrativa): number {
  const incidentes = Object.values(narrativa.incidentes ?? {}).reduce<number>(
    (suma, n) => suma + (n ?? 0),
    0
  )
  return narrativa.total_eventos + incidentes
}

/**
 * Lo observado listo para mostrar: sin índices si la zona no llega al mínimo de
 * datos (así ninguna pantalla muestra un bienestar de 100 por un solo momento).
 * @param narrativa Lo observado, o undefined si no hay nada.
 * @param minimo Datos mínimos para mostrar los índices.
 */
export function vistaDeNarrativa(
  narrativa: Narrativa | undefined,
  minimo: number
): NarrativaVista | undefined {
  if (!narrativa) return undefined
  if (datosDe(narrativa) >= minimo) return narrativa
  const { indices: _sinDatos, ...resto } = narrativa
  return resto
}

/**
 * Suma la narrativa de varias microzonas en una sola (la de su celda de
 * cobertura). La identidad es la de la microzona con más eventos.
 * @param narrativas Narrativas de las microzonas.
 * @returns La narrativa conjunta, o undefined si no hay ninguna.
 */
export function sumarNarrativas(
  narrativas: readonly Narrativa[]
): Narrativa | undefined {
  if (narrativas.length === 0) return undefined
  const eventos_por_tipo: Record<string, number> = {}
  const incidentes: Partial<Record<SeveridadIncidente, number>> = {}
  let total_eventos = 0
  for (const n of narrativas) {
    total_eventos += n.total_eventos
    for (const [tipo, cantidad] of Object.entries(n.eventos_por_tipo)) {
      eventos_por_tipo[tipo] = (eventos_por_tipo[tipo] ?? 0) + cantidad
    }
    for (const [gravedad, cantidad] of Object.entries(n.incidentes ?? {})) {
      const clave = gravedad as SeveridadIncidente
      incidentes[clave] = (incidentes[clave] ?? 0) + (cantidad ?? 0)
    }
  }
  const principal = [...narrativas].sort(
    (a, b) => b.total_eventos - a.total_eventos
  )[0]
  return {
    identidad: principal.identidad,
    indices: calcularIndices(eventos_por_tipo, principal.identidad.tipo, incidentes),
    total_eventos,
    eventos_por_tipo,
    ...(Object.keys(incidentes).length > 0 && { incidentes }),
  }
}

/**
 * Vistas de zona a partir de los documentos de `territorio`: una por cada
 * celda de cobertura (R8) y una por cada microzona (R9). Cada microzona lleva
 * la oferta y demanda de la celda de cobertura que la contiene.
 * @param celdas Documentos de `territorio`.
 * @param minimoDatos Datos mínimos de una zona para mostrar sus índices.
 * @returns Vistas, las de R8 primero.
 */
export function combinarZonas(
  celdas: readonly CeldaTerritorial[],
  minimoDatos = 0
): ZonaH3[] {
  const cobertura = new Map<string, CeldaTerritorial>()
  const micro: CeldaTerritorial[] = []
  for (const c of celdas) {
    if (c.res === 8) cobertura.set(c.celda, c)
    else if (c.res === 9) micro.push(c)
  }

  const hijasDe = new Map<string, CeldaTerritorial[]>()
  for (const m of micro) {
    hijasDe.set(m.padre_r8, [...(hijasDe.get(m.padre_r8) ?? []), m])
  }

  // Toda celda de cobertura con datos propios o con microzonas observadas
  const padres = new Set([...cobertura.keys(), ...hijasDe.keys()])
  const vistasR8: ZonaH3[] = [...padres].map(celda => ({
    id: celda,
    nivel: 8,
    h3_r8: celda,
    operativa: cobertura.get(celda)?.operativa,
    interes: cobertura.get(celda)?.interes,
    narrativa: vistaDeNarrativa(
      sumarNarrativas(
        (hijasDe.get(celda) ?? []).flatMap(m =>
          m.narrativa ? [m.narrativa] : []
        )
      ),
      minimoDatos
    ),
  }))

  const vistasR9: ZonaH3[] = micro.map(m => ({
    id: m.celda,
    nivel: 9,
    h3_r8: m.padre_r8,
    h3_r9: m.celda,
    operativa: cobertura.get(m.padre_r8)?.operativa,
    narrativa: vistaDeNarrativa(m.narrativa, minimoDatos),
  }))

  return [...vistasR8, ...vistasR9]
}
