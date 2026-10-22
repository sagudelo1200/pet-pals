/**
 * Motor de VERSIONADO genérico (lado servidor).
 *
 * Publica, lee y reactiva versiones de cualquier tipo registrado en
 * compartido/versionables.ts. Las versiones son inmutables: publicar crea
 * una nueva y archiva la anterior en la misma transacción; el puntero de la
 * serie siempre indica la vigente. Solo el servidor escribe (ver reglas).
 */
import {createHash} from 'crypto';
import type {Firestore, Timestamp} from 'firebase-admin/firestore';
import {
  COLECCION_VERSIONADOS,
  validarMotivo,
  SUBCOLECCION_VERSIONES,
  definicionVersionable,
  idVersion,
  jsonEstable,
  type DefinicionVersionable,
  type VersionPublicada,
} from '../compartido/versionables';
import {ErrorNegocio} from './errores';

export type Version<T> = VersionPublicada<T, Timestamp>;

export interface OpcionesPublicacion {
  /** Por qué cambia (queda en el historial). */
  motivo: string
  /** UID de quien publica (o 'sistema-seed'). */
  autor: string
  ahora: Timestamp
}

/**
 * Hash SHA-256 del contenido normalizado (evidencia de qué se publicó).
 * @param {unknown} contenido Contenido normalizado.
 * @return {string} Hash con prefijo 'sha256:'.
 */
export function hashContenido(contenido: unknown): string {
  return 'sha256:' + createHash('sha256').update(jsonEstable(contenido)).digest('hex');
}

const refSerie = (db: Firestore, tipo: string) =>
  db.collection(COLECCION_VERSIONADOS).doc(tipo);
const refVersion = (db: Firestore, tipo: string, version: number) =>
  refSerie(db, tipo).collection(SUBCOLECCION_VERSIONES).doc(idVersion(version));

/**
 * Definición registrada del tipo, o error si no existe.
 * @param {string} tipo Tipo versionable.
 * @return {DefinicionVersionable} Definición.
 */
function exigirDefinicion(tipo: string): DefinicionVersionable<unknown> {
  const def = definicionVersionable(tipo);
  if (!def) throw new ErrorNegocio('invalid-argument', `Tipo no versionable: ${tipo}`);
  return def;
}

/**
 * Lee una versión concreta.
 * @param {Firestore} db Firestore.
 * @param {string} tipo Tipo versionable.
 * @param {number} version Número de versión.
 * @return {Promise<Version>} Versión.
 */
export async function obtenerVersion<T>(
  db: Firestore,
  tipo: string,
  version: number
): Promise<Version<T>> {
  const snap = await refVersion(db, tipo, version).get();
  if (!snap.exists) {
    throw new ErrorNegocio('not-found', `${tipo} ${idVersion(version)} no existe`);
  }
  return snap.data() as Version<T>;
}

/**
 * Lee la versión vigente. Falla con un error claro si no hay ninguna: los
 * documentos versionados nunca se suponen con valores por defecto.
 * @param {Firestore} db Firestore.
 * @param {string} tipo Tipo versionable.
 * @return {Promise<Version>} Versión vigente.
 */
export async function obtenerVersionVigente<T>(
  db: Firestore,
  tipo: string
): Promise<Version<T>> {
  const vigente = (await refSerie(db, tipo).get()).data()?.version_vigente;
  if (typeof vigente !== 'number') {
    throw new ErrorNegocio('not-found',
      `No hay versión vigente de ${tipo} (ejecuta npm run seed:base)`);
  }
  return obtenerVersion<T>(db, tipo, vigente);
}

/**
 * Exige un motivo válido para el cambio.
 * @param {unknown} motivo Motivo recibido.
 * @return {string} Motivo limpio.
 */
export function exigirMotivo(motivo: unknown): string {
  const error = validarMotivo(motivo);
  if (error) throw new ErrorNegocio('invalid-argument', error);
  return (motivo as string).trim();
}

/**
 * Publica una nueva versión vigente y archiva la anterior, en una
 * transacción. Valida y normaliza el contenido con la definición del tipo.
 * Idempotente: si el contenido es igual al vigente no crea otra versión.
 * @param {Firestore} db Firestore.
 * @param {string} tipo Tipo versionable.
 * @param {unknown} contenido Contenido propuesto.
 * @param {OpcionesPublicacion} opciones Motivo, autor y momento.
 * @return {Promise<object>} Versión vigente, si es nueva y su hash.
 */
export async function publicarVersion(
  db: Firestore,
  tipo: string,
  contenido: unknown,
  opciones: OpcionesPublicacion
): Promise<{version: number; nueva: boolean; hash: string}> {
  const def = exigirDefinicion(tipo);
  const errores = def.validar(contenido);
  if (errores.length > 0) throw new ErrorNegocio('invalid-argument', errores.join('; '));
  const motivo = exigirMotivo(opciones.motivo);
  const normalizado = def.normalizar(contenido);
  const hash = hashContenido(normalizado);
  const {ahora, autor} = opciones;

  return db.runTransaction(async (tx) => {
    const serie = (await tx.get(refSerie(db, tipo))).data();
    const vigente = serie?.version_vigente as number | undefined;
    if (typeof vigente === 'number' && serie?.hash_vigente === hash) {
      return {version: vigente, nueva: false, hash};
    }
    const nueva = typeof vigente === 'number' ? vigente + 1 : 1;

    tx.set(refVersion(db, tipo, nueva), {
      tipo,
      version: nueva,
      esquema: def.esquema,
      estado: 'ACTIVA',
      motivo,
      hash,
      contenido: normalizado,
      vigente_desde: ahora,
      publicado_por: autor,
    });
    if (typeof vigente === 'number') {
      tx.update(refVersion(db, tipo, vigente), {
        estado: 'HISTORICA',
        vigente_hasta: ahora,
      });
    }
    tx.set(refSerie(db, tipo), {
      tipo,
      version_vigente: nueva,
      hash_vigente: hash,
      actualizado_en: ahora,
      actualizado_por: autor,
    });
    return {version: nueva, nueva: true, hash};
  });
}

/**
 * Vuelve a poner vigente el contenido de una versión anterior publicándolo
 * como versión nueva (las versiones nunca se modifican).
 * @param {Firestore} db Firestore.
 * @param {string} tipo Tipo versionable.
 * @param {number} version Versión a reactivar.
 * @param {OpcionesPublicacion} opciones Motivo, autor y momento.
 * @return {Promise<object>} Resultado de la publicación.
 */
export async function reactivarVersion(
  db: Firestore,
  tipo: string,
  version: number,
  opciones: OpcionesPublicacion
): Promise<{version: number; nueva: boolean; hash: string}> {
  exigirDefinicion(tipo);
  const anterior = await obtenerVersion(db, tipo, version);
  return publicarVersion(db, tipo, anterior.contenido, opciones);
}
