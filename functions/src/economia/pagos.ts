/* eslint-disable camelcase */
/**
 * Puerto de pasarela de pago. La lógica de negocio solo conoce esta interfaz;
 * cambiar de proveedor (mock → Wompi) es agregar un adaptador y elegirlo con
 * la variable de entorno PROVEEDOR_PAGO.
 *
 * El servidor nunca confía en el cliente: la confirmación siempre consulta a
 * la pasarela por la referencia guardada al iniciar el pago.
 *
 * La referencia la genera Paw-Path (no la pasarela) y es única por intento
 * de pago: el adaptador debe ser idempotente por referencia, así un
 * reintento nunca crea dos cobros (Wompi acepta la referencia del comercio).
 */

export interface SolicitudPago {
  referencia: string
  operacion_id: string
  tutor_id: string
  monto: number
  descripcion: string
}

export interface PagoIniciado {
  /** URL de checkout si la pasarela redirige (Wompi); el mock no la usa. */
  url?: string
}

export interface EstadoPago {
  estado: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE'
  transaccion_id?: string
  mensaje?: string
}

export interface AdaptadorPago {
  readonly proveedor: string
  iniciarPago(solicitud: SolicitudPago): Promise<PagoIniciado>
  consultarPago(referencia: string): Promise<EstadoPago>
}

/**
 * Pasarela simulada: aprueba todo pago salvo referencias que contengan FAIL.
 */
export class MockAdaptadorPago implements AdaptadorPago {
  readonly proveedor = 'MOCK';

  /**
   * @param {SolicitudPago} solicitud Datos del cobro.
   * @return {Promise<PagoIniciado>} Sin URL: el mock no redirige.
   */
  async iniciarPago(solicitud: SolicitudPago): Promise<PagoIniciado> {
    if (!solicitud.referencia) throw new Error('referencia requerida');
    return {};
  }

  /**
   * @param {string} referencia Referencia del pago.
   * @return {Promise<EstadoPago>} Resultado simulado.
   */
  async consultarPago(referencia: string): Promise<EstadoPago> {
    if (referencia.includes('FAIL')) {
      return {estado: 'RECHAZADO', mensaje: 'Pago rechazado (simulado)'};
    }
    return {estado: 'APROBADO', transaccion_id: `MOCK-TXN-${referencia}`};
  }
}

/**
 * Adaptador configurado (PROVEEDOR_PAGO, por defecto MOCK).
 * @return {AdaptadorPago} Adaptador.
 */
export function obtenerAdaptadorPago(): AdaptadorPago {
  const proveedor = (process.env.PROVEEDOR_PAGO || 'MOCK').toUpperCase();
  if (proveedor === 'MOCK') return new MockAdaptadorPago();
  // Wompi: implementar WompiAdaptadorPago (checkout + consulta de transacción)
  throw new Error(`Proveedor de pago no soportado: ${proveedor}`);
}
