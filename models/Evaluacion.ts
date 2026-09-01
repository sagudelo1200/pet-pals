import { BaseModel } from './BaseModel'

/**
 * Tipos de evaluación soportados en Paw Path
 * - evaluacion_cuidador: Tutor evalúa Cuidador (pública, visible en perfil)
 * - evaluacion_tutor: Cuidador evalúa Tutor (privada, solo coaching)
 * - evaluacion_mascota: Cuidador observa comportamiento de Mascota (privada)
 * - evaluacion_sistema: Sistema evalúa Cuidador (MVP2)
 */
export type TipoEvaluacion =
  | 'evaluacion_cuidador'
  | 'evaluacion_tutor'
  | 'evaluacion_mascota'
  | 'evaluacion_sistema'

/**
 * Referencia genérica a entidad del dominio Paw Path
 * Usada para identificar actores, objetivos y contextos de evaluación
 */
export interface ReferenciaSistema {
  /** Tipo de entidad: usuario, mascota o paseo */
  tipo: 'usuario' | 'mascota' | 'paseo'
  /** Identificador único: UID para usuario/mascota, ID de documento para paseo */
  id: string
}

/**
 * Evaluación individual de confianza
 * Representa la opinión/observación de un actor sobre un objetivo en un contexto (paseo)
 *
 * Invariantes:
 * - actor.tipo siempre es 'usuario' en MVP1 (sistema evalúa en MVP2)
 * - objetivo.tipo es 'usuario' (evaluacion_cuidador, evaluacion_tutor) o 'mascota' (evaluacion_mascota)
 * - contexto.tipo siempre es 'paseo' en MVP1
 * - La tripla (actor.id + objetivo.id + contexto.id) es única por paseo
 *   (permite múltiples evaluaciones entre mismo actor/objetivo en diferentes paseos)
 */
export interface Evaluacion extends BaseModel {
  /** Tipo de evaluación que determina la estructura de datos */
  tipo: TipoEvaluacion

  /** Quién evalúa (siempre usuario en MVP1) */
  actor: ReferenciaSistema

  /** Qué o quién es evaluado (usuario o mascota) */
  objetivo: ReferenciaSistema

  /** En qué contexto ocurre (siempre paseo en MVP1) */
  contexto: ReferenciaSistema

  /** Datos específicos de la evaluación según su tipo */
  datos: {
    /** Rating 1-5 para evaluaciones humanas */
    rating?: number
    /** Comentario opcional (MVP2) */
    comentario?: string
    /** Campos específicos según tipo */
    [key: string]: unknown
  }
}

/**
 * Ejemplos de evaluaciones válidas:
 *
 * 1. Tutor evalúa Cuidador (evaluacion_cuidador)
 *    {
 *      tipo: 'evaluacion_cuidador',
 *      actor: {tipo: 'usuario', id: 'tutor_uid_123'},
 *      objetivo: {tipo: 'usuario', id: 'cuidador_uid_456'},
 *      contexto: {tipo: 'paseo', id: 'paseo_abc789'},
 *      datos: {rating: 5}
 *    }
 *
 * 2. Cuidador evalúa Tutor (evaluacion_tutor, privado)
 *    {
 *      tipo: 'evaluacion_tutor',
 *      actor: {tipo: 'usuario', id: 'cuidador_uid_456'},
 *      objetivo: {tipo: 'usuario', id: 'tutor_uid_123'},
 *      contexto: {tipo: 'paseo', id: 'paseo_abc789'},
 *      datos: {rating: 4}
 *    }
 *
 * 3. Cuidador observa Mascota (evaluacion_mascota, privado)
 *    {
 *      tipo: 'evaluacion_mascota',
 *      actor: {tipo: 'usuario', id: 'cuidador_uid_456'},
 *      objetivo: {tipo: 'mascota', id: 'mascota_uid_789'},
 *      contexto: {tipo: 'paseo', id: 'paseo_abc789'},
 *      datos: {
 *        ritmo: 'tranquilo',
 *        compania: 'solo',
 *        tolerancia: 'ignora'
 *      }
 *    }
 */
