/**
 * ServicioAuditoria
 *
 * Servicio centralizado para registrar eventos de auditoría en Firestore.
 * Reutilizable para TODAS las entidades del sistema (Operacion, Cargo, Pago, etc.)
 *
 * Collection: /eventos_auditoria/{id}
 */

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import type {
  EventoAuditoria,
  TipoEntidadAuditoria,
  TipoEventoAuditoria,
  CambioAuditoria,
} from '@/models'

const COLLECTION_NAME = 'eventos_auditoria'

/**
 * Parámetros para registrar un evento de auditoría
 */
export interface RegistroAuditoriaParams {
  // Qué entidad cambió
  entidad_tipo: TipoEntidadAuditoria
  entidad_id: string

  // Qué pasó
  tipo_evento: TipoEventoAuditoria

  // Cambios específicos (para ENTIDAD_MODIFICADA)
  cambios?: CambioAuditoria

  // Quién actuó
  actor: string

  // Trazabilidad
  id_operacion?: string
  id_correlacion?: string

  // Contexto (opcional)
  ip?: string
  user_agent?: string
}

/**
 * ServicioAuditoria: Operaciones CRUD para eventos de auditoría
 */
export class ServicioAuditoria {
  /**
   * Registrar un evento de auditoría
   */
  static async registrar(params: RegistroAuditoriaParams): Promise<string> {
    const eventoAuditoria: Omit<EventoAuditoria, 'id'> = {
      entidad_tipo: params.entidad_tipo,
      entidad_id: params.entidad_id,
      tipo_evento: params.tipo_evento,
      actor: params.actor,
      timestamp: Timestamp.now(),
    }

    // Solo incluir campos opcionales si existen (Firestore rechaza undefined)
    if (params.cambios !== undefined) {
      (eventoAuditoria as any).cambios = params.cambios
    }
    if (params.id_operacion !== undefined) {
      (eventoAuditoria as any).id_operacion = params.id_operacion
    }
    if (params.id_correlacion !== undefined) {
      (eventoAuditoria as any).id_correlacion = params.id_correlacion
    }
    if (params.ip !== undefined) {
      (eventoAuditoria as any).ip = params.ip
    }
    if (params.user_agent !== undefined) {
      (eventoAuditoria as any).user_agent = params.user_agent
    }

    const colRef = collection(db, COLLECTION_NAME)
    const docRef = await addDoc(colRef, eventoAuditoria)
    return docRef.id
  }

  /**
   * Obtener todos los eventos de una operación
   * Útil para reconstruir "qué pasó con la operación OP-001"
   */
  static async obtenerPorOperacion(
    id_operacion: string
  ): Promise<EventoAuditoria[]> {
    const colRef = collection(db, COLLECTION_NAME)
    const q = query(colRef, where('id_operacion', '==', id_operacion))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as EventoAuditoria[]
  }

  /**
   * Obtener todos los eventos de un actor
   * Útil para auditoría: "qué hizo el usuario U-123"
   */
  static async obtenerPorActor(actor: string): Promise<EventoAuditoria[]> {
    const colRef = collection(db, COLLECTION_NAME)
    const q = query(colRef, where('actor', '==', actor))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as EventoAuditoria[]
  }

  /**
   * Obtener todos los eventos de un tipo
   * Útil para análisis: "todos los CAMBIO_ESTADO en el mes"
   */
  static async obtenerPorTipo(
    tipo: TipoEventoAuditoria
  ): Promise<EventoAuditoria[]> {
    const colRef = collection(db, COLLECTION_NAME)
    const q = query(colRef, where('tipo_evento', '==', tipo))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as EventoAuditoria[]
  }

  /**
   * Obtener todos los eventos de una entidad
   * Útil para debugging: "todos los eventos del Cargo CHG-001"
   */
  static async obtenerPorEntidad(
    entidad_tipo: TipoEntidadAuditoria,
    entidad_id: string
  ): Promise<EventoAuditoria[]> {
    const colRef = collection(db, COLLECTION_NAME)
    const q = query(
      colRef,
      where('entidad_tipo', '==', entidad_tipo),
      where('entidad_id', '==', entidad_id)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as EventoAuditoria[]
  }

  /**
   * Obtener eventos por id_correlacion
   * Útil para reconstruir: "qué pasó en el request UUID-123"
   */
  static async obtenerPorCorrelacion(
    id_correlacion: string
  ): Promise<EventoAuditoria[]> {
    const colRef = collection(db, COLLECTION_NAME)
    const q = query(colRef, where('id_correlacion', '==', id_correlacion))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as EventoAuditoria[]
  }
}
