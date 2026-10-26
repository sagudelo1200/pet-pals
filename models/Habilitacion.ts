import type {
  EstadoHabilitacion,
  EstadoRequisito,
} from '@/functions/src/compartido/habilitacion'
import type { TipoServicio } from '@/functions/src/compartido/servicios'

/** Avance de un requisito dentro de una habilitación. */
export interface RequisitoHabilitacion {
  estado: EstadoRequisito
  vence_en?: Date | null
  verificacion_id?: string
  /** Por qué se rechazó. */
  motivo?: string
}

/** habilitaciones/{uid}_{servicio}: la escribe solo el servidor. */
export interface Habilitacion {
  id: string
  usuario_id: string
  usuario_nombre?: string | null
  servicio: TipoServicio
  estado: EstadoHabilitacion
  /** Último motivo (devolución, rechazo o suspensión). */
  motivo: string | null
  requisitos: Record<string, RequisitoHabilitacion>
  creado_en?: Date
  actualizado_en?: Date
}

/** habilitaciones/{id}/historial/{x}: qué cambió, quién y por qué. */
export interface EntradaHistorial {
  id: string
  /** Presente si el cambio fue de un requisito. */
  requisito?: string
  de: string
  a: string
  motivo?: string | null
  autor: string
  en?: Date
}
