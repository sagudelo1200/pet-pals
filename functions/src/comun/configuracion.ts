/**
 * Configuración operativa (lado servidor): lectura con caché, escritura
 * validada con historial y siembra inicial. El catálogo vive en
 * compartido/configuracion.ts.
 */
import type {Firestore, Timestamp} from 'firebase-admin/firestore';
import {
  AREAS_CONFIGURACION,
  esAreaConfiguracion,
  resolverConfiguracion,
  validarCambios,
  valoresPorDefecto,
  type AreaConfiguracion,
  type ConfiguracionAreas,
} from '../compartido/configuracion';
import {jsonEstable} from '../compartido/versionables';
import {ErrorNegocio} from './errores';
import {exigirMotivo, type OpcionesPublicacion} from './versionado';

export const COLECCION_CONFIGURACION = 'configuracion';
const CACHE_MS = 60 * 1000;

const cache = new Map<AreaConfiguracion, {valores: unknown; hasta: number}>();

/** Vacía la caché (tras escribir y en tests). */
export function limpiarCacheConfiguracion(): void {
  cache.clear();
}

const refArea = (db: Firestore, area: AreaConfiguracion) =>
  db.collection(COLECCION_CONFIGURACION).doc(area);

/**
 * Lee la configuración de un área. Usa caché de 60 s por instancia. Si falta
 * un valor (o es inválido) usa el del catálogo y lo deja en los logs: un
 * valor operativo ausente no debe tumbar un flujo.
 * @param {Firestore} db Firestore.
 * @param {AreaConfiguracion} area Área.
 * @return {Promise<object>} Valores del área.
 */
export async function leerConfiguracion<A extends AreaConfiguracion>(
  db: Firestore,
  area: A
): Promise<ConfiguracionAreas[A]> {
  const enCache = cache.get(area);
  if (enCache && enCache.hasta > Date.now()) {
    return enCache.valores as ConfiguracionAreas[A];
  }
  const guardado = (await refArea(db, area).get()).data();
  const {valores, faltantes} = resolverConfiguracion(area, guardado);
  if (faltantes.length > 0) {
    console.warn(`[configuracion] ${area}: usando valor por defecto para ` +
      `${faltantes.join(', ')} (ejecuta npm run seed:base)`);
  }
  cache.set(area, {valores, hasta: Date.now() + CACHE_MS});
  return valores;
}

/**
 * Guarda cambios validados y deja registro en el historial del área (qué
 * cambió, quién y por qué). Solo escribe las claves que realmente cambian.
 * @param {Firestore} db Firestore.
 * @param {unknown} area Área.
 * @param {Record<string, unknown>} cambios Valores nuevos.
 * @param {OpcionesPublicacion} opciones Motivo, autor y momento.
 * @return {Promise<string[]>} Claves que cambiaron.
 */
export async function actualizarConfiguracion(
  db: Firestore,
  area: unknown,
  cambios: Record<string, unknown>,
  opciones: OpcionesPublicacion
): Promise<string[]> {
  const {autor, ahora} = opciones;
  if (!esAreaConfiguracion(area)) {
    throw new ErrorNegocio('invalid-argument', `Área desconocida: ${String(area)}`);
  }
  const motivo = exigirMotivo(opciones.motivo);
  const errores = validarCambios(area, cambios);
  if (errores.length > 0) throw new ErrorNegocio('invalid-argument', errores.join('; '));

  const ref = refArea(db, area);
  const cambiadas = await db.runTransaction(async (tx) => {
    const {valores} = resolverConfiguracion(area, (await tx.get(ref)).data());
    const antes = valores as Record<string, unknown>;
    const diferencias: Record<string, {antes: unknown; despues: unknown}> = {};
    for (const [clave, despues] of Object.entries(cambios)) {
      if (jsonEstable(antes[clave]) !== jsonEstable(despues)) {
        diferencias[clave] = {antes: antes[clave], despues};
      }
    }
    const claves = Object.keys(diferencias);
    if (claves.length === 0) return claves;

    const nuevos = Object.fromEntries(claves.map((c) => [c, diferencias[c].despues]));
    tx.set(ref, {...nuevos, actualizado_en: ahora, actualizado_por: autor},
      {merge: true});
    tx.set(ref.collection('historial').doc(), {
      cambios: diferencias,
      motivo,
      autor,
      en: ahora,
    });
    return claves;
  });
  cache.delete(area);
  return cambiadas;
}

/**
 * Crea las áreas y valores que falten con su valor por defecto. No toca los
 * valores ya guardados (idempotente).
 * @param {Firestore} db Firestore.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<object>} Claves sembradas por área.
 */
export async function sembrarConfiguracion(
  db: Firestore,
  ahora: Timestamp
): Promise<Partial<Record<AreaConfiguracion, string[]>>> {
  const resultado: Partial<Record<AreaConfiguracion, string[]>> = {};
  for (const area of AREAS_CONFIGURACION) {
    const ref = refArea(db, area);
    const guardado = (await ref.get()).data() ?? {};
    const defectos = valoresPorDefecto(area) as Record<string, unknown>;
    const faltan = Object.keys(defectos).filter((c) => guardado[c] === undefined);
    if (faltan.length === 0) continue;
    await ref.set({
      ...Object.fromEntries(faltan.map((c) => [c, defectos[c]])),
      actualizado_en: ahora,
      actualizado_por: 'sistema-seed',
    }, {merge: true});
    resultado[area] = faltan;
  }
  cache.clear();
  return resultado;
}
