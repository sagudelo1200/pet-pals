import { BaseModel } from './BaseModel'

/**
 * Tipos de evaluación soportados en Paw Path
 * - evaluacion_cuidador: Tutor evalúa Cuidador (pública, visible en perfil)
 * - evaluacion_tutor: Cuidador evalúa Tutor (privada, solo coaching)
 * - evaluacion_mascota: Cuidador observa comportamiento de Mascota (privada)
 * - evaluacion_sistema: Sistema evalúa Cuidador (MVP2, solo Cloud Functions)
 */
export type TipoEvaluacion =
  | 'evaluacion_cuidador'
  | 'evaluacion_tutor'
  | 'evaluacion_mascota'
  | 'evaluacion_sistema'

/** Tipos que puede crear un usuario en MVP1 (evaluacion_sistema es reservada) */
export const TIPOS_EVALUACION_USUARIO: TipoEvaluacion[] = [
  'evaluacion_cuidador',
  'evaluacion_tutor',
  'evaluacion_mascota',
]

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
 * Invariantes (validadas en servidor por la callable `crearEvaluacion`):
 * - actor.tipo siempre es 'usuario' en MVP1 (sistema evalúa en MVP2)
 * - objetivo.tipo es 'usuario' (evaluacion_cuidador, evaluacion_tutor) o
 *   'mascota' (evaluacion_mascota)
 * - contexto.tipo siempre es 'paseo' en MVP1
 * - La tripla (actor.id + objetivo.id + contexto.id + tipo) es única por paseo
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

  /**
   * Doble ciego con revelación: `true` cuando ambas partes evaluaron el mismo
   * paseo (marcado por la CF alCrearEvaluacion) o cuando venció el plazo
   * aleatorio de 6/9/12 días (una Cloud Task marca el doc). El evaluado solo
   * puede leer la evaluación del otro si está revelada.
   */
  revelada?: boolean
  /** Timestamp en que el sistema reveló la evaluación (contraparte mutua o ventana). */
  revelada_en?: Date

  /** Datos específicos de la evaluación según su tipo */
  datos: {
    /**
     * Rating 1-5 — SOLO evaluaciones humanas (evaluacion_cuidador y
     * evaluacion_tutor). Prohibido en observaciones de mascota.
     */
    rating?: number
    /** Comentario público (máx 2000 caracteres) — todos los tipos.
     * Puede publicarse en el perfil con atribución contextual. */
    comentario?: string
    /**
     * Feedback PRIVADO (máx 2000): visible SOLO para el evaluado tras la
     * revelación del doble ciego. NUNCA se publica en el perfil ni en las
     * reseñas públicas. Crítica constructiva sin fricción.
     */
    comentario_privado?: string
    /** Observación cualitativa (evaluacion_mascota): ritmo del paseo */
    ritmo?: string
    /** Observación cualitativa (evaluacion_mascota): comportamiento con otros */
    compania?: string
    /** Observación cualitativa (evaluacion_mascota): reacción a estímulos */
    tolerancia?: string
    /** Campos adicionales según tipo (futuro) */
    [key: string]: unknown
  }
}

/**
 * Ejemplos de evaluaciones válidas (contrato v2):
 *
 * 1. Tutor evalúa Cuidador (evaluacion_cuidador)
 *    {
 *      tipo: 'evaluacion_cuidador',
 *      actor: {tipo: 'usuario', id: 'tutor_uid_123'},
 *      objetivo: {tipo: 'usuario', id: 'cuidador_uid_456'},
 *      contexto: {tipo: 'paseo', id: 'paseo_abc789'},
 *      datos: {rating: 5, comentario: 'Excelente con mi perro'}
 *    }
 *
 * 2. Cuidador evalúa Tutor (evaluacion_tutor, privado)
 *    {
 *      tipo: 'evaluacion_tutor',
 *      actor: {tipo: 'usuario', id: 'cuidador_uid_456'},
 *      objetivo: {tipo: 'usuario', id: 'tutor_uid_123'},
 *      contexto: {tipo: 'paseo', id: 'paseo_abc789'},
 *      datos: {rating: 4, comentario: 'Instrucciones claras'}
 *    }
 *
 * 3. Cuidador observa Mascota (evaluacion_mascota, privado, SIN rating)
 *    {
 *      tipo: 'evaluacion_mascota',
 *      actor: {tipo: 'usuario', id: 'cuidador_uid_456'},
 *      objetivo: {tipo: 'mascota', id: 'mascota_uid_789'},
 *      contexto: {tipo: 'paseo', id: 'paseo_abc789'},
 *      datos: {
 *        ritmo: 'tranquilo',
 *        compania: 'solo',
 *        tolerancia: 'ignora',
 *        comentario: 'Se portó muy bien'
 *      }
 *    }
 */
