/**
 * Operación económica: transacción entre Tutor y Paw-Path con ejecución mediante tercero.
 * Divide un valor acordado en remuneración de Paw-Path y recursos para ejecución.
 * Invariante I1: valor_acordado = remuneracion_mandatario + recursos_administrados
 *
 * La crea y actualiza solo el servidor (functions/src/economia). Hay una por
 * tutor y servicio; su id es `${operacion_servicio_id}_${tutor_id}`.
 */

import type { Timestamp } from 'firebase/firestore'

/**
 * Estados posibles. No hay orden obligatorio entre RECAUDADA y EJECUTADA.
 * CERRADA y CANCELADA son terminales.
 */
export type EstadoOperacionEconomica =
  | 'ENCARGADA'
  | 'EN_EJECUCION'
  | 'EJECUTADA'
  | 'RECAUDADA'
  | 'CERRADA'
  | 'CANCELADA'

/**
 * @property id - ID único
 * @property tutor_id - Usuario que encarga
 * @property cuidador_id - Ejecutor asignado (null si pendiente)
 * @property valor_acordado - Monto total (COP, sin decimales)
 * @property remuneracion_mandatario - Compensación de Paw-Path (COP, sin decimales)
 * @property recursos_administrados - Monto para tercero (COP, sin decimales)
 * @property estado - Estado actual derivado de eventos
 * @property creado_en - Timestamp de creación
 * @property cancelado_en - Timestamp de cancelación (opcional)
 * @property cancelado_por - ID de quien canceló (opcional)
 */
export interface OperacionEconomica {
  id: string

  // Actores
  tutor_id: string
  cuidador_id?: string

  // Servicio que originó la operación (el paseo es un tipo de servicio)
  tipo_servicio: 'paseo'
  operacion_servicio_id: string

  // Composición económica (INVARIANTE I1)
  valor_acordado: number
  remuneracion_mandatario: number
  recursos_administrados: number

  // Desglose de la remuneración: comisión base + IVA de la comisión
  comision_base: number
  iva_comision: number

  // Política comercial con la que se calculó el precio
  politica_version: number
  detalle_precio?: {
    num_mascotas: number
    duracion_minutos: number
    precio_servicio: number
    base_por_hora: number
    mascota_adicional: number
    porcentaje_plataforma: number
    porcentaje_iva: number
  }

  // Estado derivado de eventos registrados
  estado: EstadoOperacionEconomica

  // Pago en curso (los documentos contables viven en documentos_contables)
  pago_pendiente?: { referencia: string; proveedor: string; iniciado_en: Timestamp }
  referencia_pago?: string

  // Auditoría
  creado_en: Timestamp
  recaudado_en?: Timestamp
  cerrado_en?: Timestamp
  cancelado_en?: Timestamp
  cancelado_por?: string
}

/** Id de la operación económica de un tutor en un servicio. */
export function idOperacionEconomica(servicioId: string, tutorId: string) {
  return `${servicioId}_${tutorId}`
}
