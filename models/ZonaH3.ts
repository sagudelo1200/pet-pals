/**
 * Territorio en la app.
 *
 * Lo que existe en Firestore es `territorio/{celda}` (ver
 * functions/src/compartido/territorio.ts): oferta y demanda en las celdas de
 * cobertura (R8) y lo observado en las microzonas (R9). Solo lo escribe el
 * servidor; la app lo lee.
 *
 * `ZonaH3` es la VISTA que usan las pantallas: una celda con su oferta y
 * demanda y con lo observado en ella, ya combinados (ver
 * logic/territorio/zonas.ts).
 */
import type {
  Narrativa,
  Operativa,
  ResumenInteres,
} from '@/functions/src/compartido/territorio'

export type {
  CeldaTerritorial,
  EstadoCelda,
  Identidad,
  Indices,
  Narrativa,
  Operativa,
  ResumenInteres,
} from '@/functions/src/compartido/territorio'

export interface ZonaH3 {
  /** Id de la celda que representa esta vista. */
  id: string
  /** Escala de la vista: 8 (cobertura) o 9 (microzona). */
  nivel: 8 | 9
  /** Celda de cobertura (la misma celda si el nivel es 8). */
  h3_r8: string
  /** Microzona (solo en el nivel 9). */
  h3_r9?: string
  /** Lo observado en la celda (en el nivel 8, la suma de sus microzonas). */
  narrativa?: Narrativa
  /** Oferta y demanda de la celda de cobertura. */
  operativa?: Operativa
  /** Quiénes piden o ofrecen servicio donde aún no se atiende (nivel 8). */
  interes?: ResumenInteres
}
