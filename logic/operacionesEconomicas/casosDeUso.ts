import { Timestamp } from 'firebase/firestore'
import type {
  OperacionEconomica,
  EventoOperacionEconomica,
  MovimientoFinanciero,
  Obligacion,
  EstadoOperacionEconomica,
  TipoEventoOperacionEconomica,
} from '@/models/operacionesEconomicas'
import type { AdaptadorPago } from '@/logic/operacionesEconomicas/pagos/AdaptadorPago'
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
// Importar directamente de invariantes para evitar ciclo de require con index.ts
import { validateI1 } from '@/logic/operacionesEconomicas/invariantes'

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
  recursosAdministrados: number,
  paseoId?: string
): Promise<string> {
  const op: Omit<OperacionEconomica, 'id'> = {
    tutor_id: tutorId,
    valor_acordado: valorAcordado,
    remuneracion_mandatario: remuneracionMandatario,
    recursos_administrados: recursosAdministrados,
    estado: 'ENCARGADA',
    creado_en: Timestamp.now(),
    ...(paseoId && { paseo_id: paseoId }),
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

  // FASE 3: Crear Obligación #2 si existe cuidador asignado
  // Obligación: Paw-Path debe pagar al Cuidador por el servicio
  if (op.cuidador_id) {
    try {
      await generarObligacion(
        operacionId,
        'paw-path', // Deudor: Paw-Path
        op.cuidador_id, // Acreedor: Cuidador asignado
        'Pago por servicio de paseo ejecutado', // Concepto
        op.recursos_administrados // Valor: 90% del precio
      )
      // TODO: Notificar al cuidador que tiene una obligación pendiente de liquidación semanal
      console.log(
        `[FASE3] Obligación #2 creada: Paw-Path debe pagar $${op.recursos_administrados?.toLocaleString()} al cuidador ${op.cuidador_id}`
      )
    } catch (err) {
      console.warn('[FASE3] Error creando Obligación #2 para cuidador:', err)
      // No fallar si la obligación del cuidador falla (es no-bloqueante)
    }
  }
}

/**
 * 4. Registrar recaudo (evento RECAUDO con MovimientoFinanciero)
 */
/**
 * 4. Registrar recaudo (FASE 4.1: Solicitar pago a tutor)
 * Dispara solicitud de pago con la pasarela
 * Transiciona EJECUTADA → (espera confirmación de pago)
 */
export async function registrarRecaudo(
  operacionId: string,
  adaptadorPago: AdaptadorPago
): Promise<{ referencia: string; url?: string }> {
  const op = await obtenerOperacion(operacionId)
  if (!op) throw new Error(`Operación ${operacionId} no existe`)

  // Validar que esté en estado correcto
  if (op.estado !== 'EJECUTADA') {
    throw new Error(
      `No se puede cobrar operación en estado ${op.estado}. Debe estar EJECUTADA.`
    )
  }

  try {
    // 1. Solicitar pago a adaptador (Wompi, Mercado Pago, etc)
    const resultadoPago = await adaptadorPago.iniciarPago({
      operacion_id: operacionId,
      monto: op.valor_acordado,
      tutor_id: op.tutor_id,
    })

    // 2. Registrar movimiento como PENDIENTE (esperando confirmación)
    await registrarMovimiento({
      operacion_id: operacionId,
      tipo: 'PAGO_INICIADO',
      valor: op.valor_acordado,
      sentido: 'ENTRADA',
      origen: 'TUTOR',
      referencia_origen: resultadoPago.referencia,
      creado_en: Timestamp.now(),
    })

    // 3. Registrar evento
    await crearEvento({
      operacion_id: operacionId,
      tipo: 'PAGO_INICIADO',
      detalle: `Solicitud de pago por $${op.valor_acordado.toLocaleString()}`,
      timestamp: Timestamp.now(),
    })

    console.log(
      `[RECAUDO] Pago iniciado para operación ${operacionId}, referencia: ${resultadoPago.referencia}`
    )

    return {
      referencia: resultadoPago.referencia,
      url: resultadoPago.url,
    }
  } catch (err) {
    console.warn(`[RECAUDO] Error iniciando pago para ${operacionId}:`, err)
    throw err
  }
}

/**
 * 4.1 Confirmar recaudo (FASE 4.1: Pago confirmado por pasarela)
 * Se ejecuta cuando pasarela notifica que pago fue aprobado (webhook)
 * Transiciona EJECUTADA → RECAUDADA
 */
export async function confirmarRecaudo(
  operacionId: string,
  referenciaPago: string,
  adaptadorPago: AdaptadorPago
): Promise<void> {
  const op = await obtenerOperacion(operacionId)
  if (!op) throw new Error(`Operación ${operacionId} no existe`)

  try {
    // 1. Confirmar con adaptador que pago es válido
    const confirmacion = await adaptadorPago.confirmarPago(referenciaPago)

    if (!confirmacion.exito) {
      // Pago rechazado
      await crearEvento({
        operacion_id: operacionId,
        tipo: 'PAGO_RECHAZADO',
        detalle: confirmacion.mensaje,
        timestamp: Timestamp.now(),
      })
      throw new Error(`Pago rechazado: ${confirmacion.mensaje}`)
    }

    // 2. Transicionar estado EJECUTADA → RECAUDADA
    await actualizarEstadoYRegistrarEvento(
      operacionId,
      'RECAUDADA',
      'RECAUDO',
      `Pago confirmado: ${confirmacion.transactionId || referenciaPago}`
    )

    console.log(
      `[RECAUDO] Operación ${operacionId} transicionada a RECAUDADA. Referencia: ${referenciaPago}`
    )

    // 3. TODO: Notificar al tutor vía email/push que pago fue procesado
    // TODO: Preparar para liquidación semanal (FASE siguiente)
  } catch (err) {
    console.warn(`[RECAUDO] Error confirmando pago para ${operacionId}:`, err)
    throw err
  }
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
