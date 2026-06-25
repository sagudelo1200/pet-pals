import { BaseModel } from './BaseModel'

/**
 * Conversación entre tutor y cuidador para un paseo.
 * Auto-creada cuando paseo → CONFIRMADO.
 */
export interface Conversacion extends BaseModel {
  paseo_id: string
  participantes: string[]
  tutor_id: string
  cuidador_id: string
  activa: boolean
  cerrada_en?: Date
}

/**
 * Tipos de mensaje en conversación.
 */
export type TipoMensaje = 'texto' | 'sistema' | 'notificacion'

/**
 * Mensaje en subcolección conversaciones/{id}/mensajes/{id}.
 */
export interface Mensaje extends BaseModel {
  contenido: string
  autor_uid: string
  tipo_mensaje: TipoMensaje
  leidos_por?: Record<string, boolean>
  metadata?: Record<string, any>
}

export interface ListaMensajes {
  mensajes: Mensaje[]
  hasMore: boolean
  ultimoId?: string
}
