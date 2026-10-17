/**
 * MOCK ADAPTADOR DE PAGO
 * Implementación simulada para desarrollo y tests
 * Cuando implementes Wompi/Mercado Pago, crea WompiAdapter, MercadoPagoAdapter, etc
 * y cambia solo la inyección en la aplicación
 */

import type {
  AdaptadorPago,
  ParametrosPago,
  ResultadoIniciarPago,
  ResultadoConfirmarPago,
} from './AdaptadorPago'

export class MockAdaptador implements AdaptadorPago {
  private pagosRegistrados: Map<string, boolean> = new Map()

  /**
   * Simula inicio de pago
   * En caso real: Se llamaría a Wompi/Mercado Pago API
   */
  async iniciarPago(parametros: ParametrosPago): Promise<ResultadoIniciarPago> {
    const referencia = `TXN-${Date.now()}-${parametros.operacion_id}`

    console.log(
      `[MOCK PAGO] Iniciando pago de $${parametros.monto.toLocaleString()} para operación ${parametros.operacion_id}`
    )

    // Retornar token mock
    return {
      token: `mock-token-${referencia}`,
      referencia,
    }
  }

  /**
   * Simula confirmación de pago
   * Nota: Si referencia contiene 'FAIL', simula pago rechazado
   * Usado en tests para verificar flujo de error
   */
  async confirmarPago(referencia: string): Promise<ResultadoConfirmarPago> {
    // Simular que referencia con 'FAIL' falla
    const exito = !referencia.includes('FAIL')

    if (exito) {
      this.pagosRegistrados.set(referencia, true)
    }

    return {
      exito,
      mensaje: exito ? 'Pago aprobado' : 'Pago rechazado',
      transactionId: exito ? `MOCK-TXN-${referencia}` : undefined,
    }
  }
}
