/**
 * Cierre de la entrega y reclamo del cobro (lado app). Todo cambio pasa por
 * Cloud Functions (functions/src/paseos/entregaFunciones.ts).
 */
import { llamarCallable } from './callable'

export type DecisionEntrega = 'cerrar_a_favor_cuidador' | 'abrir_disputa'
export type DecisionReclamo = 'mantener' | 'anular'

/** El equipo cierra a favor del cuidador o abre una disputa. */
export const resolverEntregaPendiente = llamarCallable<
  { paseoId: string; decision: DecisionEntrega; motivo: string },
  { tutores: string[]; completado: boolean }
>('resolverEntregaPendiente')

/** El tutor reclama un cobro cerrado por el equipo ("No estoy de acuerdo"). */
export const abrirReclamoCobro = llamarCallable<
  { obligacionId: string; motivo: string },
  { ok: boolean }
>('abrirReclamoCobro')

/** El equipo resuelve un reclamo: mantiene o anula el cobro. */
export const resolverReclamoCobro = llamarCallable<
  { obligacionId: string; decision: DecisionReclamo; motivo: string },
  { ok: boolean }
>('resolverReclamoCobro')
