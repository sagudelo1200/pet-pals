/* eslint-disable camelcase */
/**
 * Servicio por zonas (lado servidor): dónde se atiende y qué pasa con quien
 * pide o ofrece servicio donde todavía no se atiende.
 *
 * - `consultarServicio`: ¿se atiende en esta celda? (zona activa o piloto,
 *   cuando `paseos.exigir_zona` está encendido).
 * - Interesados (`interes_zona`): quien intenta pedir un paseo (tutor) o vive
 *   donde no se atiende (cuidador) queda registrado una vez por celda y rol; sus
 *   conteos viajan en `territorio/{celda}.interes` para verlos en el mapa. Quien
 *   toca "Avísame cuando lleguemos" recibe un aviso cuando una zona abre.
 * - Red de seguridad: un paseo creado fuera de servicio (saltándose la
 *   pantalla) se cancela.
 */
import {Timestamp, type Firestore} from 'firebase-admin/firestore';
import {ErrorNegocio} from '../comun/errores';
import {leerConfiguracion} from '../comun/configuracion';
import {notificar} from '../comun/notificar';
import {
  RESOLUCIONES,
  celdaDe,
  esCeldaValida,
  resolucionDe,
} from '../compartido/geografia';
import {COLECCION_TERRITORIO} from '../compartido/territorio';
import {
  COLECCION_INTERES_ZONA,
  COLECCION_ZONAS,
  ROLES_INTERES,
  estadoDeServicio,
  idDeInteres,
  type EstadoServicio,
  type InteresZona,
  type RolInteres,
} from '../compartido/zonas';
import {zonaDeCelda} from './zonas';

type Dato = Record<string, unknown>;

const esTexto = (v: unknown): v is string => typeof v === 'string';

/**
 * Datos de una zona, si existe.
 * @param {Firestore} db Firestore.
 * @param {string | null} zonaId Id de la zona.
 * @return {Promise<object | null>} Id, nombre y estado, o null.
 */
async function leerZona(db: Firestore, zonaId: string | null) {
  if (zonaId === null) return null;
  const zona = (await db.doc(`${COLECCION_ZONAS}/${zonaId}`).get()).data();
  if (!zona || !esTexto(zona.nombre)) return null;
  return {
    id: zonaId,
    nombre: zona.nombre,
    estado: zona.estado === 'activa' || zona.estado === 'piloto' ?
      zona.estado : 'cerrada' as const,
  };
}

/**
 * ¿Se atiende en esta celda?
 * @param {Firestore} db Firestore.
 * @param {string} celda Celda válida.
 * @return {Promise<EstadoServicio>} Abierto o el motivo por el que no.
 */
export async function consultarServicio(
  db: Firestore,
  celda: string
): Promise<EstadoServicio> {
  const [paseos, zonaId] = await Promise.all([
    leerConfiguracion(db, 'paseos'),
    zonaDeCelda(db, celda),
  ]);
  return estadoDeServicio(await leerZona(db, zonaId), paseos.exigir_zona);
}

/**
 * Celda de cobertura válida o error.
 * @param {unknown} celda Valor recibido.
 * @return {string} Celda R8.
 */
export function exigirCeldaDeCobertura(celda: unknown): string {
  if (!esCeldaValida(celda) || resolucionDe(celda) !== RESOLUCIONES.cobertura) {
    throw new ErrorNegocio('invalid-argument', 'La zona no es válida');
  }
  return celda;
}

/**
 * Cuenta los interesados de una celda y los deja en `territorio/{celda}`.
 * @param {Firestore} db Firestore.
 * @param {string} celda Celda de cobertura.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<void>}
 */
async function recalcularInteres(
  db: Firestore,
  celda: string,
  ahora: Timestamp
): Promise<void> {
  const [tutores, cuidadores] = await Promise.all(ROLES_INTERES.map(async (rol) =>
    (await db.collection(COLECCION_INTERES_ZONA)
      .where('celda', '==', celda).where('rol', '==', rol)
      .count().get()).data().count));
  await db.doc(`${COLECCION_TERRITORIO}/${celda}`).set({
    celda,
    res: RESOLUCIONES.cobertura,
    padre_r8: celda,
    interes: {tutores, cuidadores},
    actualizado_en: ahora,
  }, {merge: true});
}

/**
 * Anota que alguien quiere servicio en una celda que no se atiende. Es una vez
 * por persona, rol y celda: repetir solo suma un intento. Si pide que le
 * avisen, queda pendiente de aviso.
 * @param {Firestore} db Firestore.
 * @param {object} interes Persona, celda, rol y si pidió aviso.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<boolean>} true si es un interesado nuevo en esa celda.
 */
export async function registrarInteres(
  db: Firestore,
  interes: {uid: string; celda: unknown; rol: unknown; avisar: boolean},
  ahora: Timestamp
): Promise<boolean> {
  const celda = exigirCeldaDeCobertura(interes.celda);
  const rol = interes.rol as RolInteres;
  if (!ROLES_INTERES.includes(rol)) {
    throw new ErrorNegocio('invalid-argument', 'El rol no es válido');
  }
  const ref = db.doc(
    `${COLECCION_INTERES_ZONA}/${idDeInteres(interes.uid, rol, celda)}`);
  const existente = (await ref.get()).data();

  if (existente) {
    await ref.update({
      ultimo: ahora,
      intentos: (typeof existente.intentos === 'number' ? existente.intentos : 0) + 1,
      avisar: existente.avisar === true || interes.avisar,
      // Si vuelve a pedir que le avisen, se le avisará de nuevo
      notificado: interes.avisar ? false : existente.notificado === true,
    });
    return false;
  }

  const nuevo: InteresZona = {
    uid: interes.uid,
    celda,
    rol,
    avisar: interes.avisar,
    notificado: false,
    intentos: 1,
    desde: ahora,
    ultimo: ahora,
  };
  await ref.set(nuevo);
  await recalcularInteres(db, celda, ahora);
  return true;
}

/**
 * Un cuidador cambió su ubicación o cobertura: si vive donde no se atiende,
 * queda registrado como interesado (aún no recibirá solicitudes).
 * @param {Firestore} db Firestore.
 * @param {string} uid Cuidador.
 * @param {Dato | undefined} perfil Perfil público actual.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<boolean>} true si quedó registrado en una celda sin servicio.
 */
export async function registrarInteresDeCuidador(
  db: Firestore,
  uid: string,
  perfil: Dato | undefined,
  ahora: Timestamp
): Promise<boolean> {
  const origen = perfil?.h3_r8;
  if (!esCeldaValida(origen) || resolucionDe(origen) !== RESOLUCIONES.cobertura) {
    return false;
  }
  if ((await consultarServicio(db, origen)).abierto) return false;
  await registrarInteres(db, {uid, celda: origen, rol: 'cuidador', avisar: false}, ahora);
  return true;
}

/**
 * Una zona abrió: avisa a quienes pidieron que les avisaran y cuya celda ya
 * está en una zona activa o piloto. Solo mira a quienes lo pidieron (pocos), y
 * cada uno recibe el aviso una vez.
 * @param {Firestore} db Firestore.
 * @return {Promise<number>} Cuántos avisos se enviaron.
 */
export async function avisarZonasAbiertas(db: Firestore): Promise<number> {
  const pendientes = await db.collection(COLECCION_INTERES_ZONA)
    .where('avisar', '==', true).where('notificado', '==', false).get();
  const zonaDe = new Map<string, Awaited<ReturnType<typeof leerZona>>>();
  let avisos = 0;

  for (const doc of pendientes.docs) {
    const {uid, celda, rol} = doc.data() as Partial<InteresZona>;
    if (!esTexto(uid) || !esCeldaValida(celda)) continue;
    if (!zonaDe.has(celda)) {
      zonaDe.set(celda, await leerZona(db, await zonaDeCelda(db, celda)));
    }
    const zona = zonaDe.get(celda);
    if (!zona || zona.estado === 'cerrada') continue;

    await notificar(db, {
      tipo: rol === 'cuidador' ? 'ZONA_ABIERTA_CUIDADOR' : 'ZONA_ABIERTA_TUTOR',
      uid,
      datos: {zona: zona.nombre},
    });
    await doc.ref.update({notificado: true});
    avisos++;
  }
  return avisos;
}

/**
 * Un paseo recién creado en una celda sin servicio se cancela: llegó saltándose
 * la comprobación de la pantalla. Queda el motivo en su historial, el tutor
 * queda como interesado y se le avisa.
 * @param {Firestore} db Firestore.
 * @param {string} paseoId Paseo.
 * @param {Dato | undefined} paseo Documento del paseo.
 * @param {Timestamp} ahora Momento.
 * @return {Promise<boolean>} true si se canceló.
 */
export async function cancelarSiFueraDeServicio(
  db: Firestore,
  paseoId: string,
  paseo: Dato | undefined,
  ahora: Timestamp
): Promise<boolean> {
  if (!paseo || paseo.tipo !== 'paseo' || paseo.estado !== 'PENDIENTE') {
    return false;
  }
  const c = (paseo.ubicacion_inicio as
    {coordenadas?: {latitude?: unknown; longitude?: unknown}} | undefined)
    ?.coordenadas;
  if (typeof c?.latitude !== 'number' || typeof c?.longitude !== 'number') {
    return false;
  }
  const celda = celdaDe(c.latitude, c.longitude);
  const servicio = await consultarServicio(db, celda);
  if (servicio.abierto) return false;

  const ref = db.doc(`operaciones/${paseoId}`);
  const cancelado = await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).data()?.estado !== 'PENDIENTE') return false;
    tx.update(ref, {
      estado: 'CANCELADO',
      actualizado_en: ahora,
      actualizado_por: 'SISTEMA_ZONAS',
    });
    tx.set(ref.collection('eventos').doc(), {
      evento: 'CANCELADO_FUERA_DE_ZONA',
      payload: {razon: servicio.motivo},
      actor: 'SISTEMA',
      creado_por: 'SISTEMA',
      creado_en: ahora,
      actualizado_por: 'SISTEMA',
      actualizado_en: ahora,
    });
    return true;
  });
  if (!cancelado) return false;

  const tutor = paseo.creado_por;
  if (esTexto(tutor)) {
    await registrarInteres(db, {uid: tutor, celda, rol: 'tutor', avisar: false}, ahora);
    await notificar(db, {
      tipo: 'PASEO_FUERA_DE_ZONA',
      uid: tutor,
      datos: {paseo_id: paseoId},
    }).catch((e) => console.warn('[zonas] aviso no enviado:', e));
  }
  return true;
}
