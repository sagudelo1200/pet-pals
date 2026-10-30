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

/** Gravedad de un incidente (la misma del catálogo de momentos). */
export type SeveridadIncidente = 'baja' | 'media' | 'critica';

export interface Narrativa {
  identidad: Identidad
  indices: Indices
  /** Momentos de la bitácora contados (los incidentes van aparte). */
  total_eventos: number
  /** Momentos por clave del catálogo: `{'como_esta.jugo': 5, ...}` */
  eventos_por_tipo: Record<string, number>
  /** Incidentes por gravedad: `{media: 1}`. Bajan la seguridad. */
  incidentes?: Partial<Record<SeveridadIncidente, number>>
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

// ---------- Qué cuenta cada momento ----------

/** Lo que mide el territorio de lo que pasa en un paseo. */
export type CategoriaMomento = 'juego' | 'agua' | 'descanso' | 'socializacion';

export const CATEGORIAS_MOMENTO: readonly CategoriaMomento[] =
  ['juego', 'agua', 'descanso', 'socializacion'];

/**
 * Categoría de cada momento del catálogo (`grupo.accion`, ver
 * compartido/expediente.ts). Los momentos que no están aquí (cómo se ve, el
 * lugar, el clima) cuentan en el total pero no en ninguna categoría.
 */
const CATEGORIA_DE_MOMENTO: Record<string, CategoriaMomento> = {
  'como_esta.jugo': 'juego',
  'como_esta.corrio': 'juego',
  'necesidades.tomo_agua': 'agua',
  'como_esta.descanso': 'descanso',
  'como_esta.saludo_a_otros_perros': 'socializacion',
  'como_esta.saludo_a_personas': 'socializacion',
};

/** Claves de momentos que cuentan en alguna categoría (para validarlas). */
export const MOMENTOS_CON_CATEGORIA: readonly string[] =
  Object.keys(CATEGORIA_DE_MOMENTO);

/**
 * Categoría de un momento. Acepta también la categoría misma (`'juego'`).
 * @param {string} accion Clave del momento (`grupo.accion`).
 * @return {CategoriaMomento | undefined} Categoría, o undefined si no cuenta.
 */
export function categoriaDeMomento(accion: string): CategoriaMomento | undefined {
  if ((CATEGORIAS_MOMENTO as readonly string[]).includes(accion)) {
    return accion as CategoriaMomento;
  }
  return CATEGORIA_DE_MOMENTO[accion];
}

/**
 * Momentos por categoría.
 * @param {Record<string, number>} eventosPorTipo Momentos por clave.
 * @return {Record<CategoriaMomento, number>} Conteo de cada categoría.
 */
export function conteoPorCategoria(
  eventosPorTipo: Record<string, number>
): Record<CategoriaMomento, number> {
  const conteo = {juego: 0, agua: 0, descanso: 0, socializacion: 0};
  for (const [accion, cantidad] of Object.entries(eventosPorTipo)) {
    const categoria = categoriaDeMomento(accion);
    if (categoria) conteo[categoria] += cantidad;
  }
  return conteo;
}

/** Tipo de lugar que dice cada momento de lugar (los demás no clasifican). */
const TIPO_DE_LUGAR: Record<string, NonNullable<Identidad['tipo']>> = {
  'lugar_y_ambiente.lugar_parque': 'parque',
  'lugar_y_ambiente.lugar_sendero': 'parque',
  'lugar_y_ambiente.lugar_zona_de_perros': 'parque',
  'lugar_y_ambiente.lugar_rio_o_lago': 'parque',
  'lugar_y_ambiente.lugar_zona_residencial': 'conjunto',
  'lugar_y_ambiente.lugar_pet_friendly': 'comercio',
};

/** Claves de momentos de lugar que clasifican la celda (para validarlas). */
export const MOMENTOS_DE_LUGAR: readonly string[] = Object.keys(TIPO_DE_LUGAR);

/**
 * Qué tipo de lugar es una celda según lo que se ha registrado ahí: el que
 * domina (60 % o más de los momentos de lugar) o "mixto". Sin momentos de lugar
 * queda lo que ya tenía.
 * @param {Record<string, number>} eventosPorTipo Momentos por clave.
 * @param {Identidad} actual Identidad actual.
 * @return {Identidad} Identidad nueva.
 */
export function identidadDe(
  eventosPorTipo: Record<string, number>,
  actual: Identidad
): Identidad {
  const porTipo: Record<string, number> = {};
  let total = 0;
  for (const [accion, cantidad] of Object.entries(eventosPorTipo)) {
    const tipo = TIPO_DE_LUGAR[accion];
    if (!tipo) continue;
    porTipo[tipo] = (porTipo[tipo] ?? 0) + cantidad;
    total += cantidad;
  }
  if (total === 0) return actual;
  const [dominante, cuantos] =
    Object.entries(porTipo).sort((a, b) => b[1] - a[1])[0];
  const confianza = Math.min(90, 30 + 10 * total);
  return cuantos / total >= 0.6 ?
    {tipo: dominante as Identidad['tipo'], confianza, fuente: 'paseo'} :
    {tipo: 'mixto', confianza, fuente: 'paseo'};
}

/** Cuánto baja la seguridad cada incidente, según su gravedad. */
const PENALIZACION_INCIDENTE: Record<SeveridadIncidente, number> = {
  baja: 5,
  media: 15,
  critica: 30,
};

/**
 * Índices de inteligencia a partir de la distribución de momentos, el tipo de
 * lugar y los incidentes.
 * @param {Record<string, number>} eventosPorTipo Momentos por clave del catálogo.
 * @param {string | undefined} tipo Tipo de lugar (parque, conjunto...).
 * @param {object} incidentes Incidentes por gravedad.
 * @return {Indices} Índices 0-100.
 */
export function calcularIndices(
  eventosPorTipo: Record<string, number>,
  tipo?: string,
  incidentes: Partial<Record<SeveridadIncidente, number>> = {}
): Indices {
  const total =
    Object.values(eventosPorTipo).reduce((a, b) => a + b, 0) || 1;
  const conteo = conteoPorCategoria(eventosPorTipo);
  const juego = conteo.juego / total;
  const agua = conteo.agua / total;
  const descanso = conteo.descanso / total;
  const socializacion = conteo.socializacion / total;
  const penalizacion = (Object.keys(PENALIZACION_INCIDENTE) as SeveridadIncidente[])
    .reduce((suma, s) => suma + (incidentes[s] ?? 0) * PENALIZACION_INCIDENTE[s], 0);

  const acotar = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

  return {
    // Bienestar: juego (pesa más), acceso a agua y descanso
    bienestar: acotar((juego + agua * 0.75 + descanso * 0.75) * 100),
    // Seguridad: lugar conocido y poca densidad de eventos, menos los incidentes
    seguridad: acotar(
      (tipo && ['parque', 'conjunto'].includes(tipo) ? 60 : 40) +
      (total < 10 ? 30 : total > 50 ? -10 : 10) - penalizacion
    ),
    // Actividad: frecuencia total de eventos + ratio de juego
    actividad: acotar((total / 50) * 100 * 0.5 + juego * 50),
    // Socialización: eventos donde aparecen otros perros
    socializacion: acotar(socializacion * 100 + (total > 15 ? 20 : 0)),
  };
}

/**
 * Suma un momento de la bitácora a la narrativa de una celda y recalcula su
 * identidad y sus índices.
 * @param {Narrativa | undefined} actual Narrativa actual (o vacía).
 * @param {string} accion Clave del momento (`grupo.accion`).
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
  const identidad = identidadDe(eventos_por_tipo, base.identidad);
  return {
    ...base,
    identidad,
    total_eventos: base.total_eventos + 1,
    eventos_por_tipo,
    indices: calcularIndices(eventos_por_tipo, identidad.tipo, base.incidentes),
  };
}

/**
 * Suma un incidente a la narrativa de una celda: baja su seguridad.
 * @param {Narrativa | undefined} actual Narrativa actual (o vacía).
 * @param {SeveridadIncidente} severidad Gravedad del incidente.
 * @return {Narrativa} Narrativa nueva.
 */
export function sumarIncidente(
  actual: Narrativa | undefined,
  severidad: SeveridadIncidente
): Narrativa {
  const base = actual ?? NARRATIVA_VACIA;
  const incidentes = {
    ...base.incidentes,
    [severidad]: (base.incidentes?.[severidad] ?? 0) + 1,
  };
  return {
    ...base,
    incidentes,
    indices: calcularIndices(base.eventos_por_tipo, base.identidad.tipo, incidentes),
  };
}

/**
 * ¿Es una gravedad de incidente válida?
 * @param {unknown} valor Valor a comprobar.
 * @return {boolean} true si es baja, media o crítica.
 */
export function esSeveridad(valor: unknown): valor is SeveridadIncidente {
  return valor === 'baja' || valor === 'media' || valor === 'critica';
}
