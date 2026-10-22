/**
 * Utilidades comunes de los callables: errores, sesión y permisos de admin.
 */
import {HttpsError, type CallableRequest} from 'firebase-functions/v2/https';
import type {Firestore} from 'firebase-admin/firestore';
import {ErrorNegocio} from './errores';

export const OPCIONES_CALLABLE = {
  region: 'us-central1',
  timeoutSeconds: 60,
  memory: '256MiB',
} as const;

/**
 * Traduce errores de negocio a HttpsError; el resto se reporta como interno.
 * @param {Function} fn Lógica del callable.
 * @return {Promise<T>} Resultado.
 */
export async function conErrores<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error instanceof ErrorNegocio) {
      throw new HttpsError(error.codigo, error.message);
    }
    console.error('[callable] Error inesperado:', error);
    throw new HttpsError('internal',
      error instanceof Error ? error.message : 'Error interno');
  }
}

/**
 * UID autenticado o error.
 * @param {CallableRequest} request Petición.
 * @return {string} UID.
 */
export function requerirUid(request: CallableRequest): string {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  }
  return request.auth.uid;
}

/**
 * ¿El usuario es admin? (claims o documento de usuario)
 * @param {Firestore} db Firestore.
 * @param {CallableRequest} request Petición.
 * @return {Promise<boolean>} Si es admin.
 */
export async function esAdmin(
  db: Firestore,
  request: CallableRequest
): Promise<boolean> {
  const rolesToken = request.auth?.token?.roles;
  if (Array.isArray(rolesToken) && rolesToken.includes('admin')) return true;
  const user = await db.collection('usuarios').doc(requerirUid(request)).get();
  const roles = user.data()?.roles;
  return Array.isArray(roles) && roles.includes('admin');
}

/**
 * Exige rol admin.
 * @param {Firestore} db Firestore.
 * @param {CallableRequest} request Petición.
 * @return {Promise<string>} UID del admin.
 */
export async function requerirAdmin(
  db: Firestore,
  request: CallableRequest
): Promise<string> {
  const uid = requerirUid(request);
  if (!(await esAdmin(db, request))) {
    throw new HttpsError('permission-denied', 'Solo administradores');
  }
  return uid;
}

/**
 * Texto requerido de la petición.
 * @param {unknown} valor Valor recibido.
 * @param {string} campo Nombre del campo.
 * @return {string} Texto.
 */
export function texto(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new HttpsError('invalid-argument', `${campo} es requerido`);
  }
  return valor.trim();
}
