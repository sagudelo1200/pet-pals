/**
 * Destino en la app de cada `accion` de una notificación (ver
 * functions/src/compartido/notificaciones.ts). Una acción desconocida no
 * navega: el aviso solo se marca como leído.
 */
export interface DestinoNotificacion {
  /** Pantalla raíz del rol (stack principal). */
  app: string
  /** Pestaña dentro de esa app. */
  pestana: string
}

const DESTINOS: Record<string, DestinoNotificacion> = {
  abrir_solicitud: { app: 'TutorApp', pestana: 'Paseos' },
  pagar: { app: 'TutorApp', pestana: 'Inicio' },
}

export function destinoDeAccion(accion: unknown): DestinoNotificacion | null {
  return typeof accion === 'string' ? (DESTINOS[accion] ?? null) : null
}
