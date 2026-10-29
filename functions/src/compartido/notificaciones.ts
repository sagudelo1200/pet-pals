/* eslint-disable camelcase */
/**
 * CATÁLOGO DE NOTIFICACIONES: todo lo que Paw-Path puede avisarle a un usuario.
 *
 * Compartido por la app y las Cloud Functions. Quien necesite avisar algo
 * llama a `notificar()` (functions/src/comun/notificar.ts) con un `tipo` de
 * este catálogo; el catálogo decide el texto, la categoría y los canales.
 *
 *   usuarios/{uid}/notificaciones/{id}
 *     { tipo, categoria, titulo, cuerpo, datos, leido, creado_en }
 *
 * - `datos` lleva los ids del negocio y `accion`: lo que la app abre al tocar
 *   el aviso.
 * - Para agregar un aviso: una entrada aquí; no hay que tocar nada más.
 */

export const COLECCION_NOTIFICACIONES = 'notificaciones';

export type CanalNotificacion = 'app' | 'push' | 'email' | 'sms';

export const COLECCION_PREFERENCIAS = 'preferencias';
export const DOC_PREFERENCIAS_NOTIFICACIONES = 'notificaciones';

/**
 * Canales que el usuario acepta: usuarios/{uid}/preferencias/notificaciones.
 * Lo que falta cuenta como activado. La bandeja ('app') no se puede apagar.
 */
export interface PreferenciasNotificacion {
  push: boolean
  email: boolean
}

export type CategoriaNotificacion = 'operativa' | 'pagos' | 'seguridad';

/** Ids y valores del negocio que acompañan al aviso. */
export type DatosNotificacion = Record<string, string | number>;

export interface DefinicionNotificacion {
  categoria: CategoriaNotificacion
  /** Canales por los que sale por defecto ('app' = la bandeja, siempre). */
  canales: CanalNotificacion[]
  /** Si el usuario no puede desactivarla en sus preferencias. */
  obligatoria: boolean
  /** Qué abre la app al tocarla. */
  accion: string
  plantilla: (datos: DatosNotificacion) => {titulo: string, cuerpo: string}
}

export const CATALOGO_NOTIFICACIONES = {
  SOLICITUD_ESCALADA: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_solicitud',
    plantilla: () => ({
      titulo: '✅ Tu solicitud está disponible',
      cuerpo: 'El cuidador asignado no respondió. ' +
        'Otros cuidadores pueden verla ahora.',
    }),
  },
  PASEO_CON_AVISOS: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_solicitud',
    plantilla: (datos) => ({
      titulo: '🐾 Tu paseo fue aceptado, con un aviso',
      cuerpo: `${datos.cuidador} aceptó tu paseo. ${datos.detalle}. ` +
        'Lo sabe y decidió tomarlo.',
    }),
  },
  SERVICIO_DISPONIBLE: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_solicitud',
    plantilla: () => ({
      titulo: '🎉 ¡Ya llegamos a tu sector!',
      cuerpo: 'Ya puedes pedir paseos para tu mascota desde tu zona.',
    }),
  },
  SERVICIO_NO_DISPONIBLE: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_solicitud',
    plantilla: () => ({
      titulo: 'Aún no atendemos tu sector',
      cuerpo: 'Tu solicitud se canceló porque todavía no llegamos a esa ' +
        'zona. Te avisaremos cuando lleguemos.',
    }),
  },
  ZONA_ABIERTA_TUTOR: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_solicitud',
    plantilla: (datos) => ({
      titulo: '🎉 Ya llegamos a tu sector',
      cuerpo: `Ya atendemos ${datos.zona}. Puedes pedir tu primer paseo.`,
    }),
  },
  ZONA_ABIERTA_CUIDADOR: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_solicitudes_cuidador',
    plantilla: (datos) => ({
      titulo: '🎉 Ya atendemos tu zona',
      cuerpo: `Abrimos ${datos.zona}: empezarás a recibir solicitudes de paseo.`,
    }),
  },
  PASEO_FUERA_DE_ZONA: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_solicitud',
    plantilla: () => ({
      titulo: 'Aún no llegamos a tu sector',
      cuerpo: 'Cancelamos tu solicitud porque todavía no atendemos esa zona.',
    }),
  },
  // ---- Seguimiento del paseo (para el tutor) ----
  PASEO_ACEPTADO: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_paseo',
    plantilla: (datos) => ({
      titulo: `✅ ${datos.cuidador} aceptó tu paseo`,
      cuerpo: `Cuidará a ${datos.mascotas}. Te avisamos cuando salga hacia ` +
        'donde estás.',
    }),
  },
  PASEO_EN_CAMINO: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_paseo',
    plantilla: (datos) => ({
      titulo: `🚶 ${datos.cuidador} va en camino`,
      cuerpo: `Va a recoger a ${datos.mascotas}. Puedes seguirlo en el mapa.`,
    }),
  },
  PASEO_EN_PUNTO: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_paseo',
    plantilla: (datos) => ({
      titulo: `📍 ${datos.cuidador} ya llegó`,
      cuerpo: 'Dale tu código de recogida para que empiece el paseo de ' +
        `${datos.mascotas}.`,
    }),
  },
  PASEO_INICIADO: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_paseo',
    plantilla: (datos) => ({
      titulo: `🐾 Empezó el paseo de ${datos.mascotas}`,
      cuerpo: 'Síguelo en vivo desde la app.',
    }),
  },
  PASEO_FINALIZADO: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_paseo',
    plantilla: (datos) => ({
      titulo: `🏁 Terminó el paseo de ${datos.mascotas}`,
      cuerpo: 'Valida la entrega con el código que te muestra ' +
        `${datos.cuidador} para completar el paseo.`,
    }),
  },
  ENTREGA_PENDIENTE: {
    categoria: 'pagos',
    canales: ['app', 'push'],
    obligatoria: true,
    accion: 'abrir_paseo',
    plantilla: (datos) => ({
      titulo: 'Falta confirmar la entrega',
      cuerpo: `${datos.cuidador} ya terminó el paseo de ${datos.mascotas}. ` +
        'Confirma la entrega con tu código para cerrarlo.',
    }),
  },
  PASEO_CANCELADO: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_solicitud',
    plantilla: (datos) => ({
      titulo: 'Tu paseo fue cancelado',
      cuerpo: `${datos.cuidador} canceló el paseo de ${datos.mascotas}. ` +
        'Puedes pedir otro cuando quieras.',
    }),
  },
  INCIDENTE_PASEO: {
    categoria: 'seguridad',
    canales: ['app', 'push'],
    obligatoria: true,
    accion: 'abrir_paseo',
    plantilla: (datos) => ({
      titulo: '⚠️ Incidente durante el paseo',
      cuerpo: `${datos.cuidador} reportó un incidente con ${datos.mascotas}. ` +
        'Revisa los detalles.',
    }),
  },
  MENSAJE_PASEO: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_chat',
    plantilla: (datos) => ({
      titulo: `💬 ${datos.de}`,
      cuerpo: String(datos.texto),
    }),
  },
  HABILITACION_APROBADA: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_habilitacion',
    plantilla: (datos) => ({
      titulo: '✅ Ya puedes ofrecer tu servicio',
      cuerpo: `Tu habilitación para ${datos.servicio} fue aprobada. ` +
        'Empezarás a recibir solicitudes.',
    }),
  },
  HABILITACION_DEVUELTA: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_habilitacion',
    plantilla: (datos) => ({
      titulo: 'Necesitamos que corrijas algo',
      cuerpo: `Revisamos tu habilitación para ${datos.servicio}. ` +
        `${datos.motivo ?? ''}`.trim(),
    }),
  },
  HABILITACION_RECHAZADA: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_habilitacion',
    plantilla: (datos) => ({
      titulo: 'No pudimos aprobar tu habilitación',
      cuerpo: `Tu habilitación para ${datos.servicio} no fue aprobada. ` +
        `${datos.motivo ?? ''}`.trim(),
    }),
  },
  HABILITACION_SUSPENDIDA: {
    categoria: 'operativa',
    canales: ['app', 'push'],
    obligatoria: false,
    accion: 'abrir_habilitacion',
    plantilla: (datos) => ({
      titulo: 'Tu habilitación fue suspendida',
      cuerpo: `Suspendimos tu habilitación para ${datos.servicio}. ` +
        `${datos.motivo ?? ''}`.trim(),
    }),
  },
  COBRO_PENDIENTE: {
    categoria: 'pagos',
    canales: ['app', 'push', 'email'],
    obligatoria: true,
    accion: 'pagar',
    plantilla: (datos) => ({
      titulo: 'Tienes un pago pendiente',
      cuerpo: `Recuerda pagar $${Number(datos.valor).toLocaleString('es-CO')} ` +
        'por tu último paseo.',
    }),
  },
} satisfies Record<string, DefinicionNotificacion>;

export type TipoNotificacion = keyof typeof CATALOGO_NOTIFICACIONES;

/**
 * Canales externos por los que debe salir un aviso: los del catálogo que el
 * usuario no apagó (los obligatorios ignoran las preferencias). La bandeja
 * ('app') siempre se crea y no se incluye aquí.
 * @param {DefinicionNotificacion} definicion Definición del tipo.
 * @param {object} preferencias Preferencias del usuario (falta = activado).
 * @return {CanalNotificacion[]} Canales de envío.
 */
export function canalesDeEnvio(
  definicion: DefinicionNotificacion,
  preferencias?: Partial<Record<CanalNotificacion, boolean>>
): CanalNotificacion[] {
  return definicion.canales.filter((canal) => canal !== 'app' &&
    (definicion.obligatoria || preferencias?.[canal] !== false));
}

/**
 * ¿Es un tipo del catálogo?
 * @param {unknown} tipo Valor a comprobar.
 * @return {boolean} Si es un tipo válido.
 */
export function esTipoNotificacion(tipo: unknown): tipo is TipoNotificacion {
  return typeof tipo === 'string' && tipo in CATALOGO_NOTIFICACIONES;
}
