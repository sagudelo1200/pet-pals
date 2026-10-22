/**
 * Política comercial (precios, comisión, IVA, cobro y liquidación): es un
 * tipo versionado del motor genérico (comun/versionado.ts). Aquí solo se
 * lee; se publica con el callable genérico publicarVersion.
 *
 * Cada paseo guarda la versión con la que se cobrará y cada operación los
 * números aplicados, así un cambio de política nunca es retroactivo.
 */
import type {Firestore} from 'firebase-admin/firestore';
import {obtenerVersion, obtenerVersionVigente, type Version} from '../comun/versionado';
import {TIPO_POLITICA_COMERCIAL} from '../compartido/versionables';
import type {
  ContenidoPoliticaComercial,
  PoliticaComercial,
} from '../compartido/politicaComercial';

/**
 * Política leída: contenido de la versión más su número.
 * @param {Version} v Versión publicada.
 * @return {PoliticaComercial} Política.
 */
function aPolitica(v: Version<ContenidoPoliticaComercial>): PoliticaComercial {
  return {...v.contenido, version: v.version};
}

/**
 * Lee una versión concreta de la política (la de una operación).
 * @param {Firestore} db Firestore.
 * @param {number} version Número de versión.
 * @return {Promise<PoliticaComercial>} Política.
 */
export async function obtenerPolitica(
  db: Firestore,
  version: number
): Promise<PoliticaComercial> {
  return aPolitica(await obtenerVersion<ContenidoPoliticaComercial>(
    db, TIPO_POLITICA_COMERCIAL, version));
}

/**
 * Lee la política vigente. Falla si no hay ninguna publicada: nunca se
 * cobra con un precio supuesto.
 * @param {Firestore} db Firestore.
 * @return {Promise<PoliticaComercial>} Política vigente.
 */
export async function obtenerPoliticaVigente(
  db: Firestore
): Promise<PoliticaComercial> {
  return aPolitica(await obtenerVersionVigente<ContenidoPoliticaComercial>(
    db, TIPO_POLITICA_COMERCIAL));
}
