import type {
  CategoriaNotificacion,
  DatosNotificacion,
  TipoNotificacion,
} from '@/functions/src/compartido/notificaciones'

/**
 * Aviso de la bandeja del usuario: usuarios/{uid}/notificaciones/{id}.
 * Lo crea el servidor (`notificar()`); el usuario solo lo marca como leído.
 */
export interface Notificacion {
  id: string
  tipo: TipoNotificacion
  categoria: CategoriaNotificacion
  titulo: string
  cuerpo: string
  /** Ids del negocio y `accion`: qué abre la app al tocar el aviso. */
  datos: DatosNotificacion & { accion: string }
  leido: boolean
  creado_en: Date
}
