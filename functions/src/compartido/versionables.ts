/**
 * VERSIONADO GENÉRICO: registro de todo lo que Paw-Path versiona.
 *
 * Compartido por la app y las Cloud Functions. Cualquier documento cuyas
 * reglas no deben cambiar retroactivamente (políticas, términos legales,
 * futuras políticas de cancelación...) se registra aquí y usa el mismo
 * motor (functions/src/comun/versionado.ts):
 *
 *   versionados/{tipo}                → puntero: version_vigente, hash_vigente
 *   versionados/{tipo}/versiones/v{n} → versión inmutable:
 *     { tipo, version, esquema, estado, motivo, hash, contenido,
 *       vigente_desde, vigente_hasta, publicado_por }
 *
 * - Publicar lo mismo que ya está vigente no crea otra versión (hash).
 * - "Reactivar" una versión antigua publica una copia como versión nueva.
 * - `esquema` indica la forma de `contenido`, para evolucionarla sin romper.
 */
import {
  normalizarPolitica,
  validarPolitica,
  type ContenidoPoliticaComercial,
} from './politicaComercial';
import {
  PREFIJO_CONSENTIMIENTO,
  TIPOS_CONSENTIMIENTO,
  normalizarConsentimiento,
  tipoVersionableConsentimiento,
  validarConsentimiento,
  type ContenidoConsentimiento,
} from './consentimiento';

export const COLECCION_VERSIONADOS = 'versionados';
export const SUBCOLECCION_VERSIONES = 'versiones';

export const TIPO_POLITICA_COMERCIAL = 'politica_comercial';

/** Id del documento de una versión. */
export const idVersion = (version: number): string => `v${version}`;

/** Motivo del cambio: obligatorio y acotado. */
export const MAX_MOTIVO = 300;

/**
 * Valida el motivo de un cambio (versiones y configuración).
 * @param {unknown} motivo Motivo recibido.
 * @return {string | null} Error legible, o null si es válido.
 */
export function validarMotivo(motivo: unknown): string | null {
  const limpio = typeof motivo === 'string' ? motivo.trim() : '';
  return limpio && limpio.length <= MAX_MOTIVO ? null :
    `Motivo: requerido, máximo ${MAX_MOTIVO} caracteres`;
}

export type EstadoVersion = 'ACTIVA' | 'HISTORICA';

/**
 * Quién puede leer un tipo:
 * - publica: cualquiera, incluso sin sesión (p. ej. términos al registrarse)
 * - autenticada: usuarios con sesión
 */
export type LecturaVersionable = 'publica' | 'autenticada';

export interface DefinicionVersionable<T> {
  titulo: string
  /** Forma actual del contenido; súbela al cambiar la estructura. */
  esquema: number
  lectura: LecturaVersionable
  validar: (contenido: unknown) => string[]
  normalizar: (contenido: T) => T
}

/** Versión leída de Firestore (las fechas dependen del SDK: app o admin). */
export interface VersionPublicada<T, Fecha = unknown> {
  tipo: string
  version: number
  esquema: number
  estado: EstadoVersion
  motivo: string
  hash: string
  contenido: T
  vigente_desde: Fecha
  vigente_hasta?: Fecha
  publicado_por: string
}

const POLITICA_COMERCIAL: DefinicionVersionable<ContenidoPoliticaComercial> = {
  titulo: 'Política comercial',
  esquema: 1,
  lectura: 'autenticada',
  validar: validarPolitica,
  normalizar: normalizarPolitica,
};

const CONSENTIMIENTO: DefinicionVersionable<ContenidoConsentimiento> = {
  titulo: 'Consentimiento',
  esquema: 1,
  lectura: 'publica',
  validar: validarConsentimiento,
  normalizar: normalizarConsentimiento,
};

/**
 * Definición de un tipo versionable, o null si no está registrado.
 * @param {string} tipo Tipo (p. ej. 'politica_comercial').
 * @return {DefinicionVersionable | null} Definición.
 */
export function definicionVersionable(
  tipo: string
): DefinicionVersionable<unknown> | null {
  if (tipo === TIPO_POLITICA_COMERCIAL) {
    return POLITICA_COMERCIAL as DefinicionVersionable<unknown>;
  }
  if (tipo.startsWith(PREFIJO_CONSENTIMIENTO) &&
      (TIPOS_CONSENTIMIENTO as readonly string[])
        .includes(tipo.slice(PREFIJO_CONSENTIMIENTO.length))) {
    return {
      ...CONSENTIMIENTO,
      titulo: `Consentimiento ${tipo.slice(PREFIJO_CONSENTIMIENTO.length)}`,
    } as DefinicionVersionable<unknown>;
  }
  return null;
}

/** Todos los tipos versionables registrados (para listarlos en el admin). */
export const TIPOS_VERSIONABLES: string[] = [
  TIPO_POLITICA_COMERCIAL,
  ...TIPOS_CONSENTIMIENTO.map(tipoVersionableConsentimiento),
];

/**
 * JSON con las claves ordenadas: el mismo contenido siempre produce el mismo
 * texto, sin importar el orden en que llegaron los campos (base del hash).
 * @param {unknown} valor Valor a serializar.
 * @return {string} JSON estable.
 */
export function jsonEstable(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(jsonEstable).join(',')}]`;
  if (valor && typeof valor === 'object') {
    const claves = Object.keys(valor as Record<string, unknown>).sort();
    return `{${claves
      .map((k) => `${JSON.stringify(k)}:${
        jsonEstable((valor as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(valor ?? null);
}
