/**
 * ADAPTADOR DE PAGO (PORT)
 * Interface limpia que define el contrato para cualquier pasarela de pago
 * (Wompi, Mercado Pago, Stripe, etc)
 *
 * Uso: Inyectar implementación concreta al llamar registrarRecaudo/confirmarRecaudo
 * Ventaja: Cambiar pasarela sin tocar la lógica de negocio
 */

export interface ParametrosPago {
  operacion_id: string
  monto: number
  tutor_id: string
}

export interface ResultadoIniciarPago {
  url?: string // URL para redirigir si es link externo
  token?: string // Token si es modal embebido
  referencia: string // ID único de la transacción
}

export interface ResultadoConfirmarPago {
  exito: boolean
  mensaje: string
  transactionId?: string
}

export interface AdaptadorPago {
  /**
   * Inicia solicitud de pago con la pasarela
   * Retorna URL para redirigir o token para mostrar
   */
  iniciarPago(_parametros: ParametrosPago): Promise<ResultadoIniciarPago>

  /**
   * Confirmar pago recibido de pasarela (via webhook o consulta)
   */
  confirmarPago(_referencia: string): Promise<ResultadoConfirmarPago>
}
