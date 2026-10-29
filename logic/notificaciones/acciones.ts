import { TIPO_PASEO } from '@/functions/src/compartido/servicios'

/**
 * Destino en la app de cada `accion` de una notificación (ver
 * functions/src/compartido/notificaciones.ts). Una acción desconocida no
 * navega: el aviso solo se marca como leído.
 */
export interface DestinoNotificacion {
  /** Pantalla a la que se navega. */
  pantalla: string
  /** Parámetros de esa pantalla (p. ej. la pestaña dentro de la app del rol). */
  params?: Record<string, unknown>
}

const DESTINOS: Record<string, DestinoNotificacion> = {
  abrir_solicitud: { pantalla: 'TutorApp', params: { screen: 'Paseos' } },
  abrir_solicitudes_cuidador: {
    pantalla: 'CuidadorApp',
    params: { screen: 'Solicitudes' },
  },
  pagar: { pantalla: 'TutorApp', params: { screen: 'Inicio' } },
  // Mi habilitación existe en la navegación de todos los roles: así el aviso
  // abre la pantalla sin importar con qué rol esté la persona en la app
  abrir_habilitacion: {
    pantalla: 'MiHabilitacion',
    params: { servicio: TIPO_PASEO },
  },
}

/** Acciones que abren una pantalla de un paseo concreto (llevan `paseo_id`). */
const PANTALLA_DE_PASEO: Record<string, string> = {
  abrir_paseo: 'PaseoActivo',
  abrir_chat: 'Chat',
}

/**
 * A dónde lleva un aviso al tocarlo.
 * @param accion `accion` del aviso (ver el catálogo de notificaciones).
 * @param datos `datos` del aviso: los de un paseo traen su `paseo_id`.
 * @return Destino, o null si la acción no navega (solo se marca como leído).
 */
export function destinoDeAccion(
  accion: unknown,
  datos?: Record<string, unknown> | null
): DestinoNotificacion | null {
  if (typeof accion !== 'string') return null
  const pantalla = PANTALLA_DE_PASEO[accion]
  if (pantalla) {
    const paseoId = datos?.paseo_id
    return typeof paseoId === 'string' && paseoId !== ''
      ? { pantalla, params: { paseoId } }
      : null
  }
  return DESTINOS[accion] ?? null
}
