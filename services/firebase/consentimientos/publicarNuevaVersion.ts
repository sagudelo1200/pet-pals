/**
 * Servicio para publicar nuevas versiones de documentos de consentimiento
 */

import { functions } from '@/firebase.config'
import { httpsCallable } from 'firebase/functions'

export interface ResultadoPublicarVersion {
  exito: boolean
  documento_id?: string // ej: DATOS_PERSONALES_v3
  version?: number
  error?: string
}

export class ServicioPublicarConsentimiento {
  private static readonly callable = httpsCallable(
    functions,
    'publicarNuevaVersion'
  )

  /**
   * Publicar una nueva versión de un documento de consentimiento
   *
   * Realiza:
   * 1. Validación en CF (solo admin)
   * 2. Creación de nuevo documento versionado
   * 3. Desactivación automática de versión anterior
   * 4. Dispara CF alPublicarNuevaVersion para notificar usuarios
   *
   * @param tipo_documento - Tipo: DATOS_PERSONALES, TERMINOS_SERVICIO, etc
   * @param contenido - Contenido en formato Markdown
   * @param titulo - Título legible del documento
   * @returns Resultado con ID del nuevo documento
   */
  static async publicarNuevaVersion(
    tipo_documento: string,
    contenido: string,
    titulo: string
  ): Promise<ResultadoPublicarVersion> {
    try {
      const payload = {
        tipo_documento,
        contenido,
        titulo,
      }

      const response = await this.callable(payload)
      const data = response.data as ResultadoPublicarVersion

      if (data.exito) {
        console.log(
          `[ServicioPublicarConsentimiento] ✅ ${tipo_documento} v${data.version} publicada`
        )
      }

      return data
    } catch (err) {
      const mensajeError =
        err instanceof Error ? err.message : 'Error desconocido'
      console.error('[ServicioPublicarConsentimiento] ❌ Error:', mensajeError)
      return {
        exito: false,
        error: mensajeError,
      }
    }
  }
}
