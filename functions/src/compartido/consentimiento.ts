/* eslint-disable camelcase */
/**
 * CONSENTIMIENTOS: documentos legales versionados (términos, datos
 * personales, marketing). Compartido por la app y las Cloud Functions.
 *
 * Cada tipo de documento es una serie versionada propia
 * ('consentimiento_DATOS_PERSONALES', ...); ver versionables.ts.
 */

export const TIPOS_CONSENTIMIENTO = [
  'TERMINOS_SERVICIO',
  'DATOS_PERSONALES',
  'MARKETING_COMUNICACIONES',
] as const;

export type TipoDocumentoConsentimiento = typeof TIPOS_CONSENTIMIENTO[number];

export const PREFIJO_CONSENTIMIENTO = 'consentimiento_';

/** Contenido de una versión de un documento de consentimiento. */
export interface ContenidoConsentimiento {
  titulo: string
  /** Texto legal (Markdown) que lee y acepta el usuario. */
  texto: string
  es_obligatorio: boolean
  /** Si no está vacío, solo estos roles pueden aceptarlo. */
  roles_requeridos: string[]
  /** Meses de validez de la aceptación; null = indefinido. */
  requiere_reconfirmacion_meses: number | null
}

const MAX_TITULO = 200;
const MAX_TEXTO = 100000;

/**
 * Serie versionada de un tipo de consentimiento.
 * @param {string} tipoDocumento Tipo (DATOS_PERSONALES, ...).
 * @return {string} Tipo versionable.
 */
export function tipoVersionableConsentimiento(tipoDocumento: string): string {
  return `${PREFIJO_CONSENTIMIENTO}${tipoDocumento}`;
}

/**
 * ¿Es un tipo de consentimiento conocido?
 * @param {unknown} tipo Valor a comprobar.
 * @return {boolean} Si es válido.
 */
export function esTipoConsentimiento(
  tipo: unknown
): tipo is TipoDocumentoConsentimiento {
  return typeof tipo === 'string' &&
    (TIPOS_CONSENTIMIENTO as readonly string[]).includes(tipo);
}

/**
 * Valida el contenido de un documento de consentimiento.
 * @param {unknown} datos Datos recibidos.
 * @return {string[]} Errores encontrados.
 */
export function validarConsentimiento(datos: unknown): string[] {
  const d = datos as Partial<ContenidoConsentimiento> | undefined;
  const errores: string[] = [];
  if (typeof d?.titulo !== 'string' || !d.titulo.trim() ||
      d.titulo.length > MAX_TITULO) {
    errores.push(`Título: requerido, máximo ${MAX_TITULO} caracteres`);
  }
  if (typeof d?.texto !== 'string' || !d.texto.trim() || d.texto.length > MAX_TEXTO) {
    errores.push('Texto: requerido');
  }
  if (typeof d?.es_obligatorio !== 'boolean') {
    errores.push('Obligatorio: indica si es obligatorio');
  }
  if (!Array.isArray(d?.roles_requeridos) ||
      !d.roles_requeridos.every((r) => typeof r === 'string')) {
    errores.push('Roles requeridos: debe ser una lista (vacía = todos)');
  }
  const meses = d?.requiere_reconfirmacion_meses;
  if (meses !== null && !(Number.isInteger(meses) && (meses as number) > 0)) {
    errores.push('Reconfirmación: meses enteros mayores que 0, o sin reconfirmación');
  }
  return errores;
}

/**
 * Copia solo los campos conocidos, en orden fijo (hash estable).
 * @param {ContenidoConsentimiento} d Contenido ya validado.
 * @return {ContenidoConsentimiento} Contenido normalizado.
 */
export function normalizarConsentimiento(
  d: ContenidoConsentimiento
): ContenidoConsentimiento {
  return {
    titulo: d.titulo.trim(),
    texto: d.texto,
    es_obligatorio: d.es_obligatorio,
    roles_requeridos: [...d.roles_requeridos].sort(),
    requiere_reconfirmacion_meses: d.requiere_reconfirmacion_meses,
  };
}
