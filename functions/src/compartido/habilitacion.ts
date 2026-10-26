/* eslint-disable camelcase */
/**
 * HABILITACIÓN: el permiso de una persona para ofrecer un servicio. Pasa de
 * "quiero ofrecerlo" a "puedo recibir clientes", y sigue viva después: se
 * suspende, vence y se renueva. Reglas puras y compartidas (app y Cloud
 * Functions); lo que se exige está en servicios.ts.
 *
 *   habilitaciones/{uid}_{servicio}   (lo escribe solo el servidor)
 *     { estado, requisitos: { [id]: { estado, vence_en } }, ... }
 *
 * Estado de la HABILITACIÓN:
 *
 *   BORRADOR ──enviar──▶ EN_REVISION ──▶ APROBADA ◀──▶ SUSPENDIDA
 *      ▲  ▲                 │   │            │
 *      │  └─── devolver ────┘   └▶ RECHAZADA │
 *      └───────── reabrir ────────┘          │
 *      └──── vencimiento (hay que renovar) ──┘
 *
 * Nada de esto corre solo cada cierto tiempo. Un vencimiento no necesita un
 * proceso: `estadoDelRequisito` y `ofreceServicio` comparan con la hora actual,
 * así que lo vencido deja de valer aunque nadie lo haya marcado.
 */
import {sumarMesesCalendario} from './fechas';
import {
  requisitosDe,
  type DefinicionRequisito,
  type TipoServicio,
} from './servicios';

export const COLECCION_HABILITACIONES = 'habilitaciones';

/**
 * Id del documento de una habilitación.
 * @param {string} uid Dueño.
 * @param {TipoServicio} servicio Servicio.
 * @return {string} Id (`{uid}_{servicio}`).
 */
export function idDeHabilitacion(uid: string, servicio: TipoServicio): string {
  return `${uid}_${servicio}`;
}

// ---------- Estados de la habilitación ----------

export const ESTADOS_HABILITACION = [
  'BORRADOR',
  'EN_REVISION',
  'APROBADA',
  'RECHAZADA',
  'SUSPENDIDA',
] as const;

export type EstadoHabilitacion = typeof ESTADOS_HABILITACION[number];

type Transiciones<E extends string> = Record<E, E[]>;

export const TRANSICIONES_HABILITACION: Transiciones<EstadoHabilitacion> = {
  BORRADOR: ['EN_REVISION'],
  // Devolver = pedirle que corrija algo; RECHAZADA = no se acepta la habilitación
  EN_REVISION: ['APROBADA', 'RECHAZADA', 'BORRADOR'],
  // De APROBADA a BORRADOR: venció algo y debe renovarlo
  APROBADA: ['SUSPENDIDA', 'BORRADOR'],
  SUSPENDIDA: ['APROBADA'],
  // Reabrir: el equipo permite volver a intentarlo
  RECHAZADA: ['BORRADOR'],
};

/**
 * ¿Es válido pasar de un estado de la habilitación a otro?
 * @param {EstadoHabilitacion} actual Estado actual.
 * @param {EstadoHabilitacion} nuevo Estado solicitado.
 * @return {boolean} Si la transición está permitida.
 */
export function transicionHabilitacionValida(
  actual: EstadoHabilitacion,
  nuevo: EstadoHabilitacion
): boolean {
  return TRANSICIONES_HABILITACION[actual].includes(nuevo);
}

/**
 * ¿Esta transición exige que el equipo deje un motivo? Sí cuando afecta
 * a la persona: devolver, rechazar o suspender.
 * @param {EstadoHabilitacion} actual Estado actual.
 * @param {EstadoHabilitacion} nuevo Estado solicitado.
 * @return {boolean} Si el motivo es obligatorio.
 */
export function transicionExigeMotivo(
  actual: EstadoHabilitacion,
  nuevo: EstadoHabilitacion
): boolean {
  return nuevo === 'RECHAZADA' || nuevo === 'SUSPENDIDA' ||
    (actual === 'EN_REVISION' && nuevo === 'BORRADOR');
}

/**
 * Lo que el equipo puede hacer con una habilitación, y el estado al que lleva.
 */
export const DESTINO_DECISION = {
  RECHAZAR: 'RECHAZADA',
  SUSPENDER: 'SUSPENDIDA',
  REACTIVAR: 'APROBADA',
  REABRIR: 'BORRADOR',
} as const;

export type DecisionHabilitacion = keyof typeof DESTINO_DECISION;

export const DECISIONES_HABILITACION =
  Object.keys(DESTINO_DECISION) as DecisionHabilitacion[];

/**
 * Lo que el equipo ofrece hacer desde cada estado (siempre una transición
 * válida). Rechazar la devuelve a la persona o la niega; "reabrir" desde la
 * revisión es devolverla para que corrija; aprobar no está: se aprueba sola al
 * cumplir todo, y renovar lo que venció también.
 */
const DECISIONES_POR_ESTADO: Record<EstadoHabilitacion, DecisionHabilitacion[]> = {
  BORRADOR: [],
  EN_REVISION: ['RECHAZAR', 'REABRIR'],
  APROBADA: ['SUSPENDER'],
  SUSPENDIDA: ['REACTIVAR'],
  RECHAZADA: ['REABRIR'],
};

/**
 * Decisiones del equipo que se pueden tomar desde un estado.
 * @param {EstadoHabilitacion} estado Estado actual.
 * @return {DecisionHabilitacion[]} Decisiones que se ofrecen.
 */
export function decisionesPosibles(
  estado: EstadoHabilitacion
): DecisionHabilitacion[] {
  return DECISIONES_POR_ESTADO[estado];
}

/** Un archivo de evidencia tal como se entrega a quien revisa. */
export interface ArchivoEvidencia {
  /** Nombre dentro del requisito (frente, reverso...). */
  archivo: string
  existe: boolean
  contentType?: string
  base64?: string
}

// ---------- Estados de cada requisito ----------

export const ESTADOS_REQUISITO = [
  'PENDIENTE',
  'EN_REVISION',
  'VERIFICADO',
  'RECHAZADO',
  'EXPIRADO',
] as const;

export type EstadoRequisito = typeof ESTADOS_REQUISITO[number];

export const TRANSICIONES_REQUISITO: Record<EstadoRequisito, EstadoRequisito[]> = {
  PENDIENTE: ['EN_REVISION', 'VERIFICADO'],
  EN_REVISION: ['VERIFICADO', 'RECHAZADO'],
  VERIFICADO: ['EXPIRADO'],
  // Corregir y volver a enviar
  RECHAZADO: ['EN_REVISION'],
  EXPIRADO: ['EN_REVISION'],
};

/**
 * ¿Es válido pasar de un estado de un requisito a otro?
 * @param {EstadoRequisito} actual Estado actual.
 * @param {EstadoRequisito} nuevo Estado solicitado.
 * @return {boolean} Si la transición está permitida.
 */
export function transicionRequisitoValida(
  actual: EstadoRequisito,
  nuevo: EstadoRequisito
): boolean {
  return TRANSICIONES_REQUISITO[actual].includes(nuevo);
}

// ---------- Evaluación ----------

export interface ProgresoRequisito {
  estado: EstadoRequisito
  /** Instante (ms) en que deja de valer; null/ausente = no vence. */
  venceEnMs?: number | null
  /** Verificación (colección `verificaciones`) que lo cumple. */
  verificacionId?: string
  /** Por qué se rechazó (lo ve la persona para corregirlo). */
  motivo?: string
}

/** Avance por id de requisito; lo que falta cuenta como PENDIENTE. */
export type ProgresoHabilitacion = Record<string, ProgresoRequisito | undefined>;

/** Datos del perfil público que pueden pedir los requisitos. */
export type PerfilParaRequisitos = Record<string, unknown>;

/**
 * Meses de vigencia de un requisito: el que configuró el equipo en
 * configuracion/servicios (clave `{id}_vigencia_meses`) o, si no hay uno
 * válido, el del catálogo. Agregar una vigencia configurable para otro
 * requisito es agregar esa clave al catálogo de configuración.
 * @param {DefinicionRequisito} requisito Requisito.
 * @param {Record<string, unknown>} ajustes Valores de configuracion/servicios.
 * @return {number | null} Meses, o null si no vence.
 */
export function vigenciaDe(
  requisito: DefinicionRequisito,
  ajustes?: Record<string, unknown>
): number | null {
  if (requisito.vigencia_meses === null) return null;
  const propio = ajustes?.[`${requisito.id}_vigencia_meses`];
  return typeof propio === 'number' && Number.isInteger(propio) && propio > 0 ?
    propio : requisito.vigencia_meses;
}

/**
 * Cuándo vence un requisito aprobado.
 * @param {DefinicionRequisito} requisito Requisito.
 * @param {number} verificadoEnMs Instante de la aprobación.
 * @param {Record<string, unknown>} ajustes Valores de configuracion/servicios.
 * @return {number | null} Instante de vencimiento, o null si no vence.
 */
export function venceEnDe(
  requisito: DefinicionRequisito,
  verificadoEnMs: number,
  ajustes?: Record<string, unknown>
): number | null {
  const meses = vigenciaDe(requisito, ajustes);
  return meses === null ?
    null :
    sumarMesesCalendario(new Date(verificadoEnMs), meses).getTime();
}

const tieneValor = (v: unknown): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v as object).length > 0;
  return true;
};

/**
 * Campos del perfil que aún no están completos.
 * @param {PerfilParaRequisitos | null | undefined} perfil Perfil público.
 * @param {string[]} campos Campos pedidos.
 * @return {string[]} Campos que faltan.
 */
export function camposFaltantes(
  perfil: PerfilParaRequisitos | null | undefined,
  campos: string[]
): string[] {
  return campos.filter((c) => !tieneValor(perfil?.[c]));
}

/**
 * Estado real de un requisito en este momento: los del perfil se calculan y
 * una aprobación vencida cuenta como EXPIRADO aunque nadie la haya marcado.
 * @param {DefinicionRequisito} requisito Requisito.
 * @param {ProgresoRequisito | undefined} progreso Avance guardado.
 * @param {PerfilParaRequisitos | null | undefined} perfil Perfil público.
 * @param {number} ahoraMs Momento actual.
 * @return {EstadoRequisito} Estado efectivo.
 */
export function estadoDelRequisito(
  requisito: DefinicionRequisito,
  progreso: ProgresoRequisito | undefined,
  perfil: PerfilParaRequisitos | null | undefined,
  ahoraMs: number
): EstadoRequisito {
  if (requisito.verificacion === null) {
    return camposFaltantes(perfil, requisito.perfil ?? []).length === 0 ?
      'VERIFICADO' : 'PENDIENTE';
  }
  if (!progreso) return 'PENDIENTE';
  if (progreso.estado === 'VERIFICADO' &&
    progreso.venceEnMs !== null && progreso.venceEnMs !== undefined &&
    progreso.venceEnMs <= ahoraMs) {
    return 'EXPIRADO';
  }
  return progreso.estado;
}

export interface ResultadoRequisito {
  id: string
  estado: EstadoRequisito
  obligatorio: boolean
}

export interface ResultadoServicio {
  /** Todos los requisitos obligatorios están cumplidos y vigentes. */
  cumple: boolean
  requisitos: ResultadoRequisito[]
  /** Ids de los obligatorios que aún no están cumplidos. */
  pendientes: string[]
}

/**
 * Evalúa todos los requisitos de un servicio.
 * @param {TipoServicio} servicio Servicio.
 * @param {ProgresoHabilitacion} progreso Avance guardado por requisito.
 * @param {PerfilParaRequisitos | null | undefined} perfil Perfil público.
 * @param {number} ahoraMs Momento actual.
 * @return {ResultadoServicio} Resultado.
 */
export function evaluarServicio(
  servicio: TipoServicio,
  progreso: ProgresoHabilitacion,
  perfil: PerfilParaRequisitos | null | undefined,
  ahoraMs: number
): ResultadoServicio {
  const requisitos = requisitosDe(servicio).map((r) => ({
    id: r.id,
    estado: estadoDelRequisito(r, progreso[r.id], perfil, ahoraMs),
    obligatorio: r.obligatorio,
  }));
  const pendientes = requisitos
    .filter((r) => r.obligatorio && r.estado !== 'VERIFICADO')
    .map((r) => r.id);
  return {cumple: pendientes.length === 0, requisitos, pendientes};
}

/**
 * ¿Se puede aprobar la habilitación? Solo si está en revisión y cumple todo.
 * @param {EstadoHabilitacion} estado Estado de la habilitación.
 * @param {ResultadoServicio} resultado Evaluación de los requisitos.
 * @return {boolean} Si puede pasar a APROBADA.
 */
export function puedeAprobarse(
  estado: EstadoHabilitacion,
  resultado: ResultadoServicio
): boolean {
  return estado === 'EN_REVISION' && resultado.cumple;
}

// ---------- Reutilizar verificaciones y resumen para el perfil ----------

/** Una verificación aprobada del usuario (colección `verificaciones`). */
export interface VerificacionVigente {
  id: string
  tipo: string
  /** Instante (ms) en que vence; null = no vence. */
  venceEnMs: number | null
}

/**
 * Cumple con lo que la persona ya tiene verificado: una verificación es del
 * usuario, no del servicio, así que la identidad aprobada para pasear sirve
 * también para guardería. Solo sube requisitos (a VERIFICADO); nunca baja.
 * @param {TipoServicio} servicio Servicio.
 * @param {ProgresoHabilitacion} progreso Avance guardado.
 * @param {VerificacionVigente[]} verificaciones Verificaciones aprobadas.
 * @param {number} ahoraMs Momento actual.
 * @return {ProgresoHabilitacion} Avance con lo ya verificado.
 */
export function aplicarVerificaciones(
  servicio: TipoServicio,
  progreso: ProgresoHabilitacion,
  verificaciones: VerificacionVigente[],
  ahoraMs: number
): ProgresoHabilitacion {
  const resultado = {...progreso};
  for (const r of requisitosDe(servicio)) {
    if (r.verificacion === null) continue;
    if (estadoDelRequisito(r, progreso[r.id], null, ahoraMs) === 'VERIFICADO') {
      continue;
    }
    const mejor = verificaciones
      .filter((v) => v.tipo === r.verificacion &&
        (v.venceEnMs === null || v.venceEnMs > ahoraMs))
      .sort((a, b) => (b.venceEnMs ?? Number.MAX_SAFE_INTEGER) -
        (a.venceEnMs ?? Number.MAX_SAFE_INTEGER))[0];
    if (mejor) {
      resultado[r.id] = {
        estado: 'VERIFICADO',
        venceEnMs: mejor.venceEnMs,
        verificacionId: mejor.id,
      };
    }
  }
  return resultado;
}

export interface ResumenParaPerfil {
  /** Servicios con la habilitación aprobada (se puede consultar con array-contains). */
  servicios_habilitados: string[]
  /** Instante (ms) en que vence la habilitación de cada servicio que vence. */
  servicios_vencen: Record<string, number>
}

/**
 * Lo que se copia al perfil público para que otros lo lean sin consultar las
 * habilitaciones: qué servicios puede ofrecer y cuándo vence cada uno.
 * @param {Array} habilitaciones Habilitaciones de la persona.
 * @return {ResumenParaPerfil} Resumen.
 */
export function resumenParaPerfil(
  habilitaciones: Array<{
    servicio: TipoServicio
    estado: EstadoHabilitacion
    progreso: ProgresoHabilitacion
  }>
): ResumenParaPerfil {
  const resumen: ResumenParaPerfil = {
    servicios_habilitados: [],
    servicios_vencen: {},
  };
  for (const h of habilitaciones) {
    if (h.estado !== 'APROBADA') continue;
    resumen.servicios_habilitados.push(h.servicio);
    const vencimientos = requisitosDe(h.servicio)
      .filter((r) => r.obligatorio)
      .map((r) => h.progreso[r.id]?.venceEnMs)
      .filter((v): v is number => typeof v === 'number');
    if (vencimientos.length > 0) {
      resumen.servicios_vencen[h.servicio] = Math.min(...vencimientos);
    }
  }
  return resumen;
}

// ---------- La puerta única ----------

/**
 * ¿Este cuidador puede ofrecer el servicio ahora? Es LA pregunta que hacen el
 * emparejamiento, el índice de cobertura y las listas de cuidadores: ninguno
 * debe mirar insignias sueltas. Lee `servicios_habilitados` y
 * `servicios_vencen` del perfil público (los mantiene solo el servidor) y
 * compara con la hora: una habilitación vencida deja de valer sola.
 * @param {object | null | undefined} perfil Perfil público.
 * @param {TipoServicio} servicio Servicio.
 * @param {number} ahoraMs Momento actual.
 * @return {boolean} Si lo puede ofrecer.
 */
export function ofreceServicio(
  perfil: {servicios_habilitados?: unknown; servicios_vencen?: unknown} |
    null | undefined,
  servicio: TipoServicio,
  ahoraMs: number
): boolean {
  const habilitados = perfil?.servicios_habilitados;
  if (!Array.isArray(habilitados) || !habilitados.includes(servicio)) {
    return false;
  }
  const vence = (perfil?.servicios_vencen as Record<string, unknown> |
    undefined)?.[servicio];
  return typeof vence !== 'number' || vence > ahoraMs;
}
