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

/** Códigos de Firebase cuyo texto del servidor es genérico: se muestra traducido. */
const CODIGOS_GENERICOS = [
  'permission-denied',
  'unauthenticated',
  'not-found',
  'unavailable',
  'deadline-exceeded',
  'resource-exhausted',
  'internal',
]

/**
 * Mensaje legible de un error de callable. Los códigos genéricos se traducen;
 * en el resto (validaciones del servidor) se muestra el texto que envió.
 */
export function mensajeErrorCallable(error: unknown): string {
  const codigo = (error as { code?: string } | null)?.code?.replace(
    'functions/',
    ''
  )
  if (codigo && CODIGOS_GENERICOS.includes(codigo)) {
    return i18n.t(`errores:callable.${codigo}`)
  }
  return error instanceof Error
    ? error.message
    : i18n.t('errores:error_desconocido')
}
