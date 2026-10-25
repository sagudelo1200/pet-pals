/**
 * Zonas para las pantallas: combina los documentos de `territorio` (oferta y
 * demanda en R8, lo observado en R9) en una vista por celda.
 */
import {
  calcularIndices,
  type CeldaTerritorial,
  type Narrativa,
} from '@/functions/src/compartido/territorio'
import type { ZonaH3 } from '@/models/ZonaH3'

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
  let total_eventos = 0
  for (const n of narrativas) {
    total_eventos += n.total_eventos
    for (const [tipo, cantidad] of Object.entries(n.eventos_por_tipo)) {
      eventos_por_tipo[tipo] = (eventos_por_tipo[tipo] ?? 0) + cantidad
    }
  }
  const principal = [...narrativas].sort(
    (a, b) => b.total_eventos - a.total_eventos
  )[0]
  return {
    identidad: principal.identidad,
    indices: calcularIndices(eventos_por_tipo, principal.identidad.tipo),
    total_eventos,
    eventos_por_tipo,
  }
}

/**
 * Vistas de zona a partir de los documentos de `territorio`: una por cada
 * celda de cobertura (R8) y una por cada microzona (R9). Cada microzona lleva
 * la oferta y demanda de la celda de cobertura que la contiene.
 * @param celdas Documentos de `territorio`.
 * @returns Vistas, las de R8 primero.
 */
export function combinarZonas(celdas: readonly CeldaTerritorial[]): ZonaH3[] {
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
    narrativa: sumarNarrativas(
      (hijasDe.get(celda) ?? []).flatMap(m => (m.narrativa ? [m.narrativa] : []))
    ),
  }))

  const vistasR9: ZonaH3[] = micro.map(m => ({
    id: m.celda,
    nivel: 9,
    h3_r8: m.padre_r8,
    h3_r9: m.celda,
    operativa: cobertura.get(m.padre_r8)?.operativa,
    narrativa: m.narrativa,
  }))

  return [...vistasR8, ...vistasR9]
}
