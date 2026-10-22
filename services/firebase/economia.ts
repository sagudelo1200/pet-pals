/**
 * Acceso del app al motor económico.
 * - La política comercial se lee con el versionado genérico
 *   (services/firebase/versionado.ts, tipo `politica_comercial`).
 * - Escrituras solo vía Cloud Functions (functions/src/economia/funciones.ts):
 *   las reglas no permiten que el cliente escriba nada económico.
 */
import { llamarCallable as llamar, mensajeErrorCallable } from './callable'

export type EstadoPago = 'APROBADO' | 'RECHAZADO' | 'PENDIENTE'

export const ServicioEconomia = {
  /** El tutor inicia el pago de su operación (devuelve url si la pasarela redirige). */
  iniciarPago: llamar<
    { operacionId: string },
    { referencia: string; url?: string; monto: number }
  >('iniciarPagoOperacion'),

  /** Consulta a la pasarela y registra el recaudo si está aprobado. */
  confirmarPago: llamar<
    { operacionId: string },
    { estado: EstadoPago; mensaje?: string }
  >('confirmarPagoOperacion'),

  /** Admin: genera las liquidaciones con corte en este momento. */
  generarLiquidaciones: llamar<Record<string, never>, { creadas: string[] }>(
    'generarLiquidacionesAhora'
  ),

  /** Admin: registra la transferencia de una liquidación. */
  pagarLiquidacion: llamar<
    { liquidacionId: string; referencia: string },
    { ok: boolean; documentos: string[] }
  >('pagarLiquidacion'),

  /** Admin: reintenta reflejar un documento contable en el sistema contable. */
  reenviarDocumento: llamar<{ documentoId: string }, { estado: string }>(
    'reenviarDocumentoContable'
  ),
}

/** Mensaje legible de un error de callable. */
export const mensajeErrorEconomia = mensajeErrorCallable
