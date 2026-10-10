import { Timestamp } from 'firebase/firestore'
import type {
  OperacionEconomica,
  EventoOperacionEconomica,
  MovimientoFinanciero,
  Obligacion,
  EstadoOperacionEconomica,
  TipoEventoOperacionEconomica,
} from '@/models/operacionesEconomicas'
import {
  crearOperacion,
  actualizarOperacion,
  obtenerOperacion,
  crearEvento,
  registrarMovimiento,
  crearObligacion,
  listarObligacionesPendientes,
  actualizarObligacion,
  obtenerObligacion,
} from '@/services/firebase/firestore/colecciones/operacionesEconomicas'
import { validateI1 } from '@/logic/operacionesEconomicas'

/**
 * Helpers privados para separación de responsabilidades
 */

function esEstadoTerminal(estado: EstadoOperacionEconomica): boolean {
  return estado === 'CERRADA' || estado === 'CANCELADA'
}

async function actualizarEstadoYRegistrarEvento(
  operacionId: string,
  nuevoEstado: EstadoOperacionEconomica | null,
  tipoEvento: TipoEventoOperacionEconomica,
  detalleEvento: string,
  datosAdicionales?: Partial<EventoOperacionEconomica>
): Promise<void> {
  if (nuevoEstado) {
    await actualizarOperacion(operacionId, { estado: nuevoEstado })
  }

  await crearEvento({
    operacion_id: operacionId,
    tipo: tipoEvento,
    detalle: detalleEvento,
    timestamp: Timestamp.now(),
    ...datosAdicionales,
  })
}

/**
 * 1. Crear operación económica (evento OPERACION_ENCARGADA)
 */
export async function crearOperacionEconomica(
  tutorId: string,
  valorAcordado: number,
  remuneracionMandatario: number,
  recursosAdministrados: number
): Promise<string> {
  const op: Omit<OperacionEconomica, 'id'> = {
    tutor_id: tutorId,
    valor_acordado: valorAcordado,
    remuneracion_mandatario: remuneracionMandatario,
    recursos_administrados: recursosAdministrados,
    estado: 'ENCARGADA',
    creado_en: Timestamp.now(),
  }

  if (!validateI1({ ...op, id: 'temp' })) {
    throw new Error('Violación I1: composición económica incorrecta')
  }

  const opId = await crearOperacion(op)

  await crearEvento({
    operacion_id: opId,
    tipo: 'OPERACION_ENCARGADA',
    detalle: `Operación encargada por tutor ${tutorId}`,
    timestamp: Timestamp.now(),
  })

  return opId
}

/**
 * 2. Asignar cuidador (evento CUIDADOR_ASIGNADO)
 */
export async function asignarCuidador(
  operacionId: string,
  cuidadorId: string
): Promise<void> {
  const op = await obtenerOperacion(operacionId)
  if (!op) throw new Error(`Operación ${operacionId} no existe`)
  if (esEstadoTerminal(op.estado)) {
    throw new Error('No se puede asignar cuidador a operación terminal')
  }

  await actualizarOperacion(operacionId, { cuidador_id: cuidadorId })

  await crearEvento({
    operacion_id: operacionId,
    tipo: 'CUIDADOR_ASIGNADO',
    detalle: `Cuidador ${cuidadorId} asignado`,
    timestamp: Timestamp.now(),
  })
}

/**
 * 3. Registrar servicio ejecutado (evento SERVICIO_EJECUTADO)
 */
export async function registrarServicioEjecutado(
  operacionId: string,
  detalle: string = ''
): Promise<void> {
  const op = await obtenerOperacion(operacionId)
  if (!op) throw new Error(`Operación ${operacionId} no existe`)
  if (esEstadoTerminal(op.estado)) {
    throw new Error('No se puede registrar servicio en operación terminal')
  }

  const nuevoEstado: EstadoOperacionEconomica =
    op.estado === 'RECAUDADA' ? 'RECAUDADA' : 'EJECUTADA'

  await actualizarEstadoYRegistrarEvento(
    operacionId,
    nuevoEstado,
    'SERVICIO_EJECUTADO',
    detalle || 'Servicio ejecutado'
  )
}

/**
 * 4. Registrar recaudo (evento RECAUDO con MovimientoFinanciero)
 */
export async function registrarRecaudo(
  operacionId: string,
  valor: number,
  origen: string,
  referenciaOrigen: string
): Promise<string> {
  const op = await obtenerOperacion(operacionId)
  if (!op) throw new Error(`Operación ${operacionId} no existe`)
  if (esEstadoTerminal(op.estado)) {
    throw new Error('No se puede registrar recaudo en operación terminal')
  }

  const movimiento: Omit<MovimientoFinanciero, 'id'> = {
    operacion_id: operacionId,
    tipo: 'RECAUDO',
    valor,
    sentido: 'ENTRADA',
    origen,
    referencia_origen: referenciaOrigen,
    creado_en: Timestamp.now(),
  }

  const movId = await registrarMovimiento(movimiento)

  await actualizarEstadoYRegistrarEvento(
    operacionId,
    'RECAUDADA',
    'RECAUDO',
    `Recaudo de $${valor} desde ${origen}`,
    { movimiento_id: movId }
  )

  return movId
}

/**
 * 5. Generar obligación (evento OBLIGACION_GENERADA)
 */
export async function generarObligacion(
  operacionId: string,
  deudor: string,
  acreedor: string,
  concepto: string,
  valor: number
): Promise<string> {
  const op = await obtenerOperacion(operacionId)
  if (!op) throw new Error(`Operación ${operacionId} no existe`)

  const obligacion: Omit<Obligacion, 'id'> = {
    operacion_id: operacionId,
    deudor,
    acreedor,
    concepto,
    valor,
    estado: 'PENDIENTE',
    creado_en: Timestamp.now(),
  }

  const obligId = await crearObligacion(obligacion)

  await crearEvento({
    operacion_id: operacionId,
    tipo: 'OBLIGACION_GENERADA',
    detalle: `Obligación de $${valor} a cargo de ${deudor}`,
    timestamp: Timestamp.now(),
    obligacion_id: obligId,
  })

  return obligId
}

/**
 * 6. Ejecutar pago (evento PAGO_TERCERO, marca obligación CUMPLIDA)
 * Requiere: pago exacto al valor de obligación
 */
export async function ejecutarPago(
  operacionId: string,
  obligacionId: string,
  valor: number,
  origen: string,
  referenciaOrigen: string
): Promise<string> {
  const op = await obtenerOperacion(operacionId)
  if (!op) throw new Error(`Operación ${operacionId} no existe`)

  const oblig = await obtenerObligacion(obligacionId)
  if (!oblig) throw new Error(`Obligación ${obligacionId} no existe`)
  if (oblig.estado !== 'PENDIENTE')
    throw new Error('Obligación no está PENDIENTE')
  if (oblig.valor !== valor) {
    throw new Error(`Pago debe ser exacto: ${oblig.valor}, recibido ${valor}`)
  }

  const movimiento: Omit<MovimientoFinanciero, 'id'> = {
    operacion_id: operacionId,
    tipo: 'PAGO',
    valor,
    sentido: 'SALIDA',
    origen,
    referencia_origen: referenciaOrigen,
    creado_en: Timestamp.now(),
  }

  const movId = await registrarMovimiento(movimiento)

  await actualizarObligacion(obligacionId, {
    estado: 'CUMPLIDA',
    cumplido_en: Timestamp.now(),
    movimiento_cumplido_id: movId,
  })

  await actualizarEstadoYRegistrarEvento(
    operacionId,
    null,
    'PAGO_TERCERO',
    `Pago de $${valor} registrado`,
    { movimiento_id: movId, obligacion_id: obligacionId }
  )

  return movId
}

/**
 * 7. Cerrar operación
 * Requiere: cero obligaciones PENDIENTE
 */
export async function cerrarOperacion(operacionId: string): Promise<void> {
  const op = await obtenerOperacion(operacionId)
  if (!op) throw new Error(`Operación ${operacionId} no existe`)
  if (op.estado === 'CERRADA') throw new Error('Operación ya está CERRADA')
  if (op.estado === 'CANCELADA')
    throw new Error('Operación CANCELADA no puede cerrarse')

  const pendientes = await listarObligacionesPendientes(operacionId)
  if (pendientes.length > 0) {
    throw new Error(
      `No se puede cerrar: existen ${pendientes.length} obligaciones PENDIENTE`
    )
  }

  await actualizarOperacion(operacionId, { estado: 'CERRADA' })
}

/**
 * 8. Cancelar operación
 * Conserva movimientos previos, anula obligaciones PENDIENTE
 */
export async function cancelarOperacion(
  operacionId: string,
  canceladoPor: string,
  motivo: string = ''
): Promise<void> {
  const op = await obtenerOperacion(operacionId)
  if (!op) throw new Error(`Operación ${operacionId} no existe`)
  if (op.estado === 'CERRADA')
    throw new Error('Operación CERRADA no puede cancelarse')
  if (op.estado === 'CANCELADA') throw new Error('Operación ya está CANCELADA')

  await actualizarOperacion(operacionId, {
    estado: 'CANCELADA',
    cancelado_en: Timestamp.now(),
    cancelado_por: canceladoPor,
  })

  const obligaciones = await listarObligacionesPendientes(operacionId)
  for (const oblig of obligaciones) {
    await actualizarObligacion(oblig.id, { estado: 'ANULADA' })
  }

  await actualizarEstadoYRegistrarEvento(
    operacionId,
    null,
    'OPERACION_CANCELADA',
    motivo || 'Operación cancelada'
  )
}
