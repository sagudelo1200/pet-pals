/**
 * Error de negocio con un código compatible con HttpsError: los callables lo
 * traducen tal cual para que la app reciba un mensaje y código claros.
 */
export type CodigoErrorNegocio =
  | 'not-found'
  | 'permission-denied'
  | 'failed-precondition'
  | 'invalid-argument';

/** Error de negocio traducible a HttpsError. */
export class ErrorNegocio extends Error {
  /**
   * @param {CodigoErrorNegocio} codigo Código HttpsError.
   * @param {string} message Mensaje legible.
   */
  constructor(readonly codigo: CodigoErrorNegocio, message: string) {
    super(message);
  }
}
