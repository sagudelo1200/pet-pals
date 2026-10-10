import type {
  OperacionEconomica,
  EventoOperacionEconomica,
  MovimientoFinanciero,
  Obligacion,
} from '@/models/operacionesEconomicas'

/**
 * I1: Composición económica
 * valor_acordado = remuneracion_mandatario + recursos_administrados
 */
export function validateI1(operacion: OperacionEconomica): boolean {
  const { valor_acordado, remuneracion_mandatario, recursos_administrados } =
    operacion
  return valor_acordado === remuneracion_mandatario + recursos_administrados
}

/**
 * I2: Trazabilidad
 * Todo movimiento debe tener operacion_id O justificacion (al menos uno)
 */
export function validateI2(movimiento: MovimientoFinanciero): boolean {
  const { operacion_id, justificacion } = movimiento
  const hasOperacionId = operacion_id != null && operacion_id !== ''
  const hasJustificacion = justificacion != null && justificacion !== ''
  return hasOperacionId || hasJustificacion
}

/**
 * I3: Consistencia de estado
 * El estado debe ser compatible con eventos registrados
 */
export function validateI3(
  operacion: OperacionEconomica,
  eventos: EventoOperacionEconomica[]
): boolean {
  const { estado } = operacion
  const tiposEventos = new Set(eventos.map(e => e.tipo))

  // RECAUDADA requiere OPERACION_ENCARGADA + RECAUDO previos
  if (estado === 'RECAUDADA') {
    if (
      !tiposEventos.has('OPERACION_ENCARGADA') ||
      !tiposEventos.has('RECAUDO')
    ) {
      return false
    }
  }

  // EJECUTADA requiere OPERACION_ENCARGADA + SERVICIO_EJECUTADO previos
  if (estado === 'EJECUTADA') {
    if (
      !tiposEventos.has('OPERACION_ENCARGADA') ||
      !tiposEventos.has('SERVICIO_EJECUTADO')
    ) {
      return false
    }
  }

  // CERRADA requiere OPERACION_ENCARGADA + sin obligaciones pendientes (validar en I5)
  if (estado === 'CERRADA') {
    if (!tiposEventos.has('OPERACION_ENCARGADA')) {
      return false
    }
  }

  // CANCELADA requiere OPERACION_ENCARGADA (puede ocurrir en cualquier momento)
  if (estado === 'CANCELADA') {
    if (
      !tiposEventos.has('OPERACION_ENCARGADA') &&
      !tiposEventos.has('OPERACION_CANCELADA')
    ) {
      return false
    }
  }

  return true
}

/**
 * I4: Unicidad de efecto
 * (origen, referencia_origen) debe ser único en el conjunto
 */
export function validateI4(movimientos: MovimientoFinanciero[]): boolean {
  const seen = new Set<string>()

  for (const mov of movimientos) {
    const key = `${mov.origen}:${mov.referencia_origen}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
  }

  return true
}

/**
 * I5: Cierre de operación
 * No puede cerrarse si existen obligaciones PENDIENTE
 */
export function validateI5(
  operacion: OperacionEconomica,
  obligaciones: Obligacion[]
): boolean {
  if (operacion.estado !== 'CERRADA') {
    return true
  }

  const tienePendiente = obligaciones.some(o => o.estado === 'PENDIENTE')
  return !tienePendiente
}
