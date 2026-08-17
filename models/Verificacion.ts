import { BaseModel } from './BaseModel'

/**
 * Tipos de verificación que puede tener un usuario.
 * Escalable: permite agregar nuevos tipos sin cambiar schema.
 */
export type TipoVerificacion =
  | 'EMAIL'
  | 'IDENTIDAD'
  | 'CERTIFICADO'
  | 'ANTECEDENTES'
  | 'TELEFONO'
  | 'DOMICILIO'
  | 'FORMACION'

/**
 * Estados posibles de una verificación.
 * Soporta workflows complejos: aprobación, rechazo, expiración, revocación.
 */
export type EstadoVerificacion =
  | 'PENDIENTE'
  | 'EN_REVISION'
  | 'VERIFICADO'
  | 'RECHAZADO'
  | 'EXPIRADO'
  | 'REVOCADO'

/**
 * Método usado para verificar.
 * Permite cambiar entre manual, automático, y proveedores externos.
 */
export type MetodoVerificacion = 'MANUAL' | 'AUTOMATICO' | 'PROVEEDOR'

/**
 * Proveedor externo de verificación (si aplica).
 * Usado cuando metodo = 'PROVEEDOR'.
 */
export type ProveedorVerificacion = 'sumsub' | 'veriff' | 'onfido' | 'custom'

/**
 * Resultado técnico granular de una verificación.
 * Permite almacenar detalles específicos del tipo.
 */
export interface ResultadoVerificacion {
  documento?: 'OK' | 'ERROR' | 'RECHAZADO'
  rostro?: 'OK' | 'ERROR' | 'RECHAZADO'
  coincidencia?: 'OK' | 'ERROR' | 'RECHAZADO'
  [key: string]: string | undefined
}

/**
 * Evidencias recolectadas durante la verificación.
 * Solo flags booleanos; archivos se almacenan separadamente.
 */
export interface EvidenciasVerificacion {
  documento?: boolean
  selfie?: boolean
  [key: string]: boolean | undefined
}

/**
 * Datos específicos de una verificación de identidad.
 * Flexible para agregar más campos según tipo.
 */
export interface DatosVerificacion {
  tipo_documento?: string
  nombre_verificado?: boolean
  fecha_nacimiento_verificada?: boolean
  [key: string]: any
}

/**
 * MÁQUINA DE ESTADOS: Transiciones válidas entre estados de verificación.
 *
 * Define exactamente qué transiciones están permitidas.
 * Las Cloud Functions DEBEN validar contra esto antes de actualizar estado.
 *
 * Diagrama:
 * PENDIENTE → EN_REVISION → VERIFICADO ✓
 *         ↘             ↘ RECHAZADO → PENDIENTE (reintentar)
 *          ↘             ↘ EXPIRADO
 *           → EXPIRADO
 *
 * VERIFICADO → REVOCADO (revocación por admin)
 *           → EXPIRADO (si vence_en se cumple)
 *           → EN_REVISION (revalidación: cambios en datos, renovación, etc.)
 *
 * RECHAZADO → EXPIRADO (si no se reintentatempo)
 * EXPIRADO → (terminal, sin transiciones)
 * REVOCADO → (terminal, sin transiciones)
 */
export const TRANSICIONES_VALIDAS: Record<
  EstadoVerificacion,
  EstadoVerificacion[]
> = {
  PENDIENTE: ['EN_REVISION', 'EXPIRADO', 'RECHAZADO'],
  EN_REVISION: ['VERIFICADO', 'RECHAZADO', 'EXPIRADO'],
  VERIFICADO: ['REVOCADO', 'EXPIRADO', 'EN_REVISION'],
  RECHAZADO: ['PENDIENTE', 'EXPIRADO'],
  EXPIRADO: [],
  REVOCADO: [],
}

/**
 * Valida si una transición de estado es permitida.
 * Uso: en Cloud Functions antes de updatear estado.
 *
 * @param estadoActual - Estado previo
 * @param estadoNuevo - Estado solicitado
 * @returns true si la transición es válida
 */
export function transicionValida(
  estadoActual: EstadoVerificacion,
  estadoNuevo: EstadoVerificacion
): boolean {
  return TRANSICIONES_VALIDAS[estadoActual].includes(estadoNuevo)
}

/**
 * Valida si una revalidación puede ser aprobada con el método especificado.
 * Restricción: Las revalidaciones SOLO se aprueban manualmente, nunca automáticamente.
 *
 * @param esRevalidacion - ¿Es esta una revalidación?
 * @param metodo - Método usado para aprobar
 * @returns true si la combinación es válida
 */
export function revalidacionValida(
  esRevalidacion: boolean,
  metodo: MetodoVerificacion
): boolean {
  // Si es revalidación, SOLO permite aprobación manual
  if (esRevalidacion && metodo !== 'MANUAL') {
    return false
  }
  return true
}

/**
 * Razón por la que una verificación cambió de estado.
 * Usada en auditoría: quién y por qué cambió.
 */
export type RazonTransicion =
  | 'inicio_verificacion'
  | 'aprobacion_manual'
  | 'rechazo_manual'
  | 'rechazo_automatico'
  | 'expiracion_timeout'
  | 'expiracion_vencimiento'
  | 'revocacion_admin'
  | 'reintentar_usuario'
  | 'revalidacion_requerida'

/**
 * Modelo central de auditoría y verificación.
 * Una instancia = una verificación de un usuario de un tipo específico.
 *
 * Arquitectura:
 * - Cada verificación es un documento independiente
 * - Permite historial (usuario puede tener múltiples verificaciones del mismo tipo)
 * - Auditoría completa: quién aprobó, cuándo, por qué se rechazó
 * - Escalable: soporta nuevos tipos sin cambios estructurales
 */
export interface Verificacion extends BaseModel {
  /**
   * ID del usuario verificado.
   * Denormalizado para permitir queries rápidas.
   */
  usuario_id: string

  /**
   * Tipo de verificación realizada.
   * Ejemplo: EMAIL, IDENTIDAD, CERTIFICADO, ANTECEDENTES, etc.
   */
  tipo: TipoVerificacion

  /**
   * Estado actual de esta verificación.
   * Ejemplo: PENDIENTE → EN_REVISION → VERIFICADO
   */
  estado: EstadoVerificacion

  /**
   * Método usado para verificar.
   * Permite cambiar entre manual y automático.
   */
  metodo: MetodoVerificacion

  /**
   * Proveedor externo (si metodo = 'PROVEEDOR').
   * Ejemplo: 'sumsub', 'veriff', etc.
   */
  proveedor?: ProveedorVerificacion

  /**
   * Versión de la verificación.
   * Usado si el usuario re-verifica (ej: renovación).
   * Incrementa: 1, 2, 3, etc.
   */
  version: number

  /**
   * ¿Esta verificación es una revalidación de una anterior?
   * Usado para workflows especiales: renovación, cambio de datos, reinspección.
   *
   * Restricción: Si es revalidación, SOLO puede aprobarse mediante MANUAL,
   * nunca automáticamente. Esto fuerza revisión humana.
   */
  es_revalidacion?: boolean

  /**
   * Resultado técnico granular.
   * Almacena detalles específicos del tipo de verificación.
   * Ejemplo: { documento: 'OK', rostro: 'OK', coincidencia: 'OK' }
   */
  resultado?: ResultadoVerificacion

  /**
   * Qué evidencias se verificaron.
   * Solo flags; los archivos se almacenan en storage separado.
   * Ejemplo: { documento: true, selfie: true }
   */
  evidencias?: EvidenciasVerificacion

  /**
   * Datos específicos según tipo.
   * Flexible: permite agregar campos sin cambiar schema.
   * Ejemplo: { tipo_documento: 'CC', nombre_verificado: true }
   */
  datos?: DatosVerificacion

  /**
   * Timestamp cuando fue verificado (aprobado).
   * Null si aún no está verificado.
   */
  verificado_en?: Date

  /**
   * Timestamp de expiración de la verificación.
   * Null si no vence.
   * Ejemplo: certificados pueden expirar en 1 año.
   */
  vence_en?: Date

  /**
   * UID del admin/revisor que aprobó o rechazó.
   * Auditoría: responder "¿Quién aprobó esto?"
   */
  revisado_por?: string

  /**
   * Motivo del rechazo (si estado = RECHAZADO).
   * Informativo para el usuario.
   */
  motivo_rechazo?: string

  /**
   * Razón por la que sucedió la última transición de estado.
   * Auditoría: quién cambió y por qué.
   * Ejemplo: 'aprobacion_manual', 'expiracion_timeout', 'revocacion_admin'
   */
  razon_transicion?: RazonTransicion

  /**
   * Comentario adicional del revisor.
   * Para contexto que no entra en motivo_rechazo.
   * Ejemplo: "Documento ilegible, solicitar reintentar con foto más clara"
   */
  comentario_revisor?: string
}
