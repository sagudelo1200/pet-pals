/**
 * Cómo se muestran las habilitaciones en la app (textos, colores y orden).
 * Las reglas del proceso están en functions/src/compartido/habilitacion.ts.
 */
import {
  DESTINO_DECISION,
  transicionExigeMotivo,
  type DecisionHabilitacion,
  type EstadoHabilitacion,
  type EstadoRequisito,
} from '@/functions/src/compartido/habilitacion'
import type { Habilitacion } from '@/models/Habilitacion'

export type VarianteEstado = 'alerta' | 'exito' | 'neutral' | 'error' | 'info'

export const ETIQUETA_ESTADO: Record<EstadoHabilitacion, string> = {
  BORRADOR: 'En borrador',
  EN_REVISION: 'En revisión',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  SUSPENDIDA: 'Suspendida',
}

export const VARIANTE_ESTADO: Record<EstadoHabilitacion, VarianteEstado> = {
  BORRADOR: 'neutral',
  EN_REVISION: 'alerta',
  APROBADA: 'exito',
  RECHAZADA: 'error',
  SUSPENDIDA: 'error',
}

export const ETIQUETA_REQUISITO: Record<EstadoRequisito, string> = {
  PENDIENTE: 'Pendiente',
  EN_REVISION: 'Por revisar',
  VERIFICADO: 'Verificado',
  RECHAZADO: 'Rechazado',
  EXPIRADO: 'Vencido',
}

export const VARIANTE_REQUISITO: Record<EstadoRequisito, VarianteEstado> = {
  PENDIENTE: 'neutral',
  EN_REVISION: 'alerta',
  VERIFICADO: 'exito',
  RECHAZADO: 'error',
  EXPIRADO: 'error',
}

/** Estados de la cola, en el orden en que se ofrecen como filtro. */
export const ESTADOS_COLA: EstadoHabilitacion[] = [
  'EN_REVISION',
  'BORRADOR',
  'APROBADA',
  'SUSPENDIDA',
  'RECHAZADA',
]

/**
 * Texto del botón de una decisión del equipo según desde dónde se toma.
 * @param estado Estado actual de la habilitación.
 * @param decision Decisión.
 * @return Texto del botón.
 */
export function etiquetaDecision(
  estado: EstadoHabilitacion,
  decision: DecisionHabilitacion
): string {
  switch (decision) {
    case 'RECHAZAR':
      return 'Rechazar'
    case 'SUSPENDER':
      return 'Suspender'
    case 'REACTIVAR':
      return 'Reactivar'
    case 'REABRIR':
      return estado === 'EN_REVISION' ? 'Devolver para corregir' : 'Reabrir'
  }
}

/**
 * ¿La decisión exige que el equipo escriba un motivo?
 * @param estado Estado actual.
 * @param decision Decisión.
 * @return Si el motivo es obligatorio.
 */
export function decisionExigeMotivo(
  estado: EstadoHabilitacion,
  decision: DecisionHabilitacion
): boolean {
  return transicionExigeMotivo(estado, DESTINO_DECISION[decision])
}

/**
 * Ids de los requisitos que esperan revisión.
 * @param habilitacion Habilitación.
 * @return Ids en revisión.
 */
export function porRevisar(habilitacion: Habilitacion): string[] {
  return Object.entries(habilitacion.requisitos)
    .filter(([, r]) => r.estado === 'EN_REVISION')
    .map(([id]) => id)
}

const ms = (h: Habilitacion) => h.actualizado_en?.getTime() ?? 0

/**
 * Orden de la cola: lo que espera revisión, de la más antigua a la más
 * reciente (primero en llegar, primero en revisarse); el resto, lo más
 * reciente primero.
 * @param habilitaciones Habilitaciones de un mismo estado.
 * @param estado Estado de la cola.
 * @return Copia ordenada.
 */
export function ordenarCola(
  habilitaciones: Habilitacion[],
  estado: EstadoHabilitacion
): Habilitacion[] {
  const signo = estado === 'EN_REVISION' ? 1 : -1
  return [...habilitaciones].sort((a, b) => signo * (ms(a) - ms(b)))
}

/**
 * Fecha corta (dd/mm/aaaa) sin depender de Intl.
 * @param fecha Fecha, si la hay.
 * @return Texto, o cadena vacía.
 */
export function fechaCorta(fecha: Date | null | undefined): string {
  if (!fecha) return ''
  const d = String(fecha.getDate()).padStart(2, '0')
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${fecha.getFullYear()}`
}
