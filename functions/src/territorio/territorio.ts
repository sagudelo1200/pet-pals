/* eslint-disable camelcase */
/**
 * Territorio (lado servidor): el único que escribe lo que se sabe de cada
 * celda. La app solo lee.
 *
 * Qué mantiene y de dónde sale cada dato:
 *
 * - `indice_cobertura/{celda}/cuidadores/{uid}`: "quién atiende en esta celda".
 *   Se deriva del perfil del cuidador (su celda de origen o las celdas que
 *   eligió) y SOLO existe para quien está habilitado para pasear: un tutor, un
 *   admin o un cuidador aún sin aprobar no figuran. La búsqueda de cuidadores
 *   lo usa para saber QUIÉNES cubren una celda; el resto lo lee de
 *   `perfiles_publicos`.
 * - `territorio/{celda R8}.operativa`: oferta y demanda. Se RECALCULA contando
 *   (cuidadores habilitados del índice, pedidos pendientes, paseos en curso y
 *   hechos). No se suma ni se resta: si un aviso se pierde o llega repetido, el
 *   siguiente recálculo deja el número correcto.
 * - `territorio/{celda R9}.narrativa`: lo observado en el paseo, acumulado desde
 *   los momentos de la bitácora y los incidentes (cada evento se cuenta una sola
 *   vez). Además el paseo guarda en `h3_r9` la última microzona observada.
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
import {ofreceServicio} from '../compartido/habilitacion';
import {
  COLECCION_TERRITORIO,
  armarOperativa,
  esSeveridad,
  sumarEvento,
  sumarIncidente,
  type Narrativa,
} from '../compartido/territorio';
import {TIPO_PASEO, esPaseo} from '../compartido/servicios';

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
  /** Hasta cuándo (ms) vale su habilitación para pasear; null si no vence. */
  habilitadoHasta: number | null
}

/**
 * Instante (ms) en que vence la habilitación del servicio, según el perfil.
 * @param {Dato} perfil Perfil público.
 * @param {string} servicio Servicio.
 * @return {number | null} Vencimiento, o null si no vence (o no hay dato).
 */
function vencimientoDe(perfil: Dato, servicio: string): number | null {
  const vencen = perfil.servicios_vencen as Record<string, unknown> | undefined;
  const vence = vencen?.[servicio];
  return typeof vence === 'number' ? vence : null;
}

/**
 * Dónde atiende un cuidador, según su perfil. Solo cuenta quien está
 * habilitado para pasear ahora: los demás perfiles (tutores, admin, cuidadores
 * sin aprobar o con la habilitación vencida) no tienen cobertura.
 * @param {string} uid Cuidador.
 * @param {Dato | undefined} perfil Perfil público (o undefined si no existe).
 * @param {number} ahoraMs Momento, para saber si su habilitación sigue vigente.
 * @return {Cobertura | null} Cobertura, o null si no atiende (sin ubicación o
 *   sin habilitación).
 */
export function coberturaDe(
  uid: string,
  perfil: Dato | undefined,
  ahoraMs: number,
  manual = false
): Cobertura | null {
  if (!perfil || !ofreceServicio(perfil, TIPO_PASEO, ahoraMs)) return null;
  const celdas = celdasDeCoberturaDe(perfil, manual);
  if (celdas.length === 0) return null;
  return {
    celdas,
    uid,
    h3_origen: esCeldaValida(perfil.h3_r8) ? perfil.h3_r8 : celdas[0],
    habilitadoHasta: vencimientoDe(perfil, TIPO_PASEO),
  };
}

const mismaCobertura = (a: Cobertura | null, b: Cobertura | null): boolean =>
  a === b || (a !== null && b !== null &&
    a.habilitadoHasta === b.habilitadoHasta &&
    a.h3_origen === b.h3_origen &&
    a.celdas.length === b.celdas.length &&
    a.celdas.every((c) => b.celdas.includes(c)));

/**
 * Pone el índice al día cuando cambia el perfil de un cuidador: borra las
 * celdas que dejó de cubrir (todas si ya no está habilitado) y escribe las que
 * cubre. No hace nada si lo que importa (celdas, origen y vencimiento de su
 * habilitación) no cambió. Se guarda hasta cuándo vale la habilitación para que
 * el conteo de oferta descarte lo vencido sin esperar a que el perfil cambie.
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
  ahora: Timestamp,
  manual = false,
  manualAntes = manual
): Promise<string[]> {
  const a = coberturaDe(uid, antes, ahora.toMillis(), manualAntes);
  const d = coberturaDe(uid, despues, ahora.toMillis(), manual);
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
      habilitado_hasta: d!.habilitadoHasta,
      actualizado_en: ahora,
    });
  }
  await batch.commit();
  return [...new Set([...(a?.celdas ?? []), ...nuevas])];
}

/**
 * El admin encendió o apagó la cobertura manual: pone el índice al día para
 * quien tiene celdas elegidas a mano (el resto cubre lo mismo en ambos modos).
 * @param {Firestore} db Firestore.
 * @param {boolean} manual Modo nuevo.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<number>} Celdas cuya oferta se recalculó.
 */
export async function aplicarCoberturaManual(
  db: Firestore,
  manual: boolean,
  ahora: Timestamp
): Promise<number> {
  const perfiles = await db.collection('perfiles_publicos').get();
  const celdas = new Set<string>();
  for (const doc of perfiles.docs) {
    const afectadas = await sincronizarCobertura(
      db, doc.id, doc.data(), doc.data(), ahora, manual, !manual);
    afectadas.forEach((c) => celdas.add(c));
  }
  return recalcularOperativas(db, [...celdas], ahora);
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
 * Cuidadores de la celda con la habilitación vigente a esa hora. El índice solo
 * tiene habilitados; se leen los documentos (pocas decenas por celda) en vez de
 * contar para descartar los que ya vencieron sin pedir un índice compuesto.
 * @param {Firestore} db Firestore.
 * @param {string} celda Celda de cobertura.
 * @param {number} ahoraMs Momento de referencia.
 * @return {Promise<number>} Cantidad.
 */
async function contarHabilitados(
  db: Firestore,
  celda: string,
  ahoraMs: number
): Promise<number> {
  const docs = await db
    .collection(`${COLECCION_INDICE}/${celda}/${SUBCOLECCION_INDICE}`)
    .get();
  return docs.docs.filter((d) => {
    const hasta = d.data().habilitado_hasta;
    return typeof hasta !== 'number' || hasta > ahoraMs;
  }).length;
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
    ['tipo', TIPO_PASEO], ['h3_r8', celda], ['estado', estado],
  ]);

  const [cuidadores, pendientes, enCurso, hechos] = await Promise.all([
    contarHabilitados(db, celda, ahora.toMillis()),
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
  if (!paseo || !esPaseo(paseo)) return undefined;
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
 * Suma un evento del paseo (un momento de la bitácora o un incidente) a la
 * narrativa de su microzona y anota esa microzona en el paseo. Cada evento se
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
  const paseoRef = db.doc(`operaciones/${paseoId}`);
  return db.runTransaction(async (tx) => {
    const evento = (await tx.get(eventoRef)).data();
    const esIncidente = evento?.evento === 'incidente';
    if (!evento || (evento.evento !== 'bitacora' && !esIncidente) ||
      evento.territorio_contado === true) {
      return false;
    }
    const celda = (evento.hechoTerritorial as Dato | undefined)?.h3_r9;
    if (!esCeldaValida(celda) || resolucionDe(celda) !== RESOLUCIONES.micro) {
      return false;
    }
    const payload = evento.payload as Dato | undefined;
    const ref = db.doc(`${COLECCION_TERRITORIO}/${celda}`);
    const actual = (await tx.get(ref)).data()?.narrativa as Narrativa | undefined;
    const hayPaseo = (await tx.get(paseoRef)).exists;

    const narrativa = esIncidente ?
      sumarIncidente(actual, esSeveridad(payload?.severidad) ?
        payload.severidad : 'media') :
      sumarEvento(actual, esTexto(payload?.accion) ?
        payload.accion : 'desconocido');
    tx.set(ref, {
      celda,
      res: RESOLUCIONES.micro,
      padre_r8: padreDe(celda, 'cobertura'),
      narrativa,
      actualizado_en: ahora,
    }, {merge: true});
    tx.update(eventoRef, {territorio_contado: true});
    // La tarjeta del tutor lee de aquí qué microzona se está recorriendo
    if (hayPaseo) tx.update(paseoRef, {h3_r9: celda});
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
  ahora: Timestamp,
  manual = false
): Promise<{perfiles: number; celdas: number}> {
  const perfiles = await db.collection('perfiles_publicos').get();
  const celdas = new Set<string>();
  let sincronizados = 0;
  for (const doc of perfiles.docs) {
    const afectadas = await sincronizarCobertura(
      db, doc.id, undefined, doc.data(), ahora, manual);
    if (afectadas.length > 0) sincronizados++;
    afectadas.forEach((c) => celdas.add(c));
  }
  const pendientes = await db.collection('operaciones')
    .where('tipo', '==', TIPO_PASEO).where('estado', '==', 'PENDIENTE').get();
  for (const doc of pendientes.docs) {
    const celda = celdaDePaseo(doc.data());
    if (celda) celdas.add(celda);
  }
  const recalculadas = await recalcularOperativas(db, [...celdas], ahora);
  return {perfiles: sincronizados, celdas: recalculadas};
}

