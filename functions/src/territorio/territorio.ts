/* eslint-disable camelcase */
/**
 * Territorio (lado servidor): el único que escribe lo que se sabe de cada
 * celda. La app solo lee.
 *
 * Qué mantiene y de dónde sale cada dato:
 *
 * - `indice_cobertura/{celda}/cuidadores/{uid}`: "quién atiende en esta celda".
 *   Se deriva del perfil del cuidador (su celda de origen o las celdas que
 *   eligió). La búsqueda de cuidadores lo usa solo para saber QUIÉNES cubren
 *   una celda; el resto lo lee de `perfiles_publicos`.
 * - `territorio/{celda R8}.operativa`: oferta y demanda. Se RECALCULA contando
 *   (cuidadores verificados del índice, pedidos pendientes, paseos en curso y
 *   hechos). No se suma ni se resta: si un aviso se pierde o llega repetido, el
 *   siguiente recálculo deja el número correcto.
 * - `territorio/{celda R9}.narrativa`: lo observado en el paseo, acumulado desde
 *   los eventos de la bitácora (cada evento se cuenta una sola vez).
 */
import {
  Timestamp,
  type Firestore,
  type Query,
} from 'firebase-admin/firestore';
import {
  celdaDe,
  celdasDeCoberturaDe,
  esCeldaValida,
  padreDe,
  resolucionDe,
  RESOLUCIONES,
} from '../compartido/geografia';
import {
  COLECCION_TERRITORIO,
  armarOperativa,
  sumarEvento,
  type Narrativa,
} from '../compartido/territorio';

type Dato = Record<string, unknown>;

export const COLECCION_INDICE = 'indice_cobertura';
export const SUBCOLECCION_INDICE = 'cuidadores';

const ESTADOS_EN_CURSO = ['EN_CAMINO', 'EN_PUNTO_RECOGIDA', 'EN_PROGRESO'];
const ESTADOS_HECHOS = ['FINALIZADO', 'COMPLETADO'];
const MAX_CELDAS_POR_LOTE = 400;

const esTexto = (v: unknown): v is string => typeof v === 'string';
const numero = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

// ---------- Índice de cobertura (de perfil a celdas) ----------

interface Cobertura {
  celdas: string[]
  uid: string
  h3_origen: string
  verificado: boolean
}

/**
 * Dónde atiende un cuidador y si está verificado, según su perfil.
 * @param {string} uid Cuidador.
 * @param {Dato | undefined} perfil Perfil público (o undefined si no existe).
 * @return {Cobertura | null} Cobertura, o null si no tiene ubicación.
 */
export function coberturaDe(
  uid: string,
  perfil: Dato | undefined
): Cobertura | null {
  if (!perfil) return null;
  const celdas = celdasDeCoberturaDe(perfil);
  if (celdas.length === 0) return null;
  const insignias = Array.isArray(perfil.insignias_verificacion) ?
    perfil.insignias_verificacion : [];
  return {
    celdas,
    uid,
    h3_origen: esCeldaValida(perfil.h3_r8) ? perfil.h3_r8 : celdas[0],
    verificado: insignias.includes('IDENTIDAD'),
  };
}

const mismaCobertura = (a: Cobertura | null, b: Cobertura | null): boolean =>
  a === b || (a !== null && b !== null &&
    a.verificado === b.verificado &&
    a.h3_origen === b.h3_origen &&
    a.celdas.length === b.celdas.length &&
    a.celdas.every((c) => b.celdas.includes(c)));

/**
 * Pone el índice al día cuando cambia el perfil de un cuidador: borra las
 * celdas que dejó de cubrir y escribe las que cubre. No hace nada si lo que
 * importa (celdas, origen, verificación) no cambió.
 * @param {Firestore} db Firestore.
 * @param {string} uid Cuidador.
 * @param {Dato | undefined} antes Perfil antes del cambio.
 * @param {Dato | undefined} despues Perfil después del cambio.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<string[]>} Celdas afectadas (para recalcular su oferta).
 */
export async function sincronizarCobertura(
  db: Firestore,
  uid: string,
  antes: Dato | undefined,
  despues: Dato | undefined,
  ahora: Timestamp
): Promise<string[]> {
  const a = coberturaDe(uid, antes);
  const d = coberturaDe(uid, despues);
  if (mismaCobertura(a, d)) return [];

  const ref = (celda: string) =>
    db.doc(`${COLECCION_INDICE}/${celda}/${SUBCOLECCION_INDICE}/${uid}`);
  const batch = db.batch();
  const nuevas = new Set(d?.celdas ?? []);
  for (const celda of a?.celdas ?? []) {
    if (!nuevas.has(celda)) batch.delete(ref(celda));
  }
  for (const celda of nuevas) {
    batch.set(ref(celda), {
      uid,
      h3_origen: d!.h3_origen,
      verificado: d!.verificado,
      actualizado_en: ahora,
    });
  }
  await batch.commit();
  return [...new Set([...(a?.celdas ?? []), ...nuevas])];
}

// ---------- Operativa (oferta y demanda) ----------

/**
 * Cuenta documentos que cumplen condiciones de igualdad.
 * @param {Firestore} db Firestore.
 * @param {string} coleccion Ruta de la colección.
 * @param {Array} filtros Pares campo/valor.
 * @return {Promise<number>} Cantidad.
 */
async function contar(
  db: Firestore,
  coleccion: string,
  filtros: Array<[string, unknown]>
): Promise<number> {
  let consulta: Query = db.collection(coleccion);
  for (const [campo, valor] of filtros) {
    consulta = consulta.where(campo, '==', valor);
  }
  const resultado = await consulta.count().get();
  return resultado.data().count;
}

/**
 * Recalcula la oferta y la demanda de una celda de cobertura contando.
 * @param {Firestore} db Firestore.
 * @param {string} celda Celda de cobertura (R8).
 * @param {Timestamp} ahora Momento.
 * @return {Promise<void>}
 */
export async function recalcularOperativa(
  db: Firestore,
  celda: string,
  ahora: Timestamp
): Promise<void> {
  if (!esCeldaValida(celda) || resolucionDe(celda) !== RESOLUCIONES.cobertura) {
    return;
  }
  const paseos = (estado: string) => contar(db, 'operaciones', [
    ['tipo', 'paseo'], ['h3_r8', celda], ['estado', estado],
  ]);

  const [cuidadores, pendientes, enCurso, hechos] = await Promise.all([
    contar(db, `${COLECCION_INDICE}/${celda}/${SUBCOLECCION_INDICE}`,
      [['verificado', true]]),
    paseos('PENDIENTE'),
    Promise.all(ESTADOS_EN_CURSO.map(paseos)),
    Promise.all(ESTADOS_HECHOS.map(paseos)),
  ]);
  const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  await db.doc(`${COLECCION_TERRITORIO}/${celda}`).set({
    celda,
    res: RESOLUCIONES.cobertura,
    padre_r8: celda,
    operativa: armarOperativa({
      cuidadores_count: cuidadores,
      demanda_total: pendientes,
      paseos_activos: suma(enCurso),
      paseos_total: suma(enCurso) + suma(hechos),
    }),
    actualizado_en: ahora,
  }, {merge: true});
}

/**
 * Recalcula varias celdas (sin repetir).
 * @param {Firestore} db Firestore.
 * @param {string[]} celdas Celdas de cobertura.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<number>} Cuántas celdas se recalcularon.
 */
export async function recalcularOperativas(
  db: Firestore,
  celdas: string[],
  ahora: Timestamp
): Promise<number> {
  const unicas = [...new Set(celdas)].slice(0, MAX_CELDAS_POR_LOTE);
  await Promise.all(unicas.map((c) => recalcularOperativa(db, c, ahora)));
  return unicas.length;
}

/**
 * Celda de cobertura de un paseo: la que guardó al crearse o, si es un paseo
 * viejo, la de las coordenadas del punto de recogida.
 * @param {Dato | undefined} paseo Documento del paseo.
 * @return {string | undefined} Celda R8, o undefined si no se puede saber.
 */
export function celdaDePaseo(paseo: Dato | undefined): string | undefined {
  if (!paseo || paseo.tipo !== 'paseo') return undefined;
  if (esCeldaValida(paseo.h3_r8)) return paseo.h3_r8;
  const c = (paseo.ubicacion_inicio as
    {coordenadas?: {latitude?: unknown; longitude?: unknown}} | undefined)
    ?.coordenadas;
  const lat = numero(c?.latitude);
  const lng = numero(c?.longitude);
  return lat !== undefined && lng !== undefined ? celdaDe(lat, lng) : undefined;
}

/**
 * Un paseo cambió: recalcula la celda donde está (y la anterior si cambió).
 * Solo cuando se crea, se borra o cambia de estado o de celda.
 * @param {Firestore} db Firestore.
 * @param {Dato | undefined} antes Paseo antes.
 * @param {Dato | undefined} despues Paseo después.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<string[]>} Celdas recalculadas.
 */
export async function actualizarPorPaseo(
  db: Firestore,
  antes: Dato | undefined,
  despues: Dato | undefined,
  ahora: Timestamp
): Promise<string[]> {
  const celdaAntes = celdaDePaseo(antes);
  const celdaDespues = celdaDePaseo(despues);
  const cambio = antes?.estado !== despues?.estado ||
    celdaAntes !== celdaDespues;
  if (!cambio) return [];
  const celdas = [celdaAntes, celdaDespues].filter(
    (c): c is string => c !== undefined);
  await recalcularOperativas(db, celdas, ahora);
  return [...new Set(celdas)];
}

// ---------- Narrativa (lo observado) ----------

/**
 * Suma un evento de la bitácora a la narrativa de su microzona. Cada evento se
 * cuenta una sola vez (se marca en el propio evento), aunque el aviso llegue
 * repetido.
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo.
 * @param {string} eventoId Evento.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<boolean>} true si se contó.
 */
export async function sumarEventoATerritorio(
  db: Firestore,
  paseoId: string,
  eventoId: string,
  ahora: Timestamp
): Promise<boolean> {
  const eventoRef = db.doc(`operaciones/${paseoId}/eventos/${eventoId}`);
  return db.runTransaction(async (tx) => {
    const evento = (await tx.get(eventoRef)).data();
    if (!evento || evento.evento !== 'bitacora' ||
      evento.territorio_contado === true) {
      return false;
    }
    const celda = (evento.hechoTerritorial as Dato | undefined)?.h3_r9;
    if (!esCeldaValida(celda) || resolucionDe(celda) !== RESOLUCIONES.micro) {
      return false;
    }
    const accion = esTexto((evento.payload as Dato | undefined)?.accion) ?
      (evento.payload as Dato).accion as string : 'desconocido';

    const ref = db.doc(`${COLECCION_TERRITORIO}/${celda}`);
    const actual = (await tx.get(ref)).data();
    tx.set(ref, {
      celda,
      res: RESOLUCIONES.micro,
      padre_r8: padreDe(celda, 'cobertura'),
      narrativa: sumarEvento(actual?.narrativa as Narrativa | undefined, accion),
      actualizado_en: ahora,
    }, {merge: true});
    tx.update(eventoRef, {territorio_contado: true});
    return true;
  });
}

// ---------- Reconstrucción (mantenimiento) ----------

/**
 * Reconstruye el índice y la oferta/demanda desde los datos. Para el
 * administrador: sirve para poblar el territorio por primera vez o para
 * corregir cualquier desajuste.
 * @param {Firestore} db Firestore.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<object>} Cuántos perfiles se sincronizaron y celdas se recalcularon.
 */
export async function reconstruirTerritorio(
  db: Firestore,
  ahora: Timestamp
): Promise<{perfiles: number; celdas: number}> {
  const perfiles = await db.collection('perfiles_publicos').get();
  const celdas = new Set<string>();
  let sincronizados = 0;
  for (const doc of perfiles.docs) {
    const afectadas = await sincronizarCobertura(
      db, doc.id, undefined, doc.data(), ahora);
    if (afectadas.length > 0) sincronizados++;
    afectadas.forEach((c) => celdas.add(c));
  }
  const pendientes = await db.collection('operaciones')
    .where('tipo', '==', 'paseo').where('estado', '==', 'PENDIENTE').get();
  for (const doc of pendientes.docs) {
    const celda = celdaDePaseo(doc.data());
    if (celda) celdas.add(celda);
  }
  const recalculadas = await recalcularOperativas(db, [...celdas], ahora);
  return {perfiles: sincronizados, celdas: recalculadas};
}

