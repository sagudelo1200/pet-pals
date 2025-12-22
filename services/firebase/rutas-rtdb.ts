/**
 * Definición centralizada de las rutas en Firebase Realtime Database.
 * Mantiene la consistencia y facilita cambios en la estructura del árbol.
 * Se utiliza el español para los nombres de las constantes y funciones.
 */
export const RUTAS_REALTIME = {
  /** Seguimiento de ubicación de paseos en tiempo real */
  seguimiento: (idPaseo: string) => `seguimiento_paseos/${idPaseo}`,

  /** Chats vinculados a los paseos */
  chats: (idPaseo: string) => `chats/${idPaseo}`,

  /** Mensajes específicos dentro de un chat de paseo */
  mensajes: (idPaseo: string) => `chats/${idPaseo}/mensajes`,

  /** Estado de presencia de los usuarios (online/offline) */
  presencia: (idUsuario: string) => `presencia/${idUsuario}`,

  /** Nodo especial de Firebase para detectar el estado de conexión del cliente */
  infoConexion: '.info/connected',
} as const
