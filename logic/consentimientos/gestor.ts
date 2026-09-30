import {
  ServicioDocumentoConsentimiento,
  ServicioConsentimiento,
  ServicioEstadoConsentimientoUsuario,
} from '@/services/firebase'
import type {
  DocumentoConsentimiento,
  ConsentimientoEstadoActual,
} from '@/models/Consentimiento'
import { CrudResult } from '@/services/firebase/comun'

/**
 * GestorConsentimientos
 *
 * Centraliza lógica de negocio de consentimientos.
 * - Validación de documentos vigentes
 * - Obtención de estado actual
 * - Escucha de cambios en tiempo real
 *
 * NO accede directamente a Firestore; usa servicios.
 */
export const GestorConsentimientos = {
  /**
   * Obtener documento vigente de un tipo
   */
  async obtenerDocumentoVigente(
    tipo_documento: string
  ): Promise<CrudResult<DocumentoConsentimiento>> {
    return ServicioDocumentoConsentimiento.obtenerVigente(tipo_documento)
  },

  /**
   * Obtener estado actual de consentimiento del usuario
   */
  async obtenerConsentimientoActual(
    uid: string,
    tipo_documento: string
  ): Promise<CrudResult<ConsentimientoEstadoActual>> {
    return ServicioEstadoConsentimientoUsuario.obtenerConsentimientoActual(
      uid,
      tipo_documento
    )
  },

  /**
   * Obtener todos los consentimientos vigentes del usuario
   */
  async obtenerConsentimientosActuales(
    uid: string
  ): Promise<CrudResult<Record<string, ConsentimientoEstadoActual>>> {
    return ServicioEstadoConsentimientoUsuario.obtenerConsentimientosActuales(
      uid
    )
  },

  /**
   * Escuchar cambios en tiempo real en consentimientos del usuario
   */
  escucharConsentimientosActuales(
    uid: string,
    callback: (
      _consentimientos: Record<string, ConsentimientoEstadoActual> | null
    ) => void,
    onError?: (_error: Error) => void
  ) {
    return ServicioConsentimiento.escucharConsentimientosActuales(
      uid,
      callback,
      onError
    )
  },

  /**
   * Obtener el último evento (para validar transiciones)
   */
  async obtenerUltimoEvento(uid: string, tipo_documento: string) {
    return ServicioConsentimiento.obtenerUltimoEvento(uid, tipo_documento)
  },

  /**
   * Obtener historial completo de consentimientos del usuario
   */
  async obtenerHistorial(uid: string, tipo_documento: string) {
    return ServicioConsentimiento.obtenerHistorial(uid, tipo_documento)
  },
}
