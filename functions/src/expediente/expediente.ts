/* eslint-disable camelcase */
/**
 * Expediente de la mascota (lado servidor): convierte lo que pasa en los
 * paseos en conocimiento sobre cada mascota.
 *
 *   expedientes/{mascota}                 → lo que ven los tutores y los
 *                                           cuidadores autorizados: resumen,
 *                                           alertas, vínculos, llegadas
 *   expedientes/{mascota}/interno/estado  → solo servidor: aprendizajes
 *                                           acumulados y confirmaciones
 *
 * Solo el servidor escribe; los clientes leen según las reglas. El catálogo
 * y las reglas de derivación viven en compartido/expediente.ts.
 */
import type {Firestore, Timestamp, Transaction} from 'firebase-admin/firestore';
import {leerConfiguracion} from '../comun/configuracion';
import {ErrorNegocio} from '../comun/errores';
import {
  acumularMomento,
  alertasDeLlegada,
  alertasDeMomento,
  construirResumen,
  edadEnAnios,
  LLEGADAS,
  momentoPorClave,
  quienEs,
  saludDeclarada,
  validarMomento,
  type Alerta,
  type Confirmacion,
  type EstadoDeAprendizajes,
  type MomentoRegistrado,
  type OpcionesResumen,
  type ResumenDeMascota,
} from '../compartido/expediente';
import {esPaseo} from '../compartido/servicios';

export const COLECCION_EXPEDIENTES = 'expedientes';
const MAX_ALERTAS = 20;
const MAX_LLEGADAS = 5;
const MAX_PASEOS_CONTADOS = 50;

type Dato = Record<string, unknown>;

// ---------- Forma de los documentos ----------

export interface Vinculo {
  paseos: number
  ultimo_en: number
}

export interface Llegada {
  llegada: string
  paseo_id: string
  fecha_ms: number
}

export interface Expediente {
  mascota_id: string
  tutores: string[]
  cuidadores_autorizados: string[]
  quien_es: string
  salud_declarada: string[]
  alertas: Alerta[]
  vinculos: Record<string, Vinculo>
  ultimas_llegadas: Llegada[]
  resumen: ResumenDeMascota
}

export interface EstadoInterno {
  senales: EstadoDeAprendizajes
  confirmaciones: Record<string, Confirmacion>
  /** Paseos ya contados en los vínculos (evita contar dos veces). */
  paseos_contados: string[]
}

export const refExpediente = (db: Firestore, mascotaId: string) =>
  db.collection(COLECCION_EXPEDIENTES).doc(mascotaId);

export const refInterno = (db: Firestore, mascotaId: string) =>
  db.doc(`${COLECCION_EXPEDIENTES}/${mascotaId}/interno/estado`);

const RESUMEN_VACIO: ResumenDeMascota = {
  que_funciona: [], que_evitar: [], ten_en_cuenta: [], por_confirmar: [],
  alertas: [],
};

// ---------- Ficha declarada por el tutor ----------

/**
 * Milisegundos de una fecha de Firestore (Timestamp, Date o número).
 * @param {unknown} valor Fecha.
 * @return {number | undefined} Ms, o undefined si no hay fecha.
 */
function aMs(valor: unknown): number | undefined {
  const v = valor as {toMillis?: () => number; toDate?: () => Date} | null;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (typeof v?.toDate === 'function') return v.toDate().getTime();
  if (typeof valor === 'number') return valor;
  return undefined;
}

const textos = (valor: unknown): string[] =>
  Array.isArray(valor) ? valor.filter((x): x is string => typeof x === 'string') : [];

/**
 * Lo que el expediente toma de la ficha de la mascota.
 * @param {Dato} mascota Documento de la mascota.
 * @param {number} ahoraMs Momento actual.
 * @return {object} Tutores, "quién es" y salud declarada.
 */
export function datosDeFicha(mascota: Dato, ahoraMs: number) {
  const tutores = [...new Set([
    ...(typeof mascota.creado_por === 'string' ? [mascota.creado_por] : []),
    ...textos(mascota.ids_tutores),
  ])];
  const ficha = {
    especie: typeof mascota.especie === 'string' ? mascota.especie : undefined,
    tamano: typeof mascota.tamano === 'string' ? mascota.tamano : undefined,
    nivel_energia: typeof mascota.nivel_energia === 'string' ?
      mascota.nivel_energia : undefined,
    edad_anios: edadEnAnios(aMs(mascota.fecha_nacimiento), ahoraMs),
    alergias: textos(mascota.alergias),
    medicamentos: textos(mascota.medicamentos),
    condiciones_salud: textos(mascota.condiciones_salud),
  };
  return {
    tutores,
    quien_es: quienEs(ficha),
    salud_declarada: saludDeclarada(ficha),
  };
}

// ---------- Estado base y resumen ----------

/**
 * Parámetros del resumen desde la configuración (`expediente`).
 * @param {Firestore} db Firestore.
 * @param {number} ahoraMs Momento actual.
 * @return {Promise<OpcionesResumen>} Opciones.
 */
export async function opcionesDeResumen(
  db: Firestore,
  ahoraMs: number
): Promise<OpcionesResumen> {
  const c = await leerConfiguracion(db, 'expediente');
  return {
    ahora_ms: ahoraMs,
    dias_vigencia: c.dias_vigencia_aprendizaje,
    veces_para_firme: c.repeticiones_para_firme,
    max_por_seccion: c.aprendizajes_en_resumen,
  };
}

/** Expediente nuevo a partir de la ficha de la mascota. */
function expedienteNuevo(
  mascotaId: string,
  mascota: Dato,
  ahoraMs: number
): Expediente {
  return {
    mascota_id: mascotaId,
    cuidadores_autorizados: [],
    alertas: [],
    vinculos: {},
    ultimas_llegadas: [],
    resumen: RESUMEN_VACIO,
    ...datosDeFicha(mascota, ahoraMs),
  };
}

const internoNuevo = (): EstadoInterno => ({
  senales: {}, confirmaciones: {}, paseos_contados: [],
});

/** Estado de una mascota leído (o creado en memoria) dentro de una transacción. */
export interface EstadoLeido {
  mascotaId: string
  expediente: Expediente
  interno: EstadoInterno
}

/**
 * Lee el expediente y su estado interno dentro de una transacción; si no
 * existen los arma en memoria desde la ficha de la mascota. Las lecturas van
 * antes de cualquier escritura (regla de las transacciones).
 * @param {Firestore} db Firestore.
 * @param {object} tx Transacción.
 * @param {string} mascotaId Mascota.
 * @param {number} ahoraMs Momento actual.
 * @return {Promise<EstadoLeido | null>} Estado, o null si la mascota no existe.
 */
export async function leerEstado(
  db: Firestore,
  tx: Transaction,
  mascotaId: string,
  ahoraMs: number
): Promise<EstadoLeido | null> {
  const [exp, int, mascota] = await Promise.all([
    tx.get(refExpediente(db, mascotaId)),
    tx.get(refInterno(db, mascotaId)),
    tx.get(db.collection('mascotas').doc(mascotaId)),
  ]);
  if (!exp.exists && !mascota.exists) return null;
  const base = expedienteNuevo(mascotaId, (mascota.data() ?? {}) as Dato, ahoraMs);
  return {
    mascotaId,
    expediente: exp.exists ? {...base, ...(exp.data() as Partial<Expediente>)} : base,
    interno: int.exists ?
      {...internoNuevo(), ...(int.data() as Partial<EstadoInterno>)} :
      internoNuevo(),
  };
}

/**
 * Recalcula el resumen con lo acumulado y la configuración vigente.
 * @param {EstadoLeido} estado Estado de la mascota.
 * @param {OpcionesResumen} opciones Parámetros del resumen.
 * @return {Expediente} Expediente con el resumen al día.
 */
export function conResumen(
  estado: EstadoLeido,
  opciones: OpcionesResumen
): Expediente {
  return {
    ...estado.expediente,
    resumen: construirResumen(
      estado.interno.senales,
      estado.interno.confirmaciones,
      estado.expediente.alertas,
      opciones
    ),
  };
}

/**
 * Escribe el expediente (visible) y su estado interno (solo servidor).
 * @param {Firestore} db Firestore.
 * @param {object} tx Transacción.
 * @param {EstadoLeido} estado Estado ya actualizado.
 * @param {Timestamp} ahora Momento.
 */
function guardarEstado(
  db: Firestore,
  tx: Transaction,
  estado: EstadoLeido,
  ahora: Timestamp
): void {
  tx.set(refExpediente(db, estado.mascotaId), {
    ...estado.expediente, actualizado_en: ahora,
  });
  tx.set(refInterno(db, estado.mascotaId), {
    ...estado.interno, actualizado_en: ahora,
  });
}

const ultimas = <T>(lista: T[], max: number): T[] => lista.slice(-max);

// ---------- Momentos de los paseos ----------

const ESTADOS_CON_MOMENTOS = [
  'EN_CAMINO', 'EN_PUNTO_RECOGIDA', 'EN_PROGRESO', 'FINALIZADO', 'COMPLETADO',
];

/**
 * Suma un momento registrado en el paseo al expediente de cada mascota
 * involucrada. Idempotente: marca el evento como procesado, así un
 * disparador repetido no cuenta dos veces.
 *
 * Solo cuentan los momentos del cuidador asignado, de mascotas del paseo y
 * con una clave del catálogo; lo demás se ignora (el payload viene de la app).
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo.
 * @param {string} eventoId Evento de bitácora o incidente.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<string[]>} Mascotas actualizadas (vacío si se ignoró).
 */
export async function procesarMomentoDeEvento(
  db: Firestore,
  paseoId: string,
  eventoId: string,
  ahora: Timestamp
): Promise<string[]> {
  const eventoRef = db.doc(`operaciones/${paseoId}/eventos/${eventoId}`);
  const [evento, paseo] = await Promise.all([
    eventoRef.get(),
    db.collection('operaciones').doc(paseoId).get(),
  ]);
  const e = evento.data();
  const p = paseo.data();
  const payload = (e?.payload ?? {}) as Dato;
  if (!e || !p || !esPaseo(p)) return [];
  if (e.evento !== 'bitacora' && e.evento !== 'incidente') return [];
  if (e.expediente_procesado_en) return [];
  if (typeof payload.clave !== 'string' || !momentoPorClave(payload.clave)) return [];
  if (e.actor !== p.id_cuidador) return [];
  if (!ESTADOS_CON_MOMENTOS.includes(String(p.estado))) return [];

  const delPaseo = textos(p.mascota_ids);
  const indicadas = textos(payload.mascota_ids);
  const mascotas = (indicadas.length > 0 ? indicadas : delPaseo)
    .filter((id) => delPaseo.includes(id));
  if (mascotas.length === 0) return [];

  const momento: MomentoRegistrado = {
    clave: payload.clave,
    causa: typeof payload.causa === 'string' ? payload.causa : undefined,
    calmo_con: typeof payload.calmo_con === 'string' ? payload.calmo_con : undefined,
    detalle_del_conflicto: typeof payload.detalle_del_conflicto === 'string' ?
      payload.detalle_del_conflicto : undefined,
    lugar: typeof payload.lugar === 'string' ? payload.lugar : undefined,
    cuidador_id: e.actor as string,
    paseo_id: paseoId,
    fecha_ms: typeof payload.timestamp === 'number' ? payload.timestamp :
      ahora.toMillis(),
  };
  if (validarMomento(momento).length > 0) return [];

  const opciones = await opcionesDeResumen(db, ahora.toMillis());
  return db.runTransaction(async (tx) => {
    const marca = (await tx.get(eventoRef)).data();
    if (!marca || marca.expediente_procesado_en) return [];
    const estados: EstadoLeido[] = [];
    for (const id of mascotas) {
      const leido = await leerEstado(db, tx, id, ahora.toMillis());
      if (leido) estados.push(leido);
    }
    for (const estado of estados) {
      estado.interno.senales = acumularMomento(estado.interno.senales, momento);
      estado.expediente.alertas = ultimas(
        [...estado.expediente.alertas, ...alertasDeMomento(momento)], MAX_ALERTAS);
      estado.expediente = conResumen(estado, opciones);
      guardarEstado(db, tx, estado, ahora);
    }
    tx.update(eventoRef, {expediente_procesado_en: ahora});
    return estados.map((s) => s.mascotaId);
  });
}

// ---------- Estado del paseo: autorizar cuidador y contar vínculos ----------

/**
 * Al confirmarse un paseo, el cuidador queda autorizado a leer el resumen de
 * las mascotas del paseo; al finalizarlo, se cuenta un paseo más en el
 * vínculo cuidador-mascota (continuidad). Idempotente.
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo.
 * @param {'CONFIRMADO' | 'FINALIZADO'} estado Estado al que entró.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<string[]>} Mascotas actualizadas.
 */
export async function actualizarPorEstadoDePaseo(
  db: Firestore,
  paseoId: string,
  estado: 'CONFIRMADO' | 'FINALIZADO',
  ahora: Timestamp
): Promise<string[]> {
  const paseo = (await db.collection('operaciones').doc(paseoId).get()).data();
  if (!paseo || !esPaseo(paseo)) return [];
  const cuidador = paseo.id_cuidador;
  if (typeof cuidador !== 'string' || cuidador === '') return [];
  const mascotas = textos(paseo.mascota_ids);
  if (mascotas.length === 0) return [];

  const opciones = await opcionesDeResumen(db, ahora.toMillis());
  return db.runTransaction(async (tx) => {
    const estados: EstadoLeido[] = [];
    for (const id of mascotas) {
      const leido = await leerEstado(db, tx, id, ahora.toMillis());
      if (leido) estados.push(leido);
    }
    for (const s of estados) {
      if (estado === 'CONFIRMADO') {
        if (!s.expediente.cuidadores_autorizados.includes(cuidador)) {
          s.expediente.cuidadores_autorizados = [
            ...s.expediente.cuidadores_autorizados, cuidador,
          ];
        }
      } else if (!s.interno.paseos_contados.includes(paseoId)) {
        const previo = s.expediente.vinculos[cuidador]?.paseos ?? 0;
        s.expediente.vinculos = {
          ...s.expediente.vinculos,
          [cuidador]: {paseos: previo + 1, ultimo_en: ahora.toMillis()},
        };
        s.interno.paseos_contados = ultimas(
          [...s.interno.paseos_contados, paseoId], MAX_PASEOS_CONTADOS);
      }
      s.expediente = conResumen(s, opciones);
      guardarEstado(db, tx, s, ahora);
    }
    return estados.map((s) => s.mascotaId);
  });
}

// ---------- "¿Cómo llegó?" del tutor ----------

/**
 * El tutor responde cómo llegó su mascota. Queda en el expediente (últimas
 * llegadas y, si llegó con molestia, una alerta) y en el historial del
 * paseo. Puede cambiar su respuesta: se conserva la última por paseo.
 * @param {Firestore} db Firestore.
 * @param {string} uid Tutor autenticado (creador del paseo).
 * @param {object} datos Paseo, respuesta y mascotas (todas si se omiten).
 * @param {Timestamp} ahora Momento.
 * @return {Promise<string[]>} Mascotas actualizadas.
 */
export async function registrarLlegada(
  db: Firestore,
  uid: string,
  datos: {paseoId: string; llegada: string; mascotaIds?: string[]},
  ahora: Timestamp
): Promise<string[]> {
  if (!(LLEGADAS as readonly string[]).includes(datos.llegada)) {
    throw new ErrorNegocio('invalid-argument', 'La respuesta no es válida');
  }
  const paseoRef = db.collection('operaciones').doc(datos.paseoId);
  const paseo = (await paseoRef.get()).data();
  if (!paseo || !esPaseo(paseo) || paseo.creado_por !== uid) {
    throw new ErrorNegocio('not-found', 'No encontramos ese paseo');
  }
  if (paseo.estado !== 'FINALIZADO' && paseo.estado !== 'COMPLETADO') {
    throw new ErrorNegocio('failed-precondition',
      'El paseo aún no termina');
  }
  const delPaseo = textos(paseo.mascota_ids);
  const indicadas = textos(datos.mascotaIds);
  if (indicadas.some((id) => !delPaseo.includes(id))) {
    throw new ErrorNegocio('invalid-argument',
      'Alguna mascota no pertenece al paseo');
  }
  const mascotas = indicadas.length > 0 ? indicadas : delPaseo;
  if (mascotas.length === 0) return [];

  const opciones = await opcionesDeResumen(db, ahora.toMillis());
  const eventoRef = db.doc(`operaciones/${datos.paseoId}/eventos/llegada`);
  return db.runTransaction(async (tx) => {
    const estados: EstadoLeido[] = [];
    for (const id of mascotas) {
      const leido = await leerEstado(db, tx, id, ahora.toMillis());
      if (leido) estados.push(leido);
    }
    for (const s of estados) {
      const sinEstePaseo = s.expediente.ultimas_llegadas
        .filter((l) => l.paseo_id !== datos.paseoId);
      s.expediente.ultimas_llegadas = ultimas([
        ...sinEstePaseo,
        {llegada: datos.llegada, paseo_id: datos.paseoId, fecha_ms: ahora.toMillis()},
      ], MAX_LLEGADAS);
      s.expediente.alertas = ultimas([
        ...s.expediente.alertas.filter((a) => a.paseo_id !== datos.paseoId ||
          a.clave !== 'llego_con_molestia_en_el_ultimo_paseo'),
        ...alertasDeLlegada(datos.llegada, ahora.toMillis(), datos.paseoId),
      ], MAX_ALERTAS);
      s.expediente = conResumen(s, opciones);
      guardarEstado(db, tx, s, ahora);
    }
    tx.set(eventoRef, {
      evento: 'llegada',
      payload: {
        llegada: datos.llegada,
        mascota_ids: mascotas,
        timestamp: ahora.toMillis(),
      },
      actor: uid,
      creado_por: uid,
      actualizado_por: uid,
      creado_en: ahora,
      actualizado_en: ahora,
    });
    return estados.map((s) => s.mascotaId);
  });
}

// ---------- Confirmación del tutor ----------

/**
 * El tutor confirma o rechaza un aprendizaje. Lo rechazado deja de aparecer
 * en el resumen; no se notifica a nadie.
 * @param {Firestore} db Firestore.
 * @param {string} uid Tutor autenticado.
 * @param {object} datos Mascota, aprendizaje y decisión.
 * @param {Timestamp} ahora Momento.
 */
export async function confirmarAprendizaje(
  db: Firestore,
  uid: string,
  datos: {mascotaId: string; clave: string; decision: string},
  ahora: Timestamp
): Promise<void> {
  if (datos.decision !== 'confirmado' && datos.decision !== 'rechazado') {
    throw new ErrorNegocio('invalid-argument', 'La decisión no es válida');
  }
  const opciones = await opcionesDeResumen(db, ahora.toMillis());
  await db.runTransaction(async (tx) => {
    const s = await leerEstado(db, tx, datos.mascotaId, ahora.toMillis());
    if (!s || !s.expediente.tutores.includes(uid)) {
      throw new ErrorNegocio('not-found', 'No encontramos esa mascota');
    }
    if (!s.interno.senales[datos.clave]) {
      throw new ErrorNegocio('not-found', 'Ese aprendizaje no existe');
    }
    s.interno.confirmaciones = {
      ...s.interno.confirmaciones,
      [datos.clave]: datos.decision as Confirmacion,
    };
    s.expediente = conResumen(s, opciones);
    guardarEstado(db, tx, s, ahora);
  });
}

// ---------- Ficha de la mascota ----------

/**
 * Mantiene al día "quién es", la salud declarada y los tutores cuando el
 * tutor edita la ficha. No crea expedientes: nacen con el primer paseo.
 * @param {Firestore} db Firestore.
 * @param {string} mascotaId Mascota.
 * @param {Dato} mascota Ficha actual.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<boolean>} true si había expediente y se actualizó.
 */
export async function sincronizarFicha(
  db: Firestore,
  mascotaId: string,
  mascota: Dato,
  ahora: Timestamp
): Promise<boolean> {
  const ref = refExpediente(db, mascotaId);
  if (!(await ref.get()).exists) return false;
  await ref.update({
    ...datosDeFicha(mascota, ahora.toMillis()),
    actualizado_en: ahora,
  });
  return true;
}

/**
 * Borra el expediente de una mascota eliminada (derecho de supresión).
 * @param {Firestore} db Firestore.
 * @param {string} mascotaId Mascota eliminada.
 */
export async function borrarExpediente(
  db: Firestore,
  mascotaId: string
): Promise<void> {
  const lote = db.batch();
  lote.delete(refExpediente(db, mascotaId));
  lote.delete(refInterno(db, mascotaId));
  await lote.commit();
}
