/**
 * Aviso de vencimiento de la habilitación, DENTRO de la app. No hay ningún
 * proceso periódico que avise por fuera: cuando la persona abre la app, esto
 * compara el vencimiento que guarda su perfil con la hora y le dice si está por
 * vencer o ya venció. (El emparejamiento no depende de este aviso: una
 * habilitación vencida deja de recibir pedidos por sí sola.)
 */
import {
  TIPOS_SERVICIO,
  type TipoServicio,
} from '@/functions/src/compartido/servicios'

/** Con cuántos días de anticipación se avisa. */
export const DIAS_AVISO_VENCIMIENTO = 15

const DIA_MS = 86_400_000

export interface AvisoVencimiento {
  servicio: TipoServicio
  /** `por_vencer` aún sirve; `vencida` ya no recibe pedidos. */
  estado: 'por_vencer' | 'vencida'
  venceEn: Date
}

type PerfilConVencimientos =
  | { servicios_habilitados?: unknown; servicios_vencen?: unknown }
  | null
  | undefined

/**
 * Avisos que corresponden a la persona ahora, el más urgente primero.
 * @param perfil Perfil público (servicios habilitados y sus vencimientos).
 * @param ahoraMs Momento actual.
 * @param diasAviso Días de anticipación.
 * @return Avisos (vacío si no hay nada por vencer).
 */
export function avisosDeVencimiento(
  perfil: PerfilConVencimientos,
  ahoraMs: number,
  diasAviso: number = DIAS_AVISO_VENCIMIENTO
): AvisoVencimiento[] {
  const habilitados = Array.isArray(perfil?.servicios_habilitados)
    ? (perfil?.servicios_habilitados as unknown[])
    : []
  const vencen = (perfil?.servicios_vencen ?? {}) as Record<string, unknown>

  const avisos: AvisoVencimiento[] = []
  for (const servicio of TIPOS_SERVICIO) {
    const vence = vencen[servicio]
    if (!habilitados.includes(servicio) || typeof vence !== 'number') continue
    if (vence <= ahoraMs) {
      avisos.push({ servicio, estado: 'vencida', venceEn: new Date(vence) })
    } else if (vence - ahoraMs <= diasAviso * DIA_MS) {
      avisos.push({ servicio, estado: 'por_vencer', venceEn: new Date(vence) })
    }
  }
  return avisos.sort((a, b) => a.venceEn.getTime() - b.venceEn.getTime())
}
