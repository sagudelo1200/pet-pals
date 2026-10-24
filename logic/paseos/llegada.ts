/**
 * "¿Cómo llegó?" (lado app): las opciones que ve el tutor y cómo se agrupan
 * sus respuestas cuando son distintas para cada mascota. El catálogo vive en
 * `compartido/expediente.ts`.
 */
import { LLEGADAS, type Llegada } from '@/functions/src/compartido/expediente'

/** Opciones de respuesta, en el orden en que se muestran. */
export const OPCIONES_DE_LLEGADA: readonly Llegada[] = LLEGADAS

export const EMOJI_DE_LLEGADA: Record<Llegada, string> = {
  tranquilo: '😌',
  cansado_bien: '😴',
  agitado: '😰',
  con_molestia: '🤕',
}

/** Clave del texto traducible de una respuesta. */
export const claveDeLlegada = (llegada: Llegada): string =>
  `paseos:llegada.opciones.${llegada}`

/** Una respuesta y las mascotas a las que aplica (sin ids = todas). */
export interface RespuestaAgrupada {
  llegada: Llegada
  mascotaIds?: string[]
}

/**
 * Agrupa las respuestas por mascota en las llamadas mínimas al servidor: si
 * todas las mascotas tienen la misma respuesta es una sola llamada "para
 * todas"; si no, una llamada por respuesta distinta con sus mascotas.
 * @param respuestas Respuesta elegida por cada mascota.
 * @param mascotaIds Todas las mascotas del paseo.
 */
export function agruparRespuestas(
  respuestas: Record<string, Llegada>,
  mascotaIds: readonly string[]
): RespuestaAgrupada[] {
  const porRespuesta = new Map<Llegada, string[]>()
  for (const id of mascotaIds) {
    const llegada = respuestas[id]
    if (!llegada) continue
    porRespuesta.set(llegada, [...(porRespuesta.get(llegada) ?? []), id])
  }
  if (porRespuesta.size === 1) {
    const [[llegada, ids]] = [...porRespuesta]
    return [
      ids.length === mascotaIds.length
        ? { llegada }
        : { llegada, mascotaIds: ids },
    ]
  }
  return [...porRespuesta].map(([llegada, ids]) => ({
    llegada,
    mascotaIds: ids,
  }))
}

/**
 * ¿Respondió por todas las mascotas?
 * @param respuestas Respuesta elegida por cada mascota.
 * @param mascotaIds Todas las mascotas del paseo.
 */
export const respuestasCompletas = (
  respuestas: Record<string, Llegada>,
  mascotaIds: readonly string[]
): boolean => mascotaIds.length > 0 && mascotaIds.every(id => !!respuestas[id])
