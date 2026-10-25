/* eslint-disable camelcase */
/**
 * Zonas de negocio (núcleo puro): "Chicó", "Usaquén"... un conjunto de
 * hexágonos con nombre al que luego se le cuelgan reglas (tarifas,
 * promociones, estado del servicio).
 *
 * Una zona se define con barrios (R7) y R8 sueltos para afinar, y, si hace
 * falta, con celdas EXCLUIDAS: huecos dentro de la zona.
 *
 * Para saber a qué zona pertenece un punto se sube por la jerarquía y gana la
 * celda MÁS ESPECÍFICA que tenga dueño:
 *
 *   punto → R8 → R7
 *   "Chicó" tiene el barrio R7 completo; "Chicó Norte" tiene dos R8 dentro de
 *   él. Un punto en esos R8 es de "Chicó Norte"; el resto del barrio, de "Chicó".
 *
 * SERVICIO: con `paseos.exigir_zona` activo, solo se atiende (se pueden pedir
 * paseos) en zonas `activa` o `piloto`. Quien intenta pedir o ofrecer cobertura
 * fuera de servicio queda registrado como interesado: es la señal de dónde
 * abrir después.
 *
 * Firestore:
 *   zonas/{id}                { nombre, ciudad, estado, celdas, excluidas }
 *   celdas_zona/{celda}       { zona_id } — o { zona_id: null, excluida_de } si es
 *                             un hueco. Es el índice de búsqueda; lo deriva el
 *                             servidor de `zonas` al guardar.
 *   interes_zona/{uid}_{rol}_{celda}  un interesado en una celda fuera de servicio
 */
import {
  RESOLUCIONES,
  esCeldaValida,
  padreDe,
  resolucionDe,
  type RolResolucion,
} from './geografia';

export const COLECCION_ZONAS = 'zonas';
export const COLECCION_CELDAS_ZONA = 'celdas_zona';
export const COLECCION_INTERES_ZONA = 'interes_zona';

/** piloto: en prueba · activa: operando · cerrada: sin servicio. */
export const ESTADOS_ZONA = ['piloto', 'activa', 'cerrada'] as const;
export type EstadoZona = (typeof ESTADOS_ZONA)[number];

/** Tope de celdas (propias + excluidas) por zona. */
export const MAX_CELDAS_ZONA = 400;

export interface Zona {
  id: string
  nombre: string
  ciudad: string
  estado: EstadoZona
  celdas: string[]
  excluidas: string[]
}

/** Lo que dice `celdas_zona/{celda}`. */
export interface EntradaCeldaZona {
  /** Dueña de la celda; null si es un hueco (la celda no pertenece a ninguna zona). */
  zona_id: string | null
  /** Zona de la que es hueco (solo si `zona_id` es null). */
  excluida_de?: string
}

/**
 * Escalas en las que se define una zona: barrios y cobertura, de la más fina a
 * la más gruesa. Lo observado en el paseo (R9) no define zonas.
 */
const ESCALAS_DE_ZONA: readonly RolResolucion[] = ['cobertura', 'macro'];
const RESOLUCIONES_VALIDAS: readonly number[] =
  ESCALAS_DE_ZONA.map((rol) => RESOLUCIONES[rol]);

/**
 * Celdas donde buscar la zona de una celda: la de cada escala de zona que la
 * contiene, de la más específica a la más gruesa.
 * @param {string} celda Celda válida (R9, R8 o R7).
 * @return {string[]} Candidatas, la más específica primero.
 */
export function candidatasDe(celda: string): string[] {
  const propia = resolucionDe(celda);
  return ESCALAS_DE_ZONA
    .filter((rol) => RESOLUCIONES[rol] <= propia)
    .map((rol) => padreDe(celda, rol));
}

/**
 * Zona de una celda: la de la celda más específica que tenga entrada.
 * @param {string} celda Celda válida (normalmente R9 o R8).
 * @param {Function} buscar Entrada de `celdas_zona` de una celda, si existe.
 * @return {string | null} Id de la zona, o null si no pertenece a ninguna.
 */
export function resolverZonaId(
  celda: string,
  buscar: (candidata: string) => EntradaCeldaZona | undefined
): string | null {
  for (const candidata of candidatasDe(celda)) {
    const entrada = buscar(candidata);
    if (entrada !== undefined) return entrada.zona_id;
  }
  return null;
}

/**
 * Id legible de una zona: "bogota-chico".
 * @param {string} ciudad Ciudad.
 * @param {string} nombre Nombre.
 * @return {string} Id sin tildes ni símbolos.
 */
export function idDeZona(ciudad: string, nombre: string): string {
  return `${ciudad} ${nombre}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const textoLimpio = (v: unknown): string =>
  typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';

/**
 * Lista de celdas válidas y sin repetir; los problemas se agregan a `errores`.
 * @param {unknown} valor Lista recibida.
 * @param {string} campo Nombre del campo, para los mensajes.
 * @param {string[]} errores Errores acumulados.
 * @return {string[]} Celdas válidas.
 */
function listaDeCeldas(
  valor: unknown,
  campo: string,
  errores: string[]
): string[] {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor)) {
    errores.push(`${campo} debe ser una lista de celdas`);
    return [];
  }
  const celdas: string[] = [];
  for (const c of valor) {
    if (!esCeldaValida(c)) {
      errores.push(`${campo}: "${String(c)}" no es una celda válida`);
    } else if (!RESOLUCIONES_VALIDAS.includes(resolucionDe(c))) {
      errores.push(
        `${campo}: ${c} no está en una escala permitida (R7 o R8)`);
    } else if (!celdas.includes(c)) {
      celdas.push(c);
    }
  }
  return celdas;
}

/**
 * Valida lo que el admin quiere guardar de una zona.
 * @param {unknown} entrada Cuerpo recibido.
 * @return {object} Errores legibles y, si no hay, la zona limpia (sin id).
 */
export function validarZona(entrada: unknown): {
  errores: string[]
  zona?: Omit<Zona, 'id'>
} {
  const e = (entrada ?? {}) as Record<string, unknown>;
  const errores: string[] = [];

  const nombre = textoLimpio(e.nombre);
  if (nombre.length < 3 || nombre.length > 60) {
    errores.push('El nombre debe tener entre 3 y 60 caracteres');
  }
  const ciudad = textoLimpio(e.ciudad);
  if (ciudad.length < 2 || ciudad.length > 60) {
    errores.push('La ciudad debe tener entre 2 y 60 caracteres');
  }
  const estado = e.estado;
  if (!(ESTADOS_ZONA as readonly unknown[]).includes(estado)) {
    errores.push(`El estado debe ser ${ESTADOS_ZONA.join(', ')}`);
  }

  const celdas = listaDeCeldas(e.celdas, 'celdas', errores);
  const excluidas = listaDeCeldas(e.excluidas, 'excluidas', errores);

  if (celdas.length + excluidas.length > MAX_CELDAS_ZONA) {
    errores.push(`Una zona admite hasta ${MAX_CELDAS_ZONA} celdas`);
  }
  if (estado !== 'cerrada' && celdas.length === 0) {
    errores.push('Una zona piloto o activa necesita al menos una celda');
  }
  const repetidas = celdas.filter((c) => excluidas.includes(c));
  if (repetidas.length > 0) {
    errores.push(
      `Una celda no puede ser a la vez de la zona y excluida: ${repetidas[0]}`);
  }
  // Un hueco solo tiene sentido dentro de algo que la zona ya cubre
  for (const hueco of excluidas) {
    if (!esCeldaValida(hueco)) continue;
    const padres = candidatasDe(hueco).filter((c) => c !== hueco);
    if (!padres.some((p) => celdas.includes(p))) {
      errores.push(
        `La celda excluida ${hueco} no está dentro de ninguna celda de la zona`);
      break;
    }
  }

  if (errores.length > 0) return {errores};
  return {
    errores,
    zona: {nombre, ciudad, estado: estado as EstadoZona, celdas, excluidas},
  };
}

// ---------- Servicio: dónde se atiende ----------

/** Por qué una celda está fuera de servicio. */
export type MotivoSinServicio = 'sin_zona' | 'zona_cerrada';

export interface EstadoServicio {
  /** ¿Se pueden pedir paseos y recibir solicitudes aquí? */
  abierto: boolean
  motivo?: MotivoSinServicio
  /** Zona de la celda, si tiene. */
  zona_id?: string
  zona?: string
}

/**
 * Si se atiende una celda. Con `exigir_zona` apagado se atiende en todas partes
 * (así no se bloquea a nadie mientras no haya zonas definidas); con él
 * encendido, solo en zonas activas o piloto.
 * @param {object | null} zona Zona de la celda (null si no está en ninguna).
 * @param {boolean} exigirZona Valor de `paseos.exigir_zona`.
 * @return {EstadoServicio} Estado del servicio en esa celda.
 */
export function estadoDeServicio(
  zona: Pick<Zona, 'id' | 'nombre' | 'estado'> | null,
  exigirZona: boolean
): EstadoServicio {
  const datosZona = zona ? {zona_id: zona.id, zona: zona.nombre} : {};
  if (!exigirZona) return {abierto: true, ...datosZona};
  if (!zona) return {abierto: false, motivo: 'sin_zona'};
  if (zona.estado === 'cerrada') {
    return {abierto: false, motivo: 'zona_cerrada', ...datosZona};
  }
  return {abierto: true, ...datosZona};
}

// ---------- Interesados: dónde se pide servicio o se ofrece cobertura ----------

export type RolInteres = 'tutor' | 'cuidador';
export const ROLES_INTERES: readonly RolInteres[] = ['tutor', 'cuidador'];

/** `interes_zona/{uid}_{celda}`: alguien que quiere servicio en una celda sin él. */
export interface InteresZona {
  uid: string
  /** Celda de cobertura (R8) donde pidió o donde vive. */
  celda: string
  rol: RolInteres
  /** Pidió que le avisen cuando lleguemos. */
  avisar: boolean
  /** Ya se le avisó. */
  notificado: boolean
  /** Veces que lo intentó. */
  intentos: number
  desde: unknown
  ultimo: unknown
}

/**
 * Id del documento de un interesado: uno por persona, rol y celda (quien es
 * tutor y cuidador en la misma celda cuenta en cada rol).
 * @param {string} uid Persona.
 * @param {RolInteres} rol Rol con el que se interesa.
 * @param {string} celda Celda de cobertura.
 * @return {string} Id.
 */
export const idDeInteres = (
  uid: string,
  rol: RolInteres,
  celda: string
): string => `${uid}_${rol}_${celda}`;
