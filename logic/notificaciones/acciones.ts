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
  abrir_solicitudes_cuidador: { app: 'CuidadorApp', pestana: 'Solicitudes' },
  pagar: { app: 'TutorApp', pestana: 'Inicio' },
  // La habilitación se ve en Mi Cuenta, que existe en todos los roles
  abrir_habilitacion: { app: 'TutorApp', pestana: 'MiCuenta' },
}

export function destinoDeAccion(accion: unknown): DestinoNotificacion | null {
  return typeof accion === 'string' ? (DESTINOS[accion] ?? null) : null
}
