/**
 * Acceso del app al motor económico.
 * - Lecturas directas (la política comercial es pública para usuarios autenticados).
 * - Escrituras solo vía Cloud Functions (functions/src/economia/funciones.ts):
 *   las reglas no permiten que el cliente escriba nada económico.
 */
import { doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/firebase.config'
import type {
  DatosPoliticaComercial,
  PoliticaComercial,
} from '@/models/operacionesEconomicas'

/** Lee una versión de la política comercial. */
export async function obtenerPolitica(
  version: number
): Promise<PoliticaComercial> {
  const snap = await getDoc(doc(db, 'politicas_comerciales', `v${version}`))
  if (!snap.exists()) throw new Error(`Política comercial v${version} no existe`)
  return snap.data() as PoliticaComercial
}

/**
 * Escucha la política vigente; avisa con null si no hay ninguna publicada.
 * Devuelve la función para dejar de escuchar.
 */
export function escucharPoliticaVigente(
  alCambiar: (_politica: PoliticaComercial | null) => void,
  alFallar: (_error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'configuracion', 'comercial'),
    snap => {
      const version = snap.data()?.version_vigente
      if (typeof version !== 'number') {
        alCambiar(null)
        return
      }
      obtenerPolitica(version).then(alCambiar, alFallar)
    },
    alFallar
  )
}

// El callable se crea en cada llamada: `functions` se inicializa con la app
const llamar =
  <E, S>(nombre: string) =>
  async (datos: E): Promise<S> =>
    (await httpsCallable<E, S>(functions, nombre)(datos)).data

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

  /** Admin: publica una nueva versión de la política comercial. */
  publicarPolitica: llamar<DatosPoliticaComercial, { version: number }>(
    'publicarPoliticaComercial'
  ),

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
export function mensajeErrorEconomia(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido'
}
