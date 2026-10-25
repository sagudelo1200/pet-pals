/* eslint-disable camelcase */
/**
 * Territorio (núcleo puro): qué se sabe de cada celda y cómo se calcula.
 *
 * Un documento por celda en `territorio/{celda}`, que SOLO escriben las Cloud
 * Functions (ver functions/src/territorio):
 *
 *   rol cobertura (R8)  → `operativa`: oferta y demanda (cuidadores, pedidos
 *                         pendientes, paseos en curso y hechos). Se RECALCULA
 *                         desde los datos cuando algo cambia: nunca se suma ni
 *                         se resta a mano, así que no se desajusta.
 *                         `interes`: cuántos tutores piden servicio y cuántos
 *                         cuidadores lo ofrecen donde aún no se atiende.
 *   rol micro (R9)      → `narrativa`: lo que se ha visto en esa microzona
 *                         (eventos del paseo) y los índices que se derivan.
 *
 * Para saber algo de una zona más grande se sube por la jerarquía
 * (`padreDe`) o se suman las celdas que contiene.
 */
import type {RolResolucion} from './geografia';

export const COLECCION_TERRITORIO = 'territorio';

/** Estado de una celda según su oferta y su demanda. */
export type EstadoCelda =
  | 'sin_actividad' // sin cuidadores ni demanda: zona durmiente
  | 'disponible' // hay cuidadores, no hay pedidos
  | 'sin_cobertura' // hay pedidos y ningún cuidador
  | 'activa' // cuidadores y pedidos, ningún paseo en curso
  | 'en_operacion'; // al menos un paseo en curso

export interface Operativa {
  cuidadores_count: number
  demanda_total: number
  paseos_activos: number
  paseos_total: number
  estado: EstadoCelda
  /** cuidadores / max(demanda, 1) */
  ratio_cobertura: number
}

export interface Identidad {
  tipo?: 'parque' | 'calle' | 'comercio' | 'conjunto' | 'otro' | 'mixto'
  /** 0-100: qué tan seguros estamos de la clasificación. */
  confianza: number
  fuente?: 'paseo' | 'explorador' | 'inferencia'
}

/** Índices de inteligencia territorial (0-100). */
export interface Indices {
  bienestar: number
  seguridad: number
  actividad: number
  socializacion: number
}

export interface Narrativa {
  identidad: Identidad
  indices: Indices
  total_eventos: number
  /** `{juego: 5, agua: 3, ...}` */
  eventos_por_tipo: Record<string, number>
}

/** Quiénes quieren servicio en una celda que aún no se atiende. */
export interface ResumenInteres {
  tutores: number
  cuidadores: number
}

export interface CeldaTerritorial {
  /** Id de la celda (igual al id del documento). */
  celda: string
  /** Resolución H3 de la celda. */
  res: number
  /** Celda de cobertura (R8) que la contiene: ella misma si ya es R8. */
  padre_r8: string
  operativa?: Operativa
  narrativa?: Narrativa
  /** Interesados en servicio (celdas de cobertura fuera de servicio). */
  interes?: ResumenInteres
  /** Timestamp de Firestore (el tipo depende del SDK). */
  actualizado_en?: unknown
}

/** Rol en el que se mantiene cada sección. */
export const ROL_DE_OPERATIVA: RolResolucion = 'cobertura';
export const ROL_DE_NARRATIVA: RolResolucion = 'micro';

/** Narrativa de una celda sin eventos todavía. */
export const NARRATIVA_VACIA: Narrativa = {
  identidad: {tipo: 'otro', confianza: 30},
  indices: {bienestar: 50, seguridad: 50, actividad: 50, socializacion: 50},
  total_eventos: 0,
  eventos_por_tipo: {},
};

/**
 * Estado de una celda a partir de su oferta y su demanda.
 * @param {object} c Cuidadores, pedidos pendientes y paseos en curso.
 * @return {EstadoCelda} Estado.
 */
export function estadoDeCelda(c: {
  cuidadores_count: number
  demanda_total: number
  paseos_activos: number
}): EstadoCelda {
  if (c.paseos_activos > 0) return 'en_operacion';
  if (c.cuidadores_count === 0 && c.demanda_total === 0) return 'sin_actividad';
  if (c.cuidadores_count === 0) return 'sin_cobertura';
  if (c.demanda_total === 0) return 'disponible';
  return 'activa';
}

/**
 * Sección operativa completa a partir de los conteos.
 * @param {object} c Conteos de la celda.
 * @return {Operativa} Operativa con estado y ratio.
 */
export function armarOperativa(c: {
  cuidadores_count: number
  demanda_total: number
  paseos_activos: number
  paseos_total: number
}): Operativa {
  return {
    ...c,
    estado: estadoDeCelda(c),
    ratio_cobertura: c.cuidadores_count / Math.max(c.demanda_total, 1),
  };
}

/**
 * Índices de inteligencia a partir de la distribución de eventos y el tipo de
 * lugar.
 * @param {Record<string, number>} eventosPorTipo Eventos por tipo de acción.
 * @param {string | undefined} tipo Tipo de lugar (parque, conjunto...).
 * @return {Indices} Índices 0-100.
 */
export function calcularIndices(
  eventosPorTipo: Record<string, number>,
  tipo?: string
): Indices {
  const total =
    Object.values(eventosPorTipo).reduce((a, b) => a + b, 0) || 1;
  const ratio = (clave: string) => (eventosPorTipo[clave] || 0) / total;
  const juego = ratio('juego');
  const agua = ratio('agua');
  const descanso = ratio('descanso');
  const socializacion = ratio('socializacion');

  const acotar = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

  return {
    // Bienestar: juego (pesa más), acceso a agua y descanso
    bienestar: acotar((juego + agua * 0.75 + descanso * 0.75) * 100),
    // Seguridad: lugar conocido y poca densidad de eventos
    seguridad: acotar(
      (tipo && ['parque', 'conjunto'].includes(tipo) ? 60 : 40) +
      (total < 10 ? 30 : total > 50 ? -10 : 10)
    ),
    // Actividad: frecuencia total de eventos + ratio de juego
    actividad: acotar((total / 50) * 100 * 0.5 + juego * 50),
    // Socialización: eventos donde aparecen otros perros
    socializacion: acotar(socializacion * 100 + (total > 15 ? 20 : 0)),
  };
}

/**
 * Suma un evento a la narrativa de una celda y recalcula sus índices.
 * @param {Narrativa | undefined} actual Narrativa actual (o vacía).
 * @param {string} accion Tipo de acción del evento.
 * @return {Narrativa} Narrativa nueva.
 */
export function sumarEvento(
  actual: Narrativa | undefined,
  accion: string
): Narrativa {
  const base = actual ?? NARRATIVA_VACIA;
  const eventos_por_tipo = {
    ...base.eventos_por_tipo,
    [accion]: (base.eventos_por_tipo[accion] ?? 0) + 1,
  };
  return {
    ...base,
    total_eventos: base.total_eventos + 1,
    eventos_por_tipo,
    indices: calcularIndices(eventos_por_tipo, base.identidad.tipo),
  };
}
