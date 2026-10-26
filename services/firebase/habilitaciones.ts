/**
 * Habilitaciones (lado app). Todo cambio pasa por el servidor: él valida,
 * guarda el historial y deja el perfil, el rol y los avisos al día.
 */
import { llamarCallable } from './callable'
import type {
  ArchivoEvidencia,
  DecisionHabilitacion,
  EstadoHabilitacion,
} from '@/functions/src/compartido/habilitacion'
import type { TipoServicio } from '@/functions/src/compartido/servicios'

/** La persona empieza (o retoma) su habilitación para un servicio. */
export const iniciarHabilitacion = llamarCallable<
  { servicio: TipoServicio },
  { id: string }
>('iniciarHabilitacion')

/** La persona envía su habilitación a revisión (el servidor comprueba todo). */
export const enviarHabilitacion = llamarCallable<
  { servicio: TipoServicio },
  { id: string; estado: EstadoHabilitacion }
>('enviarHabilitacion')

/** El equipo aprueba o rechaza UN requisito que está en revisión. */
export const decidirRequisito = llamarCallable<
  {
    id: string
    requisito: string
    decision: 'APROBAR' | 'RECHAZAR'
    /** Obligatorio al rechazar. */
    motivo?: string
  },
  { id: string; estado: EstadoHabilitacion }
>('decidirRequisito')

/** El equipo rechaza, suspende, reactiva o reabre una habilitación. */
export const decidirHabilitacion = llamarCallable<
  { id: string; decision: DecisionHabilitacion; motivo?: string },
  { id: string; estado: EstadoHabilitacion }
>('decidirHabilitacion')

/** El equipo ve los archivos de evidencia de un requisito. */
export const evidenciaHabilitacion = llamarCallable<
  { id: string; requisito: string },
  { archivos: ArchivoEvidencia[] }
>('evidenciaHabilitacion')
