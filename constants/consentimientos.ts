/* eslint-disable no-unused-vars */
/**
 * Tipos de consentimiento soportados en Paw-Path
 * Usados en documentos_consentimientos/ y validación
 */

export enum TipoConsentimiento {
  // Obligatorios
  TERMINOS_SERVICIO = 'TERMINOS_SERVICIO',
  DATOS_PERSONALES = 'DATOS_PERSONALES',

  // Opcionales
  MARKETING_COMUNICACIONES = 'MARKETING_COMUNICACIONES',
}

/**
 * Metadatos de cada tipo de consentimiento
 * Facilita la iteración sobre consentimientos en UI
 */
export const CONSENTIMIENTOS_METADATOS: Record<
  TipoConsentimiento,
  {
    titulo: string
    descripcion: string
    obligatorio: boolean
    reconfirmacion_meses: number | null
    contexto: string // Dónde aparece en la app
  }
> = {
  [TipoConsentimiento.TERMINOS_SERVICIO]: {
    titulo: 'Términos de Servicio',
    descripcion: 'Autorizo el uso de Paw-Path bajo los términos de servicio',
    obligatorio: true,
    reconfirmacion_meses: null, // Indefinido
    contexto: 'login',
  },

  [TipoConsentimiento.DATOS_PERSONALES]: {
    titulo: 'Tratamiento de Datos Personales',
    descripcion:
      'Autorizo el procesamiento de mis datos personales para crear mi perfil',
    obligatorio: true,
    reconfirmacion_meses: 12, // Reconfirmar cada año
    contexto: 'registro',
  },

  [TipoConsentimiento.MARKETING_COMUNICACIONES]: {
    titulo: 'Comunicaciones de Marketing',
    descripcion:
      'Deseo recibir ofertas, novedades y comunicaciones de Paw-Path',
    obligatorio: false,
    reconfirmacion_meses: null,
    contexto: 'settings',
  },
}

/**
 * Obtener lista de consentimientos obligatorios
 */
export function obtenerObligatorios(): TipoConsentimiento[] {
  return Object.entries(CONSENTIMIENTOS_METADATOS)
    .filter(([_, meta]) => meta.obligatorio)
    .map(([tipo]) => tipo as TipoConsentimiento)
}

/**
 * Obtener lista de consentimientos opcionales
 */
export function obtenerOpcionales(): TipoConsentimiento[] {
  return Object.entries(CONSENTIMIENTOS_METADATOS)
    .filter(([_, meta]) => !meta.obligatorio)
    .map(([tipo]) => tipo as TipoConsentimiento)
}

/**
 * Obtener metadatos de un consentimiento
 */
export function obtenerMetadatos(
  tipo: TipoConsentimiento
): (typeof CONSENTIMIENTOS_METADATOS)[TipoConsentimiento] | undefined {
  return CONSENTIMIENTOS_METADATOS[tipo]
}
