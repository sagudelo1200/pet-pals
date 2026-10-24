/* eslint-disable camelcase */
/**
 * Emparejamiento (lado servidor): junta los datos de la mascota, del cuidador
 * y de la agenda, y delega la decisión en el núcleo puro
 * (compartido/emparejamiento.ts).
 *
 * Qué se lee de dónde:
 * - El índice de cobertura solo aporta QUIÉNES cubren la celda (ids). Lo
 *   escribe el propio cuidador, así que nada más se toma de ahí.
 * - Perfil (verificaciones, calificación, horario, zona): `perfiles_publicos`.
 * - Agenda y excepciones semanales: solo el servidor las puede ver todas.
 * - Mascotas del pedido y paseos que cada cuidador lleva con ellas:
 *   `mascotas` y `expedientes`.
 */
import {
  FieldValue,
  Timestamp,
  type Firestore,
} from 'firebase-admin/firestore';
import {
  cellToLatLng,
  gridDisk,
  greatCircleDistance,
  isValidCell,
  latLngToCell,
} from 'h3-js';
import {
  emparejar,
  esBloqueante,
  evaluarCandidato,
  instanteDe,
  REGLAS_EMPAREJAMIENTO,
  semanaIso,
  TAMANOS,
  type Advertencia,
  type AjustesEmparejamiento,
  type Candidato,
  type CuidadorEncontrado,
  type MascotaDelPedido,
  type OverrideDia,
  type PeticionBusqueda,
  type Resultado,
  type RespuestaAceptacion,
  type RespuestaBusqueda,
  type Solicitud,
  type Tamano,
} from '../compartido/emparejamiento';
import {leerConfiguracion} from '../comun/configuracion';
import {ErrorNegocio} from '../comun/errores';
import {notificar} from '../comun/notificar';

type Dato = Record<string, unknown>;

const RADIO_COBERTURA = 2;
const MAX_CANDIDATOS = 60;
const MAX_MASCOTAS_PEDIDO = 10;
const ESTADOS_EN_AGENDA = [
  'CONFIRMADO', 'EN_CAMINO', 'EN_PUNTO_RECOGIDA', 'EN_PROGRESO',
];

const esTexto = (v: unknown): v is string => typeof v === 'string';
const numero = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

/**
 * Milisegundos de una fecha de Firestore (Timestamp, Date o número).
 * @param {unknown} valor Fecha.
 * @return {number | undefined} Ms, o undefined si no hay fecha.
 */
function aMs(valor: unknown): number | undefined {
  const v = valor as {toMillis?: () => number; toDate?: () => Date} | null;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (typeof v?.toDate === 'function') return v.toDate().getTime();
  return numero(valor);
}

/** Cupo que el cuidador se pone: un entero de 1 en adelante, si no, sin cupo propio. */
const cupoPropio = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) && v >= 1 ? v : undefined;

const tamanoDe = (v: unknown): Tamano | undefined =>
  (TAMANOS as readonly unknown[]).includes(v) ? (v as Tamano) : undefined;

/**
 * Valida la petición del cliente.
 * @param {unknown} datos Cuerpo recibido.
 * @return {PeticionBusqueda} Petición limpia.
 */
export function validarPeticion(datos: unknown): PeticionBusqueda {
  const d = (datos ?? {}) as Dato;
  const invalido = (campo: string) =>
    new ErrorNegocio('invalid-argument', `${campo} no es válido`);

  if (!esTexto(d.fecha) || !esTexto(d.hora) ||
    Number.isNaN(instanteDe(d.fecha, d.hora))) {
    throw invalido('La fecha u hora');
  }
  const duracion = numero(d.duracion);
  if (duracion === undefined || !Number.isInteger(duracion) ||
    duracion < 15 || duracion > 480) {
    throw invalido('La duración');
  }
  if (!esTexto(d.celda) || !isValidCell(d.celda)) throw invalido('La zona');
  const ids = Array.isArray(d.mascotaIds) ?
    [...new Set(d.mascotaIds.filter(esTexto))] : [];
  if (ids.length === 0 || ids.length > MAX_MASCOTAS_PEDIDO) {
    throw invalido('Las mascotas');
  }
  return {
    fecha: d.fecha, hora: d.hora, duracion, celda: d.celda, mascotaIds: ids,
  };
}

/**
 * Mascotas del pedido. Si se indica `uid`, debe ser uno de sus tutores.
 * @param {Firestore} db Firestore.
 * @param {string | undefined} uid Quien pregunta (sin él no se comprueba).
 * @param {string[]} ids Mascotas del pedido.
 * @return {Promise<MascotaDelPedido[]>} Mascotas con nombre y tamaño.
 */
async function leerMascotas(
  db: Firestore,
  uid: string | undefined,
  ids: string[]
): Promise<MascotaDelPedido[]> {
  const docs = await Promise.all(ids.map((id) => db.doc(`mascotas/${id}`).get()));
  return docs.map((doc, i) => {
    const m = doc.data();
    if (!doc.exists || !m) {
      throw new ErrorNegocio('not-found', 'Una de las mascotas no existe');
    }
    const tutores = [m.creado_por, ...(Array.isArray(m.ids_tutores) ?
      m.ids_tutores : [])];
    if (uid !== undefined && !tutores.includes(uid)) {
      throw new ErrorNegocio('permission-denied',
        'Solo los tutores de la mascota pueden buscarle cuidador');
    }
    return {
      id: ids[i],
      nombre: esTexto(m.nombre) ? m.nombre : '',
      tamano: tamanoDe(m.tamano),
    };
  });
}

/**
 * Paseos que cada cuidador lleva con cada mascota (del expediente).
 * @param {Firestore} db Firestore.
 * @param {string[]} mascotaIds Mascotas del pedido.
 * @return {Promise<Map<string, Record<string, number>>>} `cuidador → mascota → paseos`.
 */
async function leerVinculos(
  db: Firestore,
  mascotaIds: string[]
): Promise<Map<string, Record<string, number>>> {
  const porCuidador = new Map<string, Record<string, number>>();
  const docs = await Promise.all(
    mascotaIds.map((id) => db.doc(`expedientes/${id}`).get())
  );
  docs.forEach((doc, i) => {
    const vinculos = (doc.data()?.vinculos ?? {}) as Record<string, Dato>;
    for (const [cuidador, v] of Object.entries(vinculos)) {
      const paseos = numero(v?.paseos) ?? 0;
      if (paseos <= 0) continue;
      porCuidador.set(cuidador, {
        ...(porCuidador.get(cuidador) ?? {}), [mascotaIds[i]]: paseos,
      });
    }
  });
  return porCuidador;
}

/**
 * Arma el candidato con lo que dice el perfil y su agenda.
 * @param {Firestore} db Firestore.
 * @param {string} id Cuidador.
 * @param {object} p Fecha y celda del pedido.
 * @param {Record<string, number>} vinculos Paseos con cada mascota del pedido.
 * @return {Promise<Candidato | null>} Candidato, o null si no hay perfil.
 */
async function armarCandidato(
  db: Firestore,
  id: string,
  p: Pick<PeticionBusqueda, 'fecha' | 'celda'>,
  vinculos: Record<string, number>
): Promise<Candidato | null> {
  const [perfilDoc, excepcionDoc, agendaSnap] = await Promise.all([
    db.doc(`perfiles_publicos/${id}`).get(),
    db.doc(`excepciones_disponibilidad/${id}/semanas/${semanaIso(p.fecha)}`).get(),
    db.collection('operaciones')
      .where('tipo', '==', 'paseo')
      .where('id_cuidador', '==', id)
      .where('estado', 'in', ESTADOS_EN_AGENDA)
      .get(),
  ]);
  const perfil = perfilDoc.data();
  if (!perfilDoc.exists || !perfil) return null;

  const origen = esTexto(perfil.h3_r8) && isValidCell(perfil.h3_r8) ?
    perfil.h3_r8 : undefined;
  const manuales = Array.isArray(perfil.celdas_cobertura) ?
    perfil.celdas_cobertura.filter(esTexto) : [];
  const celdas = manuales.length > 0 ?
    manuales : origen ? gridDisk(origen, RADIO_COBERTURA) : [];

  const agenda = agendaSnap.docs.flatMap((doc) => {
    const inicioMs = aMs(doc.data().fecha_hora_inicio);
    if (inicioMs === undefined) return [];
    const minutos = numero(doc.data().duracion_estimada) ?? 0;
    return [{inicioMs, finMs: inicioMs + minutos * 60000}];
  });

  return {
    id,
    nombre: esTexto(perfil.nombre) ? perfil.nombre : '',
    foto: esTexto(perfil.foto) ? perfil.foto : undefined,
    insignias: Array.isArray(perfil.insignias_verificacion) ?
      perfil.insignias_verificacion.filter(esTexto) : [],
    horarioSemanal: (perfil.horario_semanal ?? {}) as Candidato['horarioSemanal'],
    overrides: excepcionDoc.data()?.overrides as
      Record<string, OverrideDia> | undefined,
    celdas,
    distanciaKm: origen ?
      greatCircleDistance(cellToLatLng(origen), cellToLatLng(p.celda), 'km') :
      undefined,
    rating: numero(perfil.rating_promedio),
    paseosRealizados: numero(perfil.cantidad_paseos_realizados),
    maxMascotas: cupoPropio(perfil.max_mascotas),
    tamanosAceptados: Array.isArray(perfil.tamanos_aceptados) ?
      perfil.tamanos_aceptados.map(tamanoDe).filter(
        (t): t is Tamano => t !== undefined) :
      undefined,
    agenda,
    paseosConMascota: vinculos,
  };
}

/**
 * Cuidadores para un pedido, ordenados por encaje y con las razones.
 * @param {Firestore} db Firestore.
 * @param {string} uid Tutor que busca.
 * @param {unknown} datos Cuerpo de la petición.
 * @param {number} ahoraMs Momento actual.
 * @return {Promise<RespuestaBusqueda>} Cuidadores aptos y los de otro horario.
 */
export async function buscarCuidadores(
  db: Firestore,
  uid: string,
  datos: unknown,
  ahoraMs: number
): Promise<RespuestaBusqueda> {
  const p = validarPeticion(datos);
  const [mascotas, ajustes, expediente, paseos, indice] = await Promise.all([
    leerMascotas(db, uid, p.mascotaIds),
    leerConfiguracion(db, 'emparejamiento'),
    leerConfiguracion(db, 'expediente'),
    leerConfiguracion(db, 'paseos'),
    db.collection(`indice_cobertura/${p.celda}/cuidadores`).get(),
  ]);

  const ids = indice.docs.map((d) => d.id)
    .filter((id) => id !== uid).slice(0, MAX_CANDIDATOS);
  const vinculos = await leerVinculos(db, p.mascotaIds);
  const candidatos = (await Promise.all(
    ids.map((id) => armarCandidato(db, id, p, vinculos.get(id) ?? {}))
  )).filter((c): c is Candidato => c !== null);

  const evaluados = emparejar(candidatos, {
    fecha: p.fecha,
    hora: p.hora,
    duracion: p.duracion,
    ahoraMs,
    celdaTutor: p.celda,
    mascotas,
  }, {
    ...ajustes,
    priorizar_conocidos: expediente.priorizar_conocidos,
    max_mascotas: paseos.max_mascotas,
  });

  const cuidadores = evaluados.slice(0, ajustes.max_resultados)
    .map(({candidato: c, resultado: r}): CuidadorEncontrado => ({
      id: c.id,
      nombre: c.nombre,
      foto: c.foto,
      calificacion: c.rating ?? 0,
      distanciaKm: c.distanciaKm,
      insignias: c.insignias,
      estado: r.estado,
      motivo: r.estado === 'otro_horario' ? r.motivo : undefined,
      franja: r.estado === 'otro_horario' ? r.franja : undefined,
      razones: r.estado === 'disponible' ? r.razones : [],
      continuidad: r.estado === 'disponible' ? r.continuidad : undefined,
      advertencias: r.advertencias,
    }));
  return {cuidadores};
}

// ---------- Un paseo concreto: crear y aceptar ----------

type Paseo = Record<string, unknown>;

/**
 * Pedido (fecha, hora, zona y mascotas) que describe un paseo ya creado.
 * @param {Firestore} db Firestore.
 * @param {Paseo} paseo Documento del paseo.
 * @param {number} ahoraMs Momento a partir del cual cuenta "hora pasada".
 * @return {Promise<Solicitud>} Pedido.
 */
async function solicitudDePaseo(
  db: Firestore,
  paseo: Paseo,
  ahoraMs: number
): Promise<Solicitud> {
  const inicioMs = aMs(paseo.fecha_hora_inicio);
  const coordenadas = (paseo.ubicacion_inicio as
    {coordenadas?: {latitude?: unknown; longitude?: unknown}} | undefined)
    ?.coordenadas;
  const lat = numero(coordenadas?.latitude);
  const lng = numero(coordenadas?.longitude);
  if (inicioMs === undefined || lat === undefined || lng === undefined) {
    throw new ErrorNegocio('failed-precondition',
      'El paseo no tiene fecha o ubicación');
  }
  const ids = Array.isArray(paseo.mascota_ids) ?
    paseo.mascota_ids.filter(esTexto) : [];

  // Reloj de pared de Colombia: se corre el instante y se leen campos UTC
  const local = new Date(
    inicioMs - REGLAS_EMPAREJAMIENTO.HORAS_UTC_COLOMBIA * 3600000);
  const dos = (n: number) => String(n).padStart(2, '0');
  return {
    fecha: `${local.getUTCFullYear()}-${dos(local.getUTCMonth() + 1)}-` +
      dos(local.getUTCDate()),
    hora: `${dos(local.getUTCHours())}:${dos(local.getUTCMinutes())}`,
    duracion: numero(paseo.duracion_estimada) ?? 60,
    ahoraMs,
    celdaTutor: latLngToCell(lat, lng, 8),
    mascotas: await leerMascotas(db, undefined, ids),
  };
}

/**
 * Evalúa a un cuidador para un paseo ya creado, con las mismas reglas que la
 * búsqueda.
 * @param {Firestore} db Firestore.
 * @param {string} cuidadorId Cuidador.
 * @param {Paseo} paseo Documento del paseo.
 * @param {number} ahoraMs Momento de referencia.
 * @return {Promise<Resultado>} Resultado de evaluarlo.
 */
export async function evaluarCuidadorParaPaseo(
  db: Firestore,
  cuidadorId: string,
  paseo: Paseo,
  ahoraMs: number
): Promise<Resultado> {
  const solicitud = await solicitudDePaseo(db, paseo, ahoraMs);
  const [ajustes, expediente, paseos, vinculos] = await Promise.all([
    leerConfiguracion(db, 'emparejamiento'),
    leerConfiguracion(db, 'expediente'),
    leerConfiguracion(db, 'paseos'),
    leerVinculos(db, solicitud.mascotas.map((m) => m.id)),
  ]);
  const candidato = await armarCandidato(db, cuidadorId,
    {fecha: solicitud.fecha, celda: solicitud.celdaTutor},
    vinculos.get(cuidadorId) ?? {});
  // Sin perfil público no es un cuidador: nunca puede tomar un paseo
  if (!candidato) return {estado: 'excluido', motivo: 'no_verificado'};
  const reglas: AjustesEmparejamiento = {
    ...ajustes,
    priorizar_conocidos: expediente.priorizar_conocidos,
    max_mascotas: paseos.max_mascotas,
  };
  return evaluarCandidato(candidato, solicitud, reglas);
}

const MENSAJES_BLOQUEO: Record<string, string> = {
  no_verificado: 'Tu identidad aún no está verificada',
  fuera_de_zona: 'Este paseo está fuera de tu zona de cobertura',
  cupo: 'Este paseo tiene más perros de los que permite el servicio',
  ocupado: 'Ya tienes otro paseo en ese horario',
  hora_pasada: 'Este paseo ya empezó o está por empezar',
  fuera_de_servicio: 'Este paseo queda fuera del horario del servicio',
};

/**
 * Mensaje para el cuidador cuando no puede tomar el paseo.
 * @param {Resultado} r Resultado bloqueante.
 * @return {string} Mensaje legible.
 */
function mensajeDeBloqueo(r: Resultado): string {
  const motivo = r.estado === 'disponible' ? '' : r.motivo;
  return MENSAJES_BLOQUEO[motivo] ?? 'No puedes tomar este paseo';
}

const unirNombres = (nombres: string[]): string =>
  nombres.length <= 1 ?
    (nombres[0] ?? '') :
    `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;

/**
 * Las advertencias en una frase, para avisar al tutor.
 * @param {Advertencia[]} avisos Advertencias.
 * @return {string} Texto en español.
 */
function textoDeAdvertencias(avisos: Advertencia[]): string {
  return avisos.map((a) => a.tipo === 'tamano' ?
    `Normalmente no cuida el tamaño de ${unirNombres(a.mascotas)}` :
    `Suele cuidar hasta ${a.cupo} ${a.cupo === 1 ? 'perro' : 'perros'} a la vez`
  ).join('. ');
}

/**
 * Un cuidador acepta un paseo: el servidor vuelve a comprobar que puede y lo
 * confirma de forma atómica. Es la única vía para pasar de PENDIENTE a
 * CONFIRMADO.
 *
 * Lo innegociable (verificación, zona, tope del servicio, choque de agenda)
 * rechaza. Lo que el cuidador normalmente no hace (tamaño de las mascotas,
 * más perros de los que prefiere) NO rechaza: primero se le informa y, si
 * decide seguir (`confirmo`), se acepta y se avisa al tutor.
 * @param {Firestore} db Firestore.
 * @param {string} uid Cuidador que acepta.
 * @param {unknown} paseoId Paseo.
 * @param {number} ahoraMs Momento actual.
 * @param {boolean} confirmo Si ya vio las advertencias y decide aceptar.
 * @return {Promise<RespuestaAceptacion>} Aceptado, o las advertencias a confirmar.
 */
export async function aceptarPaseo(
  db: Firestore,
  uid: string,
  paseoId: unknown,
  ahoraMs: number,
  confirmo = false
): Promise<RespuestaAceptacion> {
  if (!esTexto(paseoId) || paseoId.trim() === '') {
    throw new ErrorNegocio('invalid-argument', 'paseoId es requerido');
  }
  const ref = db.doc(`operaciones/${paseoId}`);
  const paseo = (await ref.get()).data();
  if (!paseo || paseo.tipo !== 'paseo') {
    throw new ErrorNegocio('not-found', 'El paseo no existe');
  }
  if (paseo.estado !== 'PENDIENTE') {
    throw new ErrorNegocio('failed-precondition',
      'Este paseo ya no está disponible');
  }
  if (paseo.creado_por === uid) {
    throw new ErrorNegocio('permission-denied',
      'No puedes aceptar tu propio paseo');
  }
  if (paseo.id_cuidador && paseo.id_cuidador !== uid) {
    throw new ErrorNegocio('failed-precondition',
      'Este paseo está asignado a otro cuidador');
  }

  // Una hora que ya empezó no sirve; los últimos minutos antes de empezar sí
  const margen = REGLAS_EMPAREJAMIENTO.ANTELACION_MIN * 60000;
  const resultado = await evaluarCuidadorParaPaseo(db, uid, paseo,
    ahoraMs - margen);
  if (esBloqueante(resultado)) {
    throw new ErrorNegocio('failed-precondition', mensajeDeBloqueo(resultado));
  }
  const advertencias = resultado.estado === 'excluido' ?
    [] : resultado.advertencias;
  if (advertencias.length > 0 && !confirmo) {
    return {aceptado: false, requiereConfirmacion: true, advertencias};
  }

  const perfil = (await db.doc(`perfiles_publicos/${uid}`).get()).data();
  await db.runTransaction(async (tx) => {
    const actual = (await tx.get(ref)).data();
    if (actual?.estado !== 'PENDIENTE' ||
      (actual.id_cuidador && actual.id_cuidador !== uid)) {
      throw new ErrorNegocio('failed-precondition',
        'Otro cuidador acaba de aceptar este paseo');
    }
    tx.update(ref, {
      estado: 'CONFIRMADO',
      id_cuidador: uid,
      cuidador_nombre_visual: esTexto(perfil?.nombre) ? perfil.nombre : 'Cuidador',
      cuidador_foto_visual: esTexto(perfil?.foto) ? perfil.foto : null,
      actualizado_en: Timestamp.fromMillis(ahoraMs),
      actualizado_por: uid,
    });
  });

  // El tutor se entera si el cuidador aceptó algo que normalmente no hace
  if (advertencias.length > 0 && esTexto(paseo.creado_por)) {
    await notificar(db, {
      tipo: 'PASEO_CON_AVISOS',
      uid: paseo.creado_por,
      datos: {
        paseo_id: paseoId,
        cuidador: esTexto(perfil?.nombre) ? perfil.nombre : 'El cuidador',
        detalle: textoDeAdvertencias(advertencias),
      },
    }).catch((e) => console.warn('[emparejamiento] aviso no enviado:', e));
  }
  return {aceptado: true, id_cuidador: uid};
}

/**
 * Al crearse un paseo dirigido a un cuidador, comprueba que ese cuidador
 * puede tomarlo. Si no (otro paseo, zona, identidad...), el paseo se abre a
 * otros cuidadores —igual que cuando el elegido no responde— y se avisa al
 * tutor.
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo recién creado.
 * @param {number} ahoraMs Momento actual.
 * @return {Promise<boolean>} true si se abrió a otros cuidadores.
 */
export async function validarAsignacionAlCrear(
  db: Firestore,
  paseoId: string,
  ahoraMs: number
): Promise<boolean> {
  const ref = db.doc(`operaciones/${paseoId}`);
  const paseo = (await ref.get()).data();
  if (!paseo || paseo.tipo !== 'paseo' || paseo.estado !== 'PENDIENTE' ||
    !esTexto(paseo.id_cuidador) || paseo.id_cuidador === '') {
    return false;
  }
  const cuidador = paseo.id_cuidador;
  const resultado = await evaluarCuidadorParaPaseo(db, cuidador, paseo, ahoraMs);
  if (!esBloqueante(resultado)) return false;

  const ahora = Timestamp.fromMillis(ahoraMs);
  const abierto = await db.runTransaction(async (tx) => {
    const actual = (await tx.get(ref)).data();
    if (actual?.estado !== 'PENDIENTE' || actual.id_cuidador !== cuidador) {
      return false;
    }
    tx.update(ref, {
      id_cuidador: FieldValue.delete(),
      cuidador_nombre_visual: FieldValue.delete(),
      cuidador_foto_visual: FieldValue.delete(),
      actualizado_en: ahora,
      actualizado_por: 'SISTEMA_EMPAREJAMIENTO',
    });
    tx.set(ref.collection('eventos').doc(), {
      evento: 'ASIGNACION_INVALIDA',
      payload: {
        razon: mensajeDeBloqueo(resultado),
        cuidador_anterior: cuidador,
      },
      actor: 'SISTEMA',
      creado_por: 'SISTEMA',
      creado_en: ahora,
      actualizado_por: 'SISTEMA',
      actualizado_en: ahora,
    });
    return true;
  });
  if (abierto && esTexto(paseo.creado_por)) {
    await notificar(db, {
      tipo: 'SOLICITUD_ESCALADA',
      uid: paseo.creado_por,
      datos: {paseo_id: paseoId},
    }).catch((e) => console.warn('[emparejamiento] aviso no enviado:', e));
  }
  return abierto;
}
