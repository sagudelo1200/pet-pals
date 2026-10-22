/**
 * Callables genéricos de administración (solo admin):
 * - actualizarConfiguracion: cambia valores operativos (con historial).
 * - publicarVersion: publica una versión de cualquier tipo versionable
 *   (política comercial, consentimientos, ...).
 * - reactivarVersion: vuelve a poner vigente una versión anterior.
 *
 * Capa delgada: autentica, valida la forma de la entrada y delega en los
 * motores comunes (comun/configuracion.ts y comun/versionado.ts).
 */
import {onCall, HttpsError} from 'firebase-functions/v2/https';
import {Timestamp} from 'firebase-admin/firestore';
import admin from '../comun/firebaseAdminCompat';
import {
  OPCIONES_CALLABLE,
  conErrores,
  requerirAdmin,
  texto,
} from '../comun/callables';
import {actualizarConfiguracion as guardarConfiguracion} from '../comun/configuracion';
import {
  publicarVersion as publicar,
  reactivarVersion as reactivar,
} from '../comun/versionado';

if (!admin.apps || admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

/**
 * Objeto requerido de la petición.
 * @param {unknown} valor Valor recibido.
 * @param {string} campo Nombre del campo.
 * @return {Record<string, unknown>} Objeto.
 */
function objeto(valor: unknown, campo: string): Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    throw new HttpsError('invalid-argument', `${campo} es requerido`);
  }
  return valor as Record<string, unknown>;
}

export const actualizarConfiguracion = onCall(OPCIONES_CALLABLE, (request) =>
  conErrores(async () => {
    const uid = await requerirAdmin(db, request);
    const area = texto(request.data?.area, 'area');
    const cambios = objeto(request.data?.cambios, 'cambios');
    const cambiadas = await guardarConfiguracion(db, area, cambios, {
      motivo: request.data?.motivo,
      autor: uid,
      ahora: Timestamp.now(),
    });
    return {cambiadas};
  })
);

export const publicarVersion = onCall(OPCIONES_CALLABLE, (request) =>
  conErrores(async () => {
    const uid = await requerirAdmin(db, request);
    const tipo = texto(request.data?.tipo, 'tipo');
    const contenido = objeto(request.data?.contenido, 'contenido');
    return publicar(db, tipo, contenido, {
      motivo: request.data?.motivo,
      autor: uid,
      ahora: Timestamp.now(),
    });
  })
);

export const reactivarVersion = onCall(OPCIONES_CALLABLE, (request) =>
  conErrores(async () => {
    const uid = await requerirAdmin(db, request);
    const tipo = texto(request.data?.tipo, 'tipo');
    const version = request.data?.version;
    if (!Number.isInteger(version) || version < 1) {
      throw new HttpsError('invalid-argument', 'version debe ser un entero >= 1');
    }
    return reactivar(db, tipo, version, {
      motivo: request.data?.motivo,
      autor: uid,
      ahora: Timestamp.now(),
    });
  })
);
