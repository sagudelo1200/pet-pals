/* eslint-disable camelcase */
/**
 * Habilitaciones (lado servidor): el proceso por el que una persona queda
 * autorizada para ofrecer un servicio. Las reglas puras (estados, evaluación,
 * puerta única) están en compartido/habilitacion.ts y lo que se exige en
 * compartido/servicios.ts; aquí vive lo que lee y escribe.
 *
 *   habilitaciones/{uid}_{servicio}            estado, avance por requisito
 *   habilitaciones/{id}/historial/{x}          qué cambió, quién y por qué
 *   verificaciones/{x}                         lo aprobado (sirve a cualquier servicio)
 *   perfiles_publicos/{uid}                    copia: servicios_habilitados y
 *                                              servicios_vencen
 *
 * Reglas del juego:
 * - Solo el servidor escribe; cada cambio es una transacción con su historial.
 * - Aprobar un requisito crea la verificación en la misma transacción.
 * - La habilitación se aprueba sola cuando todo lo obligatorio se cumple.
 * - Quién decide un requisito lo dice su proveedor (proveedores.ts).
 * - Sin procesos periódicos: lo vencido deja de valer porque se compara con la
 *   hora (ofreceServicio), no porque algo lo marque.
 */
import {
  Timestamp,
  type DocumentReference,
  type Firestore,
} from 'firebase-admin/firestore';
import {ErrorNegocio} from '../comun/errores';
import {leerConfiguracion} from '../comun/configuracion';
import {notificar} from '../comun/notificar';
import {exigirMotivo} from '../comun/versionado';
import {
  COLECCION_HABILITACIONES,
  DESTINO_DECISION,
  ESTADOS_HABILITACION,
  ESTADOS_REQUISITO,
  aplicarVerificaciones,
  camposFaltantes,
  estadoDelRequisito,
  evaluarServicio,
  idDeHabilitacion,
  puedeAprobarse,
  resumenParaPerfil,
  transicionExigeMotivo,
  transicionHabilitacionValida,
  transicionRequisitoValida,
  venceEnDe,
  type DecisionHabilitacion,
  type EstadoHabilitacion,
  type EstadoRequisito,
  type ProgresoHabilitacion,
  type VerificacionVigente,
} from '../compartido/habilitacion';
import {jsonEstable} from '../compartido/versionables';
import {
  CATALOGO_SERVICIOS,
  esTipoServicio,
  requisitoDe,
  requisitosDe,
  rutaEvidencia,
  type DefinicionRequisito,
  type ProveedorExterno,
  type TipoServicio,
} from '../compartido/servicios';
import type {TipoNotificacion} from '../compartido/notificaciones';
import {proveedorDe} from './proveedores';

type Dato = Record<string, unknown>;

export interface Habilitacion {
  id: string
  uid: string
  servicio: TipoServicio
  estado: EstadoHabilitacion
  progreso: ProgresoHabilitacion
  /** Último motivo (devolución, rechazo o suspensión); null si no hay. */
  motivo: string | null
}

const refDe = (db: Firestore, id: string) =>
  db.doc(`${COLECCION_HABILITACIONES}/${id}`);

const aMs = (v: unknown): number | null => {
  const t = v as {toMillis?: () => number} | null | undefined;
  if (typeof t?.toMillis === 'function') return t.toMillis();
  return typeof v === 'number' ? v : null;
};

/**
 * Lee una habilitación desde su documento.
 * @param {string} id Id del documento.
 * @param {Dato | undefined} data Datos.
 * @return {Habilitacion} Habilitación.
 */
function leerHabilitacion(id: string, data: Dato | undefined): Habilitacion {
  if (!data || !esTipoServicio(data.servicio) ||
    typeof data.usuario_id !== 'string' ||
    !ESTADOS_HABILITACION.includes(data.estado as EstadoHabilitacion)) {
    throw new ErrorNegocio('not-found', 'La habilitación no existe');
  }
  const progreso: ProgresoHabilitacion = {};
  const crudo = (data.requisitos ?? {}) as Record<string, Dato>;
  for (const [reqId, r] of Object.entries(crudo)) {
    if (!ESTADOS_REQUISITO.includes(r?.estado as EstadoRequisito)) continue;
    progreso[reqId] = {
      estado: r.estado as EstadoRequisito,
      venceEnMs: aMs(r.vence_en),
      ...(typeof r.verificacion_id === 'string' ?
        {verificacionId: r.verificacion_id} : {}),
      ...(typeof r.motivo === 'string' ? {motivo: r.motivo} : {}),
    };
  }
  return {
    id,
    uid: data.usuario_id,
    servicio: data.servicio,
    estado: data.estado as EstadoHabilitacion,
    progreso,
    motivo: typeof data.motivo === 'string' ? data.motivo : null,
  };
}

/**
 * Avance en la forma en que se guarda (sin valores indefinidos).
 * @param {ProgresoHabilitacion} progreso Avance.
 * @return {Dato} Mapa `requisito → datos`.
 */
function escribirProgreso(progreso: ProgresoHabilitacion): Dato {
  const salida: Dato = {};
  for (const [id, r] of Object.entries(progreso)) {
    if (!r) continue;
    salida[id] = {
      estado: r.estado,
      vence_en: r.venceEnMs == null ? null : Timestamp.fromMillis(r.venceEnMs),
      ...(r.verificacionId ? {verificacion_id: r.verificacionId} : {}),
      ...(r.motivo ? {motivo: r.motivo} : {}),
    };
  }
  return salida;
}

/**
 * Carga una habilitación por id.
 * @param {Firestore} db Firestore.
 * @param {string} id Id (`{uid}_{servicio}`).
 * @return {Promise<Habilitacion>} Habilitación.
 */
async function cargar(db: Firestore, id: string): Promise<Habilitacion> {
  return leerHabilitacion(id, (await refDe(db, id).get()).data());
}

export {cargar as cargarHabilitacion};

interface Cambio {
  estado?: EstadoHabilitacion
  progreso?: ProgresoHabilitacion
  motivo?: string | null
  /** Requisito cuyo cambio se anota también en el historial. */
  requisito?: string
  /** Documentos que se escriben en la MISMA transacción. */
  escrituras?: Array<{ref: DocumentReference, datos: Dato}>
}

interface ResultadoCambio {
  antes: Habilitacion
  despues: Habilitacion
  /** Id de la entrada del historial (sirve para no avisar dos veces). */
  historialId: string | null
}

/**
 * ÚNICA forma de modificar una habilitación: una transacción que lee el estado
 * actual, deja que `decidir` (pura) proponga el cambio, valida la transición,
 * lo escribe y lo anota en el historial.
 * @param {Firestore} db Firestore.
 * @param {string} id Habilitación.
 * @param {string} autor Quién cambia (uid o 'sistema').
 * @param {number} ahoraMs Momento del cambio.
 * @param {Function} decidir Propone el cambio a partir del estado leído.
 * @return {Promise<ResultadoCambio>} Antes, después e id del historial.
 */
async function actualizar(
  db: Firestore,
  id: string,
  autor: string,
  ahoraMs: number,
  decidir: (h: Habilitacion) => Cambio | null
): Promise<ResultadoCambio> {
  const ref = refDe(db, id);
  const ts = Timestamp.fromMillis(ahoraMs);
  return db.runTransaction(async (tx) => {
    const antes = leerHabilitacion(id, (await tx.get(ref)).data());
    const cambio = decidir(antes);
    if (!cambio) return {antes, despues: antes, historialId: null};

    const estado = cambio.estado ?? antes.estado;
    const cambiaEstado = estado !== antes.estado;
    if (cambiaEstado) {
      if (!transicionHabilitacionValida(antes.estado, estado)) {
        throw new ErrorNegocio('failed-precondition',
          `No se puede pasar de ${antes.estado} a ${estado}`);
      }
      if (transicionExigeMotivo(antes.estado, estado)) {
        exigirMotivo(cambio.motivo);
      }
    }
    const progreso = cambio.progreso ?? antes.progreso;
    const motivo = cambio.motivo === undefined ? antes.motivo : cambio.motivo;

    tx.update(ref, {
      estado,
      requisitos: escribirProgreso(progreso),
      motivo,
      actualizado_en: ts,
      actualizado_por: autor,
    });

    let historialId: string | null = null;
    if (cambio.requisito) {
      const antesReq = antes.progreso[cambio.requisito]?.estado ?? 'PENDIENTE';
      const despuesReq = progreso[cambio.requisito]?.estado ?? antesReq;
      const entrada = ref.collection('historial').doc();
      tx.set(entrada, {
        requisito: cambio.requisito, de: antesReq, a: despuesReq,
        motivo: cambio.motivo ?? null, autor, en: ts,
      });
      historialId = entrada.id;
    }
    if (cambiaEstado) {
      const entrada = ref.collection('historial').doc();
      tx.set(entrada, {
        de: antes.estado, a: estado,
        motivo: cambio.motivo ?? null, autor, en: ts,
      });
      historialId = entrada.id;
    }
    for (const {ref: destino, datos} of cambio.escrituras ?? []) {
      tx.set(destino, datos);
    }
    return {
      antes,
      despues: {...antes, estado, progreso, motivo},
      historialId,
    };
  });
}

// ---------- Lecturas de apoyo ----------

/**
 * Verificaciones aprobadas de la persona (valen para cualquier servicio).
 * @param {Firestore} db Firestore.
 * @param {string} uid Persona.
 * @return {Promise<VerificacionVigente[]>} Verificaciones.
 */
async function cargarVerificaciones(
  db: Firestore,
  uid: string
): Promise<VerificacionVigente[]> {
  const snap = await db.collection('verificaciones')
    .where('usuario_id', '==', uid)
    .where('estado', '==', 'VERIFICADO')
    .get();
  return snap.docs.map((d) => ({
    id: d.id,
    tipo: String(d.data().tipo),
    venceEnMs: aMs(d.data().vence_en),
  }));
}

const leerPerfil = async (db: Firestore, uid: string) =>
  (await db.doc(`perfiles_publicos/${uid}`).get()).data();

// ---------- Efectos sobre el perfil, el rol y los avisos ----------

/**
 * Copia al perfil público qué servicios puede ofrecer la persona y cuándo
 * vence cada uno, para que otros lo lean sin consultar las habilitaciones.
 * @param {Firestore} db Firestore.
 * @param {string} uid Persona.
 * @param {number} ahoraMs Momento del cambio.
 * @return {Promise<void>}
 */
export async function actualizarPerfil(
  db: Firestore,
  uid: string,
  ahoraMs: number
): Promise<void> {
  const snap = await db.collection(COLECCION_HABILITACIONES)
    .where('usuario_id', '==', uid).get();
  const habilitaciones = snap.docs.flatMap((d) => {
    try {
      const h = leerHabilitacion(d.id, d.data());
      return [{servicio: h.servicio, estado: h.estado, progreso: h.progreso}];
    } catch {
      return [];
    }
  });
  const ref = db.doc(`perfiles_publicos/${uid}`);
  const campos = {
    ...resumenParaPerfil(habilitaciones),
    actualizado_en: Timestamp.fromMillis(ahoraMs),
    actualizado_por: 'sistema',
  };
  if ((await ref.get()).exists) await ref.update(campos);
  else await ref.set(campos);
}

/**
 * Otorga el rol del servicio al quedar habilitado (un admin no combina roles
 * operativos, ver GestorUsuarios.agregarRol).
 * @param {Firestore} db Firestore.
 * @param {string} uid Persona.
 * @param {TipoServicio} servicio Servicio.
 * @param {number} ahoraMs Momento del cambio.
 * @return {Promise<void>}
 */
async function concederRol(
  db: Firestore,
  uid: string,
  servicio: TipoServicio,
  ahoraMs: number
): Promise<void> {
  const rol = CATALOGO_SERVICIOS[servicio].rol;
  const ref = db.doc(`usuarios/${uid}`);
  const roles = (await ref.get()).data()?.roles;
  if (!Array.isArray(roles) || roles.includes(rol) || roles.includes('admin')) {
    return;
  }
  await ref.update({
    roles: [...roles, rol],
    actualizado_en: Timestamp.fromMillis(ahoraMs),
    actualizado_por: 'sistema',
  });
}

/**
 * Efectos de un cambio de estado: el perfil siempre; el rol al aprobar.
 * @param {Firestore} db Firestore.
 * @param {Habilitacion} h Habilitación ya cambiada.
 * @param {number} ahoraMs Momento del cambio.
 * @return {Promise<void>}
 */
async function aplicarEfectos(
  db: Firestore,
  h: Habilitacion,
  ahoraMs: number
): Promise<void> {
  await actualizarPerfil(db, h.uid, ahoraMs);
  if (h.estado === 'APROBADA') await concederRol(db, h.uid, h.servicio, ahoraMs);
}

/**
 * Avisa a la persona. Un fallo al avisar no deshace el cambio de estado.
 * @param {Firestore} db Firestore.
 * @param {TipoNotificacion} tipo Aviso del catálogo.
 * @param {Habilitacion} h Habilitación.
 * @param {string | null} historialId Entrada del historial (evita duplicar).
 * @param {number} ahoraMs Momento del cambio.
 * @param {string | null} motivo Motivo, si lo hay.
 * @return {Promise<void>}
 */
async function avisar(
  db: Firestore,
  tipo: TipoNotificacion,
  h: Habilitacion,
  historialId: string | null,
  ahoraMs: number,
  motivo: string | null = null
): Promise<void> {
  try {
    await notificar(db, {
      tipo,
      uid: h.uid,
      datos: {
        servicio: CATALOGO_SERVICIOS[h.servicio].titulo,
        ...(motivo ? {motivo} : {}),
      },
      ...(historialId ? {dedup_key: `hab_${historialId}`} : {}),
      ahora: Timestamp.fromMillis(ahoraMs),
    });
  } catch (error) {
    console.error(`[habilitaciones] no se pudo avisar (${tipo}):`, error);
  }
}

// ---------- Operaciones ----------

/**
 * Crea la habilitación si no existe y la deja al día con lo que la persona ya
 * tiene verificado. Idempotente.
 * @param {Firestore} db Firestore.
 * @param {string} uid Persona.
 * @param {TipoServicio} servicio Servicio.
 * @param {number} ahoraMs Momento actual.
 * @return {Promise<string>} Id de la habilitación.
 */
export async function iniciarHabilitacion(
  db: Firestore,
  uid: string,
  servicio: TipoServicio,
  ahoraMs: number
): Promise<string> {
  const id = idDeHabilitacion(uid, servicio);
  const ref = refDe(db, id);
  if (!(await ref.get()).exists) {
    const ts = Timestamp.fromMillis(ahoraMs);
    const nombre = (await leerPerfil(db, uid))?.nombre;
    try {
      await ref.create({
        usuario_id: uid,
        // Para que la cola de revisión muestre quién es sin otra lectura
        usuario_nombre: typeof nombre === 'string' ? nombre : null,
        servicio,
        estado: 'BORRADOR',
        requisitos: {},
        motivo: null,
        creado_en: ts,
        creado_por: uid,
        actualizado_en: ts,
        actualizado_por: uid,
      });
    } catch (error) {
      const codigo = (error as {code?: number | string}).code;
      if (codigo !== 6 && codigo !== 'already-exists') throw error;
    }
  }
  const verificaciones = await cargarVerificaciones(db, uid);
  await actualizar(db, id, uid, ahoraMs, (h) => {
    const progreso = aplicarVerificaciones(servicio, h.progreso, verificaciones, ahoraMs);
    return jsonEstable(progreso) === jsonEstable(h.progreso) ? null : {progreso};
  });
  return id;
}

export interface DependenciasEnvio {
  /** ¿Existe el archivo en Storage? */
  existeArchivo(ruta: string): Promise<boolean>
}

/**
 * La persona envía su habilitación a revisión: se comprueba que el perfil esté
 * completo y que la evidencia esté subida, y los requisitos pendientes pasan a
 * revisión. Si ya no queda nada por revisar, se aprueba sola.
 * @param {Firestore} db Firestore.
 * @param {string} uid Persona.
 * @param {TipoServicio} servicio Servicio.
 * @param {number} ahoraMs Momento actual.
 * @param {DependenciasEnvio} deps Acceso a Storage.
 * @return {Promise<Habilitacion>} La habilitación resultante.
 */
export async function enviarHabilitacion(
  db: Firestore,
  uid: string,
  servicio: TipoServicio,
  ahoraMs: number,
  deps: DependenciasEnvio
): Promise<Habilitacion> {
  const id = await iniciarHabilitacion(db, uid, servicio, ahoraMs);
  const [verificaciones, perfil] = await Promise.all([
    cargarVerificaciones(db, uid),
    leerPerfil(db, uid),
  ]);

  let h = await cargar(db, id);
  if (h.estado === 'APROBADA') {
    const progreso = aplicarVerificaciones(servicio, h.progreso, verificaciones, ahoraMs);
    if (evaluarServicio(servicio, progreso, perfil, ahoraMs).cumple) {
      throw new ErrorNegocio('failed-precondition',
        'Ya estás habilitado para este servicio');
    }
    // Algo venció: se vuelve a borrador para renovarlo
    const renovada = await actualizar(db, id, 'sistema', ahoraMs,
      () => ({estado: 'BORRADOR'}));
    await aplicarEfectos(db, renovada.despues, ahoraMs);
    h = renovada.despues;
  }
  if (h.estado !== 'BORRADOR') {
    throw new ErrorNegocio('failed-precondition',
      `La habilitación está ${h.estado}; no se puede enviar`);
  }

  // Plan: qué falta y qué pasa a revisión
  const progresoBase = aplicarVerificaciones(
    servicio, h.progreso, verificaciones, ahoraMs);
  const faltan: string[] = [];
  const aEnviar: Array<{def: DefinicionRequisito, rutas: string[]}> = [];
  for (const def of requisitosDe(servicio)) {
    const efectivo = estadoDelRequisito(def, progresoBase[def.id], perfil, ahoraMs);
    if (efectivo === 'VERIFICADO' || efectivo === 'EN_REVISION') continue;

    if (def.verificacion === null) {
      const campos = camposFaltantes(perfil, def.perfil ?? []);
      faltan.push(`${def.titulo} (${campos.join(', ')})`);
      continue;
    }
    if (def.validador === 'sistema') {
      faltan.push(def.titulo);
      continue;
    }
    const rutas = def.evidencia.map((a) => rutaEvidencia(uid, servicio, def.id, a));
    const hay = await Promise.all(rutas.map((r) => deps.existeArchivo(r)));
    const subidas = hay.filter(Boolean).length;
    if (!def.obligatorio && subidas === 0) continue;
    if (subidas < rutas.length) {
      const sin = def.evidencia.filter((_, i) => !hay[i]);
      faltan.push(`${def.titulo} (falta subir: ${sin.join(', ')})`);
      continue;
    }
    if (!transicionRequisitoValida(efectivo, 'EN_REVISION')) continue;
    aEnviar.push({def, rutas});
  }
  if (faltan.length > 0) {
    throw new ErrorNegocio('failed-precondition',
      `Falta completar: ${faltan.join('; ')}`);
  }

  // Antes de escribir nada: el proveedor puede fallar o no estar configurado
  for (const {def, rutas} of aEnviar) {
    await proveedorDe(def.validador).iniciar({
      usuarioId: uid, servicio, requisito: def.id, rutas,
    });
  }

  await actualizar(db, id, uid, ahoraMs, (x) => {
    if (x.estado !== 'BORRADOR') {
      throw new ErrorNegocio('failed-precondition', 'La habilitación ya fue enviada');
    }
    const progreso = aplicarVerificaciones(servicio, x.progreso, verificaciones, ahoraMs);
    for (const {def} of aEnviar) progreso[def.id] = {estado: 'EN_REVISION'};
    return {estado: 'EN_REVISION', progreso, motivo: null};
  });
  return resolverRevision(db, id, ahoraMs);
}

/**
 * Cuando ya no queda nada por revisar: se aprueba si todo se cumple, o se
 * devuelve a la persona diciendo qué falta.
 * @param {Firestore} db Firestore.
 * @param {string} id Habilitación.
 * @param {number} ahoraMs Momento actual.
 * @return {Promise<Habilitacion>} La habilitación resultante.
 */
export async function resolverRevision(
  db: Firestore,
  id: string,
  ahoraMs: number
): Promise<Habilitacion> {
  const h = await cargar(db, id);
  if (h.estado !== 'EN_REVISION') return h;

  const perfil = await leerPerfil(db, h.uid);
  const definiciones = requisitosDe(h.servicio);
  const sigueRevisandose = definiciones.some((def) =>
    estadoDelRequisito(def, h.progreso[def.id], perfil, ahoraMs) === 'EN_REVISION');
  if (sigueRevisandose) return h;

  const resultado = evaluarServicio(h.servicio, h.progreso, perfil, ahoraMs);
  if (puedeAprobarse(h.estado, resultado)) {
    const cambio = await actualizar(db, id, 'sistema', ahoraMs, (x) =>
      x.estado === 'EN_REVISION' ? {estado: 'APROBADA', motivo: null} : null);
    if (cambio.historialId) {
      await aplicarEfectos(db, cambio.despues, ahoraMs);
      await avisar(db, 'HABILITACION_APROBADA', cambio.despues,
        cambio.historialId, ahoraMs);
    }
    return cambio.despues;
  }

  const motivo = 'Falta completar: ' + resultado.pendientes
    .map((p) => requisitoDe(h.servicio, p)?.titulo ?? p).join(', ');
  const cambio = await actualizar(db, id, 'sistema', ahoraMs, (x) =>
    x.estado === 'EN_REVISION' ? {estado: 'BORRADOR', motivo} : null);
  if (cambio.historialId) {
    await avisar(db, 'HABILITACION_DEVUELTA', cambio.despues,
      cambio.historialId, ahoraMs, motivo);
  }
  return cambio.despues;
}

/**
 * El requisito debe existir y ser de los que se revisan (no los que valida el
 * sistema ni los del perfil).
 * @param {Habilitacion} h Habilitación.
 * @param {string} requisito Id del requisito.
 * @return {DefinicionRequisito} Requisito.
 */
function exigirRevisable(h: Habilitacion, requisito: string): DefinicionRequisito {
  const def = requisitoDe(h.servicio, requisito);
  if (!def || def.verificacion === null || def.validador === 'sistema') {
    throw new ErrorNegocio('invalid-argument', 'Ese requisito no se revisa');
  }
  return def;
}

export interface EntradaDecisionRequisito {
  id: string
  requisito: string
  decision: 'APROBAR' | 'RECHAZAR'
  motivo?: unknown
  autor: string
  ahoraMs: number
  metodo: 'MANUAL' | 'PROVEEDOR'
  proveedor?: ProveedorExterno
}

/**
 * Aplica la decisión sobre UN requisito en revisión. Es la función que usan
 * tanto el equipo (decidirRequisitoDelEquipo) como la respuesta de un proveedor
 * externo. Aprobar crea la verificación en la misma transacción.
 * @param {Firestore} db Firestore.
 * @param {EntradaDecisionRequisito} entrada Decisión.
 * @return {Promise<Habilitacion>} La habilitación resultante.
 */
export async function aplicarDecisionRequisito(
  db: Firestore,
  entrada: EntradaDecisionRequisito
): Promise<Habilitacion> {
  const {id, requisito, decision, autor, ahoraMs} = entrada;
  const h = await cargar(db, id);
  const def = exigirRevisable(h, requisito);
  const motivo = decision === 'RECHAZAR' ? exigirMotivo(entrada.motivo) : null;

  const aprobar = decision === 'APROBAR';
  const ajustes = aprobar ?
    await leerConfiguracion(db, 'servicios') as unknown as Dato : {};
  const previas = aprobar ? (await db.collection('verificaciones')
    .where('usuario_id', '==', h.uid)
    .where('tipo', '==', def.verificacion).get()).docs.length : 0;
  const verificacion = db.collection('verificaciones').doc();

  const cambio = await actualizar(db, id, autor, ahoraMs, (x) => {
    if ((x.progreso[requisito]?.estado ?? 'PENDIENTE') !== 'EN_REVISION') {
      throw new ErrorNegocio('failed-precondition',
        'Este requisito no está en revisión');
    }
    if (!aprobar) {
      return {
        progreso: {
          ...x.progreso,
          [requisito]: {estado: 'RECHAZADO', motivo: motivo ?? ''},
        },
        requisito,
        motivo,
        // Se devuelve a la persona para que lo corrija
        ...(x.estado === 'EN_REVISION' ? {estado: 'BORRADOR' as const} : {}),
      };
    }
    const venceEnMs = venceEnDe(def, ahoraMs, ajustes);
    return {
      progreso: {
        ...x.progreso,
        [requisito]: {estado: 'VERIFICADO', venceEnMs, verificacionId: verificacion.id},
      },
      requisito,
      escrituras: [{
        ref: verificacion,
        datos: documentoVerificacion(
          verificacion.id, x, def, entrada, previas + 1, venceEnMs),
      }],
    };
  });

  if (!aprobar) {
    await avisar(db, 'HABILITACION_DEVUELTA', cambio.despues,
      cambio.historialId, ahoraMs, `${def.titulo}: ${motivo}`);
    return cambio.despues;
  }
  return resolverRevision(db, id, ahoraMs);
}

/**
 * Decisión de una persona del equipo: solo si el proveedor del requisito lo
 * permite (hoy `manual`).
 * @param {Firestore} db Firestore.
 * @param {object} entrada Decisión del equipo.
 * @return {Promise<Habilitacion>} La habilitación resultante.
 */
export async function decidirRequisitoDelEquipo(
  db: Firestore,
  entrada: Omit<EntradaDecisionRequisito, 'metodo' | 'proveedor'>
): Promise<Habilitacion> {
  const h = await cargar(db, entrada.id);
  const def = exigirRevisable(h, entrada.requisito);
  if (!proveedorDe(def.validador).decideEquipo) {
    throw new ErrorNegocio('failed-precondition',
      'Este requisito lo valida un proveedor, no el equipo');
  }
  return aplicarDecisionRequisito(db, {...entrada, metodo: 'MANUAL'});
}

/**
 * Documento de la verificación que deja una aprobación.
 * @param {string} id Id de la verificación.
 * @param {Habilitacion} h Habilitación.
 * @param {DefinicionRequisito} def Requisito.
 * @param {EntradaDecisionRequisito} entrada Decisión.
 * @param {number} version Versión (1, 2, ... por usuario y tipo).
 * @param {number | null} venceEnMs Vencimiento.
 * @return {Dato} Documento.
 */
function documentoVerificacion(
  id: string,
  h: Habilitacion,
  def: DefinicionRequisito,
  entrada: EntradaDecisionRequisito,
  version: number,
  venceEnMs: number | null
): Dato {
  const ts = Timestamp.fromMillis(entrada.ahoraMs);
  return {
    id,
    usuario_id: h.uid,
    tipo: def.verificacion,
    estado: 'VERIFICADO',
    metodo: entrada.metodo,
    ...(entrada.proveedor ? {proveedor: entrada.proveedor} : {}),
    version,
    habilitacion_id: h.id,
    evidencias: Object.fromEntries(def.evidencia.map((a) => [a, true])),
    verificado_en: ts,
    ...(venceEnMs === null ? {} : {vence_en: Timestamp.fromMillis(venceEnMs)}),
    revisado_por: entrada.autor,
    razon_transicion: entrada.metodo === 'MANUAL' ?
      'aprobacion_manual' : 'inicio_verificacion',
    creado_en: ts,
    actualizado_en: ts,
    creado_por: entrada.autor,
    actualizado_por: entrada.autor,
  };
}

/**
 * El equipo rechaza, suspende, reactiva o reabre una habilitación.
 * @param {Firestore} db Firestore.
 * @param {object} entrada Decisión del equipo.
 * @return {Promise<Habilitacion>} La habilitación resultante.
 */
export async function decidirHabilitacion(
  db: Firestore,
  entrada: {
    id: string
    decision: DecisionHabilitacion
    motivo?: unknown
    autor: string
    ahoraMs: number
  }
): Promise<Habilitacion> {
  const {id, decision, autor, ahoraMs} = entrada;
  const nuevo: EstadoHabilitacion = DESTINO_DECISION[decision];
  const h = await cargar(db, id);

  const texto = typeof entrada.motivo === 'string' ? entrada.motivo.trim() : '';
  const motivo = transicionExigeMotivo(h.estado, nuevo) ?
    exigirMotivo(entrada.motivo) : (texto || null);

  if (decision === 'REACTIVAR') {
    const perfil = await leerPerfil(db, h.uid);
    const resultado = evaluarServicio(h.servicio, h.progreso, perfil, ahoraMs);
    if (!resultado.cumple) {
      const faltan = resultado.pendientes
        .map((p) => requisitoDe(h.servicio, p)?.titulo ?? p).join(', ');
      throw new ErrorNegocio('failed-precondition',
        `No cumple todos los requisitos: ${faltan}`);
    }
  }

  const cambio = await actualizar(db, id, autor, ahoraMs, () => ({
    estado: nuevo,
    motivo: nuevo === 'APROBADA' ? null : motivo,
  }));
  await aplicarEfectos(db, cambio.despues, ahoraMs);

  const aviso: Record<DecisionHabilitacion, TipoNotificacion> = {
    RECHAZAR: 'HABILITACION_RECHAZADA',
    SUSPENDER: 'HABILITACION_SUSPENDIDA',
    REACTIVAR: 'HABILITACION_APROBADA',
    REABRIR: 'HABILITACION_DEVUELTA',
  };
  await avisar(db, aviso[decision], cambio.despues, cambio.historialId, ahoraMs,
    decision === 'REABRIR' ?
      (motivo ?? 'Ya puedes volver a enviar tu habilitación.') : motivo);
  return cambio.despues;
}
