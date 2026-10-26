import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase.config'
import { i18n } from '@/services/i18n'

/**
 * Crea una función que invoca un callable de Cloud Functions y devuelve su
 * respuesta. El callable se crea en cada llamada porque `functions` se
 * inicializa junto con la app.
 */
export const llamarCallable =
  <E, S>(nombre: string) =>
  async (datos: E): Promise<S> =>
    (await httpsCallable<E, S>(functions, nombre)(datos)).data

/** Mensaje legible de un error de callable. */
export function mensajeErrorCallable(error: unknown): string {
  return error instanceof Error
    ? error.message
    : i18n.t('errores:error_desconocido')
}
