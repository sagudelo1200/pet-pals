import { BaseModel } from './BaseModel'
import { ReferenciaSistema } from './Evaluacion'

/**
 * Desglose de evaluaciones de un tipo específico
 * Usado en ResumenEvaluacion para separar métricas por tipo
 */
export interface DesglosePorTipo {
  /** Promedio aritmético de ratings (1-5) */
  promedio: number
  /** Cantidad total de evaluaciones de este tipo */
  cantidad: number
}

/**
 * Resumen agregado de evaluaciones para un objetivo
 * FUENTE DE VERDAD para reputación/confianza en Paw Path
 *
 * Estructura EXPLÍCITA (no diccionario genérico by_type) por legibilidad y precisión semántica.
 * Cada propiedad tiene significado claro:
 * - evaluaciones_cuidador: Lo que tutores dicen del cuidador (PÚBLICO)
 * - evaluaciones_tutor: Lo que cuidadores dicen del tutor (PRIVADO, coaching)
 * - evaluaciones_mascota: Observaciones sobre comportamiento (PRIVADO)
 * - evaluaciones_sistema: Métricas automáticas de desempeño (MVP2, INDEPENDIENTE)
 *
 * INVARIANTE CRÍTICO:
 * - Nunca existe "promedio general" que mezcle tipos
 * - Cada tipo es independiente y tiene su propio significado
 * - Paw-Path decide qué mostrar públicamente, no se mezclan automáticamente
 */
export interface ResumenEvaluacion extends BaseModel {
  /** Referencia al usuario/mascota que es objetivo de estas evaluaciones */
  objetivo: ReferenciaSistema

  /**
   * Evaluaciones de Tutor → Cuidador
   * Métrica PÚBLICA: visible en perfiles de cuidadores para buscar y matching
   * Responde: ¿Qué tan confiable es este cuidador?
   *
   * Ejemplo: {promedio: 4.6, cantidad: 15}
   * Significado: 15 tutores han evaluado al cuidador con promedio 4.6 ⭐
   */
  evaluaciones_cuidador?: DesglosePorTipo

  /**
   * Evaluaciones de Cuidador → Tutor
   * Métrica PRIVADA: usada internamente para coaching e insights
   * Responde: ¿Qué tan claros son los tutores en instrucciones?
   *
   * Ejemplo: {promedio: 4.3, cantidad: 12}
   * Significado: 12 cuidadores han evaluado al tutor con promedio 4.3 ⭐
   * (oculto para el tutor, visible solo a admin para mejora)
   */
  evaluaciones_tutor?: DesglosePorTipo

  /**
   * Evaluaciones de Cuidador → Mascota
   * Métrica PRIVADA: observaciones cualitativas sobre comportamiento
   * Responde: ¿Cómo se comporta esta mascota?
   *
   * Ejemplo: {promedio: 0, cantidad: 5}
   * Significado: 5 observaciones registradas. `promedio` SIEMPRE es 0 porque
   * las observaciones no usan rating (la CF `crearEvaluacion` las rechaza).
   * Datos en Evaluacion.datos: ritmo, compania, tolerancia, comentario.
   */
  evaluaciones_mascota?: DesglosePorTipo

  /**
   * Evaluaciones del Sistema → Cuidador (MVP2, no MVP1)
   * Métrica INDEPENDIENTE: métricas automáticas de desempeño operacional
   * Responde: ¿Cumple el cuidador sus compromisos (puntualidad, GPS, etc.)?
   *
   * Ejemplo: {promedio: 4.2, cantidad: 8}
   * Significado: 8 paseos analizados, promedio de desempeño 4.2
   * NUNCA se mezcla con evaluaciones humanas
   */
  evaluaciones_sistema?: DesglosePorTipo

  /** Timestamp de la última actualización (calculada por Cloud Function) */
  actualizado_en: Date

  /**
   * Cantidad de paseos realizados (solo para objetivos tipo usuario/cuidador).
   * Mantenida por la Cloud Function `alCompletarPaseo` al terminar un paseo;
   * cacheada en `perfiles_publicos.cantidad_paseos_realizados` para la UI.
   */
  cantidad_paseos_realizados?: number
}

/**
 * Ejemplo de ResumenEvaluacion completo:
 *
 * {
 *   id: 'resumen_juan_uid',
 *   objetivo: {tipo: 'usuario', id: 'juan_uid'},
 *   evaluaciones_cuidador: {
 *     promedio: 4.6,
 *     cantidad: 15
 *   },
 *   evaluaciones_tutor: {
 *     promedio: 4.3,
 *     cantidad: 12
 *   },
 *   evaluaciones_mascota: {
 *     promedio: 0,
 *     cantidad: 5
 *   },
 *   evaluaciones_sistema: undefined, // MVP2
 *   actualizado_en: 2026-08-30T15:30:00Z,
 *   creado_en: 2026-08-15T09:00:00Z,
 *   creado_por: 'sistema',
 *   actualizado_por: 'sistema'
 * }
 */
