/**
 * Evaluador de Consentimientos
 *
 * Lógica pura para determinar:
 * 1. Si un consentimiento es vigente
 * 2. Si está próximo a expirar (alerta temprana)
 *
 * Invocado desde:
 * - ConsentimientosContext (al enriquecer datos)
 * - Tests (validar lógica)
 * - Componentes (no directamente, a través del contexto)
 *
 * Nota: Pura, sin I/O ni side effects
 */

import type { EstadoConsentimiento } from '@/models/Consentimiento'

export interface ResultadoVigencia {
  /**
   * ¿Es vigente?
   * true = usuario debe cumplir con este consentimiento ahora
   * false = usuario no tiene este consentimiento vigente
   */
  vigente: boolean

  /**
   * ¿El consentimiento está actualmente aceptado?
   */
  aceptado: boolean

  /**
   * ¿Por qué no es vigente?
   * - RECHAZADO: nunca aceptó
   * - REVOCADO: aceptó pero lo revocó
   * - EXPIRADO: pasó la fecha de reconfirmación
   * - VERSION_DESACTUALIZADA: hay una versión más nueva
   */
  motivo_no_vigencia?:
    'RECHAZADO' | 'REVOCADO' | 'EXPIRADO' | 'VERSION_DESACTUALIZADA'
}

export interface ResultadoAlerta {
  /**
   * ¿Expira pronto? (dentro de 30 días)
   */
  proximoAExpirar: boolean

  /**
   * Días hasta expiración (null si no aplica)
   */
  diasRestantes: number | null
}

/**
 * Evalúa si un consentimiento es vigente
 *
 * Lógica:
 * - vigente = true SI:
 *   1. estado === 'ACEPTADO'
 *   2. es_documento_vigente_hoy === true (no hay nueva versión)
 *   3. NO hay fecha_proxima_reconfirmacion O fecha_proxima_reconfirmacion > ahora
 *
 * @param estado - Estado actual (ACEPTADO, RECHAZADO, REVOCADO)
 * @param fecha_proxima_reconfirmacion - Cuándo requiere reconfirmación (null si indefinido)
 * @param es_documento_vigente_hoy - ¿Sigue siendo la versión activa?
 * @param ahora - Referencia temporal (default: new Date())
 * @returns Resultado con vigencia y motivo de no vigencia si aplica
 */
export function evaluarVigencia(
  estado: EstadoConsentimiento | string,
  fecha_proxima_reconfirmacion: Date | null | undefined,
  es_documento_vigente_hoy: boolean,
  ahora: Date = new Date()
): ResultadoVigencia {
  const estadoValido = estado as EstadoConsentimiento
  const aceptado = estadoValido === 'ACEPTADO'

  // Si no aceptó, determinar por qué
  let motivo_no_vigencia: ResultadoVigencia['motivo_no_vigencia'] = undefined

  if (!aceptado) {
    if (estadoValido === 'RECHAZADO') {
      motivo_no_vigencia = 'RECHAZADO'
    } else if (estadoValido === 'REVOCADO') {
      motivo_no_vigencia = 'REVOCADO'
    }
  }

  // Determinar vigencia
  let vigente = false
  if (aceptado && es_documento_vigente_hoy) {
    // Aceptó y documento sigue siendo la versión activa
    if (!fecha_proxima_reconfirmacion) {
      // No requiere reconfirmación: vigente indefinidamente
      vigente = true
    } else {
      // Requiere reconfirmación: revisar si pasó la fecha
      const fechaVencimiento = new Date(fecha_proxima_reconfirmacion)
      vigente = ahora < fechaVencimiento

      // Si expiró
      if (!vigente) {
        motivo_no_vigencia = 'EXPIRADO'
      }
    }
  } else if (aceptado && !es_documento_vigente_hoy) {
    // Aceptó pero hay versión más nueva
    motivo_no_vigencia = 'VERSION_DESACTUALIZADA'
  }

  return {
    vigente,
    aceptado,
    motivo_no_vigencia,
  }
}

/**
 * Evalúa si un consentimiento está próximo a expirar (alerta temprana)
 *
 * Lógica:
 * - proximoAExpirar = true SI:
 *   1. vigente = true (aceptado y no ha expirado)
 *   2. fecha_proxima_reconfirmacion existe
 *   3. Falta <= 30 días para expirar
 *
 * @param vigencia - Resultado de evaluarVigencia()
 * @param fecha_proxima_reconfirmacion - Fecha de expiración
 * @param ahora - Referencia temporal (default: new Date())
 * @returns Resultado con alerta y días restantes
 */
export function evaluarAlerta(
  vigencia: ResultadoVigencia,
  fecha_proxima_reconfirmacion: Date | null | undefined,
  ahora: Date = new Date()
): ResultadoAlerta {
  // Solo hay alerta si está vigente, tiene fecha de reconfirmación, y no ha expirado
  if (!vigencia.vigente || !fecha_proxima_reconfirmacion) {
    return {
      proximoAExpirar: false,
      diasRestantes: null,
    }
  }

  const fechaVencimiento = new Date(fecha_proxima_reconfirmacion)
  const msRestantes = fechaVencimiento.getTime() - ahora.getTime()
  const diasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60 * 24))

  // Alerta si falta <= 30 días
  const proximoAExpirar = diasRestantes <= 30 && diasRestantes > 0

  return {
    proximoAExpirar,
    diasRestantes: proximoAExpirar ? diasRestantes : null,
  }
}
