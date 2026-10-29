/* eslint-disable camelcase */
/**
 * Zonas de negocio (lado servidor): el admin las define y el servidor deriva el
 * índice `celdas_zona` que permite saber a qué zona pertenece un punto.
 *
 *   zonas/{id}                 lo que el admin guarda (nombre, ciudad, estado, celdas)
 *   zonas/{id}/historial/{x}   qué cambió, quién y por qué
 *   celdas_zona/{celda}        índice de búsqueda: de quién es cada celda
 *
 * Reglas del juego:
 * - Una celda (el id exacto) pertenece a UNA sola zona. Zonas de escalas
 *   distintas sí se pueden superponer: gana la celda más específica.
 * - Guardar es idempotente: repetir el mismo guardado deja todo igual.
 * - Una zona no se borra: se cierra (y puede liberar sus celdas).
 * - Cada paseo guarda la zona que tenía al crearse (`zona_id`), para que sus
 *   reglas queden fijas aunque la zona cambie después.
 */
import {
  Timestamp,
  type Firestore,
  type WriteBatch,
} from 'firebase-admin/firestore';
import {ErrorNegocio} from '../comun/errores';
import {exigirMotivo} from '../comun/versionado';
import {celdaDe, esCeldaValida} from '../compartido/geografia';
import {
  COLECCION_CELDAS_ZONA,
  COLECCION_ZONAS,
  candidatasDe,
  idDeZona,
  validarZona,
  type EntradaCeldaZona,
} from '../compartido/zonas';
import {esPaseo} from '../compartido/servicios';

type Dato = Record<string, unknown>;

const LOTE = 400;
const LECTURAS_EN_PARALELO = 100;

const refCelda = (db: Firestore, celda: string) =>
  db.doc(`${COLECCION_CELDAS_ZONA}/${celda}`);

const textos = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/**
 * Entradas del índice que le corresponden a una zona.
 * @param {string} id Zona.
 * @param {string[]} celdas Celdas de la zona.
 * @param {string[]} excluidas Huecos de la zona.
 * @return {Map<string, EntradaCeldaZona>} `celda → entrada`.
 */
function entradasDeZona(
  id: string,
  celdas: string[],
  excluidas: string[]
): Map<string, EntradaCeldaZona> {
  const entradas = new Map<string, EntradaCeldaZona>();
  for (const c of celdas) entradas.set(c, {zona_id: id});
  for (const c of excluidas) entradas.set(c, {zona_id: null, excluida_de: id});
  return entradas;
}

/**
 * Ejecuta escrituras en lotes (Firestore admite 500 por lote).
 * @param {Firestore} db Firestore.
 * @param {Function[]} operaciones Cada una agrega su escritura al lote.
 * @return {Promise<void>}
 */
async function escribirEnLotes(
  db: Firestore,
  operaciones: Array<(lote: WriteBatch) => void>
): Promise<void> {
  for (let i = 0; i < operaciones.length; i += LOTE) {
    const lote = db.batch();
    operaciones.slice(i, i + LOTE).forEach((op) => op(lote));
    await lote.commit();
  }
}

/**
 * Celdas que ya son de otra zona (no se pueden tomar).
 * @param {Firestore} db Firestore.
 * @param {string} id Zona que quiere las celdas.
 * @param {string[]} celdas Celdas a comprobar.
 * @return {Promise<Array>} Conflictos: celda y zona dueña.
 */
async function conflictos(
  db: Firestore,
  id: string,
  celdas: string[]
): Promise<Array<{celda: string; zona: string}>> {
  const encontrados: Array<{celda: string; zona: string}> = [];
  for (let i = 0; i < celdas.length; i += LECTURAS_EN_PARALELO) {
    const grupo = celdas.slice(i, i + LECTURAS_EN_PARALELO);
    const docs = await Promise.all(grupo.map((c) => refCelda(db, c).get()));
    docs.forEach((doc, k) => {
      const d = doc.data();
      const dueña = (d?.zona_id ?? d?.excluida_de) as string | undefined;
      if (doc.exists && dueña !== undefined && dueña !== id) {
        encontrados.push({celda: grupo[k], zona: dueña});
      }
    });
  }
  return encontrados;
}

export interface EntradaGuardarZona {
  id?: unknown
  nombre?: unknown
  ciudad?: unknown
  estado?: unknown
  celdas?: unknown
  excluidas?: unknown
}

/**
 * Crea o actualiza una zona y deja el índice al día.
 * @param {Firestore} db Firestore.
 * @param {EntradaGuardarZona} entrada Lo que mandó el admin.
 * @param {object} opciones Motivo, autor y momento.
 * @return {Promise<object>} Id de la zona y cuántas celdas se agregaron y quitaron.
 */
export async function guardarZona(
  db: Firestore,
  entrada: EntradaGuardarZona,
  opciones: {motivo: unknown; autor: string; ahora: Timestamp}
): Promise<{id: string; agregadas: number; quitadas: number}> {
  const {autor, ahora} = opciones;
  const motivo = exigirMotivo(opciones.motivo);
  const {errores, zona} = validarZona(entrada);
  if (!zona) throw new ErrorNegocio('invalid-argument', errores.join('; '));

  // Zona existente (se edita) o nueva (id legible y único)
  let id: string;
  let previo: Dato | undefined;
  if (typeof entrada.id === 'string' && entrada.id.trim() !== '') {
    id = entrada.id.trim();
    previo = (await db.doc(`${COLECCION_ZONAS}/${id}`).get()).data();
    if (!previo) throw new ErrorNegocio('not-found', 'La zona no existe');
  } else {
    const base = idDeZona(zona.ciudad, zona.nombre) || 'zona';
    id = base;
    for (let n = 2; (await db.doc(`${COLECCION_ZONAS}/${id}`).get()).exists; n++) {
      id = `${base}-${n}`;
    }
  }

  const antes = entradasDeZona(id, textos(previo?.celdas), textos(previo?.excluidas));
  const despues = entradasDeZona(id, zona.celdas, zona.excluidas);

  // Solo hay que revisar las celdas que la zona no tenía ya
  const nuevas = [...despues.keys()].filter((c) => !antes.has(c));
  const choques = await conflictos(db, id, nuevas);
  if (choques.length > 0) {
    const ejemplo = choques[0];
    throw new ErrorNegocio('failed-precondition',
      `${choques.length} celda(s) ya pertenecen a otra zona ` +
      `(por ejemplo ${ejemplo.celda}, de "${ejemplo.zona}")`);
  }

  const quitar = [...antes.keys()].filter((c) => !despues.has(c));
  const poner = [...despues.entries()].filter(([c, e]) => {
    const anterior = antes.get(c);
    return !anterior || anterior.zona_id !== e.zona_id;
  });

  await escribirEnLotes(db, [
    ...quitar.map((c) => (lote: WriteBatch) => lote.delete(refCelda(db, c))),
    ...poner.map(([c, e]) => (lote: WriteBatch) => lote.set(refCelda(db, c), e)),
  ]);

  const cambios: Record<string, {antes: unknown; despues: unknown}> = {};
  for (const campo of ['nombre', 'ciudad', 'estado'] as const) {
    if (previo?.[campo] !== zona[campo]) {
      cambios[campo] = {antes: previo?.[campo] ?? null, despues: zona[campo]};
    }
  }

  const zonaRef = db.doc(`${COLECCION_ZONAS}/${id}`);
  await zonaRef.set({
    ...zona,
    ...(previo ? {} : {creado_en: ahora, creado_por: autor}),
    actualizado_en: ahora,
    actualizado_por: autor,
  }, {merge: true});
  await zonaRef.collection('historial').doc().set({
    cambios,
    celdas: {agregadas: nuevas.length, quitadas: quitar.length},
    motivo,
    autor,
    en: ahora,
  });

  return {id, agregadas: nuevas.length, quitadas: quitar.length};
}

/**
 * Zona de una celda (sube por la jerarquía; gana la más específica).
 * @param {Firestore} db Firestore.
 * @param {string} celda Celda válida.
 * @return {Promise<string | null>} Id de la zona, o null si no está en ninguna.
 */
export async function zonaDeCelda(
  db: Firestore,
  celda: string
): Promise<string | null> {
  for (const candidata of candidatasDe(celda)) {
    const doc = await refCelda(db, candidata).get();
    if (doc.exists) return (doc.data() as EntradaCeldaZona).zona_id;
  }
  return null;
}

/**
 * Zona de un punto del mapa.
 * @param {Firestore} db Firestore.
 * @param {number} latitude Latitud.
 * @param {number} longitude Longitud.
 * @return {Promise<string | null>} Id de la zona, o null.
 */
export function zonaDePunto(
  db: Firestore,
  latitude: number,
  longitude: number
): Promise<string | null> {
  return zonaDeCelda(db, celdaDe(latitude, longitude, 'cobertura'));
}

/**
 * Un paseo recién creado guarda la zona de su punto de recogida. Si el punto no
 * está en ninguna zona no se escribe nada.
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo.
 * @param {Dato | undefined} paseo Documento del paseo.
 * @return {Promise<string | null>} Zona asignada, o null.
 */
export async function asignarZonaAPaseo(
  db: Firestore,
  paseoId: string,
  paseo: Dato | undefined
): Promise<string | null> {
  if (!paseo || !esPaseo(paseo) || typeof paseo.zona_id === 'string') {
    return null;
  }
  const c = (paseo.ubicacion_inicio as
    {coordenadas?: {latitude?: unknown; longitude?: unknown}} | undefined)
    ?.coordenadas;
  const lat = c?.latitude;
  const lng = c?.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!esCeldaValida(celdaDe(lat, lng, 'micro'))) return null;

  const zona = await zonaDePunto(db, lat, lng);
  if (zona === null) return null;
  await db.doc(`operaciones/${paseoId}`).update({zona_id: zona});
  return zona;
}
