/**
 * MODELO OPERACIÓN - ABSTRACCIÓN GENÉRICA
 *
 * Operación representa cualquier servicio que se presta por la plataforma. Hoy
 * existe el paseo (tipo='paseo'); un servicio nuevo se agrega al catálogo de
 * servicios (functions/src/compartido/servicios.ts) y su `tipo` es su clave.
 *
 * La máquina de estados es unificada. Campos específicos van en datos_especificos.
 */

import type { UbicacionSnapshot } from '@/models/Ubicacion'
import type { TipoServicio } from '@/functions/src/compartido/servicios'
import type { Timestamp } from 'firebase/firestore'

/**
 * Tipo de operación: qué servicio se brinda. Es exactamente un servicio del
 * catálogo: no se define aparte para que las dos listas no se desalineen.
 */
export type TipoOperacion = TipoServicio

/**
 * Estados operacionales unificados
 * Válidos para CUALQUIER tipo de operación.
 * Estados específicos de un tipo van en la extensión del modelo (ej: Paseo).
 */
export const ESTADOS_OPERACION = {
  PENDIENTE: 'PENDIENTE', // Operación solicitada, espera confirmación
  CONFIRMADO: 'CONFIRMADO', // Operación aceptada
  EN_CAMINO: 'EN_CAMINO', // Paseo: cuidador en camino a la recogida
  EN_PUNTO_RECOGIDA: 'EN_PUNTO_RECOGIDA', // Paseo: cuidador en el punto de recogida
  EN_PROGRESO: 'EN_PROGRESO', // Operación en ejecución
  FINALIZADO: 'FINALIZADO', // Operación completada/terminada
  COMPLETADO: 'COMPLETADO', // Operación validada (listo para pagos)
  LIQUIDADA: 'LIQUIDADA', // Pagado/Liquidado
  CANCELADO: 'CANCELADO', // Cancelado
  ERROR: 'ERROR', // Error en la operación
} as const

export type EstadoOperacion =
  (typeof ESTADOS_OPERACION)[keyof typeof ESTADOS_OPERACION]

/**
 * Modalidad: acceso permitido
 */
export type ModalidadOperacion = 'privado' | 'compartido'

/**
 * Tipos de entidades auditables en el sistema
 * Reutilizable en FASE 0 (Operacion) y futuras FASES (Cargo, Pago, etc.)
 */
export type TipoEntidadAuditoria =
  | 'operacion'
  | 'cargo'
  | 'pago'
  | 'movimiento'
  | 'fondos_terceros'
  | 'liquidacion'

/**
 * Tipos de eventos de auditoría
 */
export type TipoEventoAuditoria =
  | 'ENTIDAD_CREADA'
  | 'ENTIDAD_MODIFICADA'
  | 'ENTIDAD_ELIMINADA'
  | 'CAMBIO_ESTADO'
  | 'ERROR'

export type TipoEventoOperacion =
  | 'bitacora'
  | 'incidente'
  | 'estado'
  | 'gps'
  | 'codigo'
  | 'sistema'
  | 'auditoria'

/**
 * Estructura de cambios para auditoría: {antes, despues} por campo
 * Usado cuando tipo_evento es 'ENTIDAD_MODIFICADA'
 * Ejemplo: { nombre: { antes: 'Paseo A', despues: 'Paseo B' } }
 */
export interface CambioAuditoria {
  [campo: string]: {
    antes: any
    despues: any
  }
}

/**
 * Evento de auditoría centralizado - Reutilizable para toda entidad
 *
 * Captura QUIÉN (actor), QUÉ (tipo_evento), A QUÉ (entidad_tipo/entidad_id),
 * CUÁNDO (timestamp), CAMBIOS ESPECÍFICOS (cambios), y TRAZABILIDAD (id_correlacion)
 *
 * Aplicable a:
 * - FASE 0: Operacion
 * - FASE 1: Cargo, Pago
 * - FASE 2: Movimiento, FondosTerceros, Liquidacion
 * - FASE 3: Procesamiento de liquidaciones
 */
export interface EventoAuditoria {
  // Identificación única
  id: string

  // QUÉ entidad cambió (tipo + id)
  entidad_tipo: TipoEntidadAuditoria
  entidad_id: string

  // QUÉ pasó
  tipo_evento: TipoEventoAuditoria

  // Cambios específicos (solo para ENTIDAD_MODIFICADA)
  // Ej: { estado: { antes: 'PENDIENTE', después: 'CONFIRMADO' } }
  cambios?: CambioAuditoria

  // QUIÉN y CUÁNDO
  actor: string // uid usuario o 'SISTEMA'
  timestamp: Timestamp

  // TRAZABILIDAD: para correlacionar eventos
  id_operacion?: string // Operación que originó este evento (permite "dame todos los eventos de OP-001")
  id_correlacion?: string // UUID único del request (permite reconstruir "qué pasó en el request XYZ")

  // CONTEXTO: para debugging y análisis
  ip?: string
  user_agent?: string
}

/**
 * Evento de operación
 */
export interface EventoOperacion {
  id: string
  id_operacion: string
  tipoEvento: TipoEventoOperacion
  payload: any
  actor?: string
  timestamp: Timestamp
}

/**
 * Interfaz genérica de Operación
 * Discriminada por tipo para polimorfismo seguro
 */
export interface Operacion {
  id: string
  tipo: TipoOperacion

  // Identificadores
  id_tutor: string
  id_cuidador?: string
  id_mascota?: string

  // Estado
  estado: EstadoOperacion
  modalidad: ModalidadOperacion

  // Ubicación
  ubicacion_origen?: UbicacionSnapshot
  ubicacion_destino?: UbicacionSnapshot
  ubicacion_actual?: UbicacionSnapshot

  // Temporal
  timestamp_creacion: Timestamp
  timestamp_inicio?: Timestamp
  timestamp_fin?: Timestamp
  duracion_estimada_minutos?: number
  duracion_actual_minutos?: number

  // Auditoría
  eventos?: EventoOperacion[]
  nota_cancelacion?: string

  // Datos específicos por tipo (para extensibilidad)
  datos_especificos?: {
    [key: string]: any
  }

  // Compatibilidad backward (campos legados)
  [key: string]: any
}
