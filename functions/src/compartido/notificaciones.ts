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
