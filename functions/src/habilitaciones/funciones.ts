/**
 * Cloud Functions de las habilitaciones (capa delgada).
 *
 * - iniciarHabilitacion: la persona empieza (o retoma) su habilitación.
 * - enviarHabilitacion: la envía a revisión (comprueba perfil y evidencia).
 * - decidirRequisito: el equipo aprueba o rechaza un requisito en revisión.
 * - decidirHabilitacion: el equipo rechaza, suspende, reactiva o reabre.
 * - evidenciaHabilitacion: el equipo ve la evidencia de un requisito.
 *
 * La lógica está en habilitaciones.ts; aquí solo se autentica y se valida la
 * forma de la petición.
 */
import {onCall, HttpsError} from 'firebase-functions/v2/https';
import {getStorage} from 'firebase-admin/storage';
import admin from '../comun/firebaseAdminCompat';
import {
  OPCIONES_CALLABLE as OPCIONES,
  conErrores,
  requerirAdmin,
  requerirUid,
  texto,
} from '../comun/callables';
import {
  DECISIONES_HABILITACION,
  type DecisionHabilitacion,
} from '../compartido/habilitacion';
import {esTipoServicio, type TipoServicio} from '../compartido/servicios';
import {evidenciaDeRequisito} from './evidencia';
import {
  decidirHabilitacion as decidir,
  decidirRequisitoDelEquipo,
  enviarHabilitacion as enviar,
  iniciarHabilitacion as iniciar,
} from './habilitaciones';

if (!admin.apps || admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

/**
 * Servicio de la petición, o error.
 * @param {unknown} valor Valor recibido.
 * @return {TipoServicio} Servicio válido.
 */
function exigirServicio(valor: unknown): TipoServicio {
  if (!esTipoServicio(valor)) {
    throw new HttpsError('invalid-argument', 'servicio no existe');
  }
  return valor;
}

/**
 * Archivo en el bucket de Storage del proyecto: cuándo se subió.
 * @param {string} ruta Ruta del archivo.
 * @return {Promise<object | null>} Fecha de actualización, o null si no existe.
 */
async function archivo(ruta: string): Promise<{actualizadoMs: number} | null> {
  const referencia = getStorage().bucket().file(ruta);
  const [existe] = await referencia.exists();
  if (!existe) return null;
  const [metadatos] = await referencia.getMetadata();
  const subido = Date.parse(String(metadatos.updated ?? metadatos.timeCreated ?? ''));
  // Sin fecha legible cuenta como viejo: nunca se acepta como "nuevo" a ciegas
  return {actualizadoMs: Number.isFinite(subido) ? subido : 0};
}

/**
 * Lee un archivo del bucket de Storage del proyecto.
 * @param {string} ruta Ruta del archivo.
 * @return {Promise<object | null>} Tipo y contenido en base64, o null.
 */
async function leerArchivo(
  ruta: string
): Promise<{contentType: string, base64: string} | null> {
  const archivo = getStorage().bucket().file(ruta);
  const [existe] = await archivo.exists();
  if (!existe) return null;
  const [[datos], [metadatos]] = await Promise.all([
    archivo.download(),
    archivo.getMetadata(),
  ]);
  return {
    contentType: String(metadatos.contentType ?? 'application/octet-stream'),
    base64: datos.toString('base64'),
  };
}

export const iniciarHabilitacion = onCall(OPCIONES, (request) =>
  conErrores(async () => {
    const uid = requerirUid(request);
    const id = await iniciar(db, uid, exigirServicio(request.data?.servicio), Date.now());
    return {id};
  })
);

export const enviarHabilitacion = onCall(OPCIONES, (request) =>
  conErrores(async () => {
    const uid = requerirUid(request);
    const h = await enviar(db, uid, exigirServicio(request.data?.servicio),
      Date.now(), {archivo});
    return {id: h.id, estado: h.estado};
  })
);

export const decidirRequisito = onCall(OPCIONES, (request) =>
  conErrores(async () => {
    const autor = await requerirAdmin(db, request);
    const decision = request.data?.decision;
    if (decision !== 'APROBAR' && decision !== 'RECHAZAR') {
      throw new HttpsError('invalid-argument', 'decision debe ser APROBAR o RECHAZAR');
    }
    const h = await decidirRequisitoDelEquipo(db, {
      id: texto(request.data?.id, 'id'),
      requisito: texto(request.data?.requisito, 'requisito'),
      decision,
      motivo: request.data?.motivo,
      autor,
      ahoraMs: Date.now(),
    });
    return {id: h.id, estado: h.estado};
  })
);

export const decidirHabilitacion = onCall(OPCIONES, (request) =>
  conErrores(async () => {
    const autor = await requerirAdmin(db, request);
    const decision = request.data?.decision as DecisionHabilitacion;
    if (!DECISIONES_HABILITACION.includes(decision)) {
      throw new HttpsError('invalid-argument',
        `decision debe ser una de: ${DECISIONES_HABILITACION.join(', ')}`);
    }
    const h = await decidir(db, {
      id: texto(request.data?.id, 'id'),
      decision,
      motivo: request.data?.motivo,
      autor,
      ahoraMs: Date.now(),
    });
    return {id: h.id, estado: h.estado};
  })
);

export const evidenciaHabilitacion = onCall(
  {...OPCIONES, memory: '512MiB'},
  (request) =>
    conErrores(async () => {
      await requerirAdmin(db, request);
      const archivos = await evidenciaDeRequisito(
        db,
        texto(request.data?.id, 'id'),
        texto(request.data?.requisito, 'requisito'),
        {leerArchivo}
      );
      return {archivos};
    })
);
