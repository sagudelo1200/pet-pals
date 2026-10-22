import { BaseModel } from './BaseModel'
import type { ContenidoConsentimiento } from '@/functions/src/compartido/consentimiento'

/**
 * ESTADO DE CONSENTIMIENTO
 * Estados válidos que puede tener un consentimiento
 */
export type EstadoConsentimiento = 'ACEPTADO' | 'RECHAZADO' | 'REVOCADO'

/**
 * ESTADO BASE (incluyendo inicial)
 * Usado para máquina de estados
 */
export type EstadoBase = 'SIN_EVENTOS' | EstadoConsentimiento

/**
 * MOTIVO DE NO VIGENCIA
 * Explicación de POR QUÉ un consentimiento dejó de ser vigente.
 * Se calcula dinámicamente por la función `evaluador()`.
 * Se usa en UI para mostrar al usuario POR QUÉ necesita reconfirmar.
 */
export type MotivoNoVigencia =
  'RECHAZADO' | 'REVOCADO' | 'EXPIRADO' | 'VERSION_DESACTUALIZADA'

/**
 * DOCUMENTO DE CONSENTIMIENTO (Versión vigente)
 *
 * Cada tipo es una serie del versionado genérico:
 * versionados/consentimiento_{TIPO}/versiones/v{n} (inmutables).
 * El contenido se valida en functions/src/compartido/consentimiento.ts.
 */
export interface DocumentoConsentimiento extends ContenidoConsentimiento {
  /** Tipo de consentimiento: DATOS_PERSONALES, TERMINOS_SERVICIO, etc. */
  tipo_documento: string
  /** Referencia exacta a la versión: "consentimiento_DATOS_PERSONALES/v2" */
  documento_id: string
  /** Número de versión: 1, 2, 3, ... */
  version: number
  /** Hash SHA-256 del contenido (evidencia de qué se aceptó) */
  hash: string
}

/**
 * EVENTO DE CONSENTIMIENTO
 *
 * Cada acción del usuario (aceptar/rechazar/revocar) genera un evento inmutable.
 * Nunca se actualiza, solo se crea una vez.
 *
 * Estructura Firestore:
 * consentimientos/{evento_id}
 *
 * Propósito: Crear un historial legal de consentimientos que puede ser auditado
 */
export interface Consentimiento extends BaseModel {
  /** ID del usuario que generó este evento */
  usuario_id: string

  /** Tipo de documento: DATOS_PERSONALES, TERMINOS, etc. */
  tipo_documento: string

  /** Estado: ACEPTADO, RECHAZADO o REVOCADO */
  estado: EstadoConsentimiento

  /**
   * Referencia al documento que se aceptó/rechazó
   * Ej: "consentimiento_DATOS_PERSONALES/v2"
   * Permite saber exactamente qué versión vio el usuario
   */
  documento_id: string

  /** Número de versión del documento */
  version_documento: number

  /**
   * Hash SHA-256 del documento aceptado
   * Evidencia criptográfica de qué contenido se aceptó
   */
  hash_documento: string

  /** Timestamp exacto del evento */
  fecha_evento: Date

  /**
   * Cuándo requiere reconfirmación (solo para ACEPTADO)
   *
   * Se calcula así en Cloud Function:
   * - Si estado === 'ACEPTADO' Y documento.requiere_reconfirmacion_meses
   * - fecha_proxima_reconfirmacion = ahora + meses (sumMesesCalendario)
   * - Si estado === 'RECHAZADO' o 'REVOCADO'
   * - fecha_proxima_reconfirmacion = null (no aplica)
   *
   * Usado por evaluador para determinar si está EXPIRADO
   */
  fecha_proxima_reconfirmacion?: Date

  /**
   * Auditoría del lado servidor
   * Capturada en la Cloud Function
   */
  servidor?: {
    /** Timestamp del servidor cuando se registró */
    timestamp: Date
    /** User-Agent del navegador/app del usuario */
    user_agent?: string
    /** IP del usuario (best-effort) */
    ip?: string
  }

  /**
   * Auditoría del lado cliente
   * Enviada por la app en el payload de la petición
   */
  cliente?: {
    /** Dispositivo: iOS, Android, Web */
    dispositivo?: string
    /** Idioma del usuario: es-CO, en-US, etc. */
    idioma?: string
    /** Zona horaria: America/Bogota */
    timezone?: string
  }
}

/**
 * ESTADO ACTUAL DEL CONSENTIMIENTO (Proyección)
 *
 * Desnormalización del último evento para lectura rápida.
 * Se actualiza en TRANSACCIÓN junto con la creación del evento.
 *
 * Estructura Firestore (como subcampo):
 * usuarios/{uid}.consentimientos_estado_actual.DATOS_PERSONALES
 *
 * Propósito: Evitar queries a consentimientos/ para conocer el estado vigente
 * y detectar si el documento cambió de versión (VERSION_DESACTUALIZADA).
 */
export interface ConsentimientoEstadoActual {
  /** Tipo de documento: DATOS_PERSONALES, TERMINOS, etc. */
  tipo_documento: string

  /** Estado actual: ACEPTADO, RECHAZADO o REVOCADO */
  estado: EstadoConsentimiento

  /** Referencia al documento versión que aceptó el usuario */
  documento_id: string

  /** Versión del documento que aceptó el usuario */
  version_documento: number

  /** Timestamp del evento */
  fecha_evento: Date

  /** Cuándo requiere reconfirmación (null si no aplica) */
  fecha_proxima_reconfirmacion?: Date

  /** Hash del documento para auditoría */
  hash_documento: string

  /**
   * ¿El documento que aceptó sigue siendo la versión activa hoy?
   * false → hay VERSION_DESACTUALIZADA (el user debe reconfirmar con nueva versión)
   * true → el documento sigue siendo el vigente
   *
   * Se recalcula cada vez que:
   * 1. Se publica nueva versión de documento (admin marca anterior como activo:false)
   * 2. Context carga estado del usuario
   * 3. Se ejecuta evaluarVigencia() en logic/consentimientos/evaluador.ts
   */
  es_documento_vigente_hoy: boolean
}

/**
 * MÁQUINA DE ESTADOS
 *
 * Define transiciones válidas entre estados
 * Usado en la Cloud Function para validar que el cambio es permitido
 */
export const TRANSICIONES_VALIDAS: Record<EstadoBase, EstadoConsentimiento[]> =
  {
    SIN_EVENTOS: ['ACEPTADO', 'RECHAZADO'],
    ACEPTADO: ['REVOCADO', 'ACEPTADO'], // Puede re-aceptar la misma versión
    RECHAZADO: ['ACEPTADO'],
    REVOCADO: ['ACEPTADO'],
  }

/**
 * Validar si una transición de estado es permitida
 *
 * @param estadoActual - Estado actual del consentimiento
 * @param nuevoEstado - Estado al que se quiere pasar
 * @returns true si la transición es válida, false en caso contrario
 *
 * Ejemplos permitidos:
 * - SIN_EVENTOS → ACEPTADO ✅
 * - SIN_EVENTOS → RECHAZADO ✅
 * - ACEPTADO → REVOCADO ✅
 * - ACEPTADO → ACEPTADO ✅ (reconfirmación)
 * - RECHAZADO → ACEPTADO ✅ (revierte rechazo)
 * - REVOCADO → ACEPTADO ✅ (reactivación)
 *
 * Ejemplos NO permitidos:
 * - RECHAZADO → REVOCADO ❌
 * - REVOCADO → RECHAZADO ❌
 * - ACEPTADO → RECHAZADO ❌
 */
export function transicionValida(
  estadoActual: EstadoBase,
  nuevoEstado: EstadoConsentimiento
): boolean {
  const validas = TRANSICIONES_VALIDAS[estadoActual] || []
  return validas.includes(nuevoEstado)
}
