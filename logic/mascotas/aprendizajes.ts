/**
 * Lo que la ficha del tutor muestra del expediente de su mascota (sin
 * pantallas ni Firebase).
 */
import { EMOJI_DE_LLEGADA } from '@/logic/paseos/llegada'
import type { Llegada } from '@/functions/src/compartido/expediente'
import type { Expediente } from '@/models/Expediente'

export interface LlegadaParaMostrar {
  paseo_id: string
  llegada: Llegada
  emoji: string
}

/**
 * Cómo ha llegado la mascota en los últimos paseos, del más reciente al más
 * antiguo. Ignora respuestas que no son del catálogo.
 * @param expediente Expediente de la mascota (puede no existir todavía).
 * @param max Máximo de paseos a devolver.
 */
export function llegadasRecientes(
  expediente: Pick<Expediente, 'ultimas_llegadas'> | undefined,
  max = 5
): LlegadaParaMostrar[] {
  return [...(expediente?.ultimas_llegadas ?? [])]
    .sort((a, b) => b.fecha_ms - a.fecha_ms)
    .filter(l => l.llegada in EMOJI_DE_LLEGADA)
    .slice(0, max)
    .map(l => ({
      paseo_id: l.paseo_id,
      llegada: l.llegada as Llegada,
      emoji: EMOJI_DE_LLEGADA[l.llegada as Llegada],
    }))
}

/**
 * Cuántos aprendizajes sensibles esperan la decisión del tutor.
 * @param expediente Expediente de la mascota (puede no existir todavía).
 */
export const cantidadPorRevisar = (
  expediente: Pick<Expediente, 'resumen'> | undefined
): number => expediente?.resumen?.por_confirmar?.length ?? 0
