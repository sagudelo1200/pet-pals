/**
 * SERVICIO DE OPERACIÓN - CRUD GENÉRICO
 *
 * Responsabilidad: Operaciones CRUD base para cualquier tipo de operación.
 * Lógica de negocio específica está en logic/operaciones/casosDeUso.ts
 *
 * Collection: /operaciones/{id}
 */

import {
  collection,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  setDoc,
  Timestamp,
  runTransaction,
  type Transaction,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import type { Operacion, TipoOperacion } from '@/models/Operacion'
import {
  camposSistemaCrear,
  camposSistemaActualizar,
} from '@/services/firebase/comun/camposSistema'

const COLLECTION_NAME = 'operaciones'

/**
 * Servicio de Operación
 * CRUD genérico para /operaciones
 */
export class ServicioOperacion {
  /**
   * Obtener una operación por ID
   */
  static async obtener(id: string): Promise<Operacion | null> {
    try {
      const ref = doc(db, COLLECTION_NAME, id)
      const snapshot = await getDoc(ref)

      if (!snapshot.exists()) {
        return null
      }

      return {
        id: snapshot.id,
        ...snapshot.data(),
      } as Operacion
    } catch (error) {
      console.error(`[ServicioOperacion] Error obteniendo ${id}:`, error)
      return null
    }
  }

  /**
   * Crear una nueva operación
   * @param operacion Datos de la operación sin id
   * @param uid UID del creador (requerido para validación de Firestore Rules)
   */
  static async crear(
    operacion: Omit<Operacion, 'id'>,
    uid?: string
  ): Promise<string> {
    try {
      const camposSistema = camposSistemaCrear(uid)

      // Generar ID en cliente (requerido por Firestore Rules)
      const colRef = collection(db, COLLECTION_NAME)
      const docRef = doc(colRef)
      const id = docRef.id

      // Incluir ID en el documento (requerido por tiene_campos_sistema_basicos())
      await setDoc(docRef, {
        id, // ← REQUERIDO por Firestore Rules
        ...camposSistema,
        ...this.limpiarUndefined(operacion),
        timestamp_creacion: Timestamp.now(),
      })
      return id
    } catch (error) {
      console.error('[ServicioOperacion] Error creando:', error)
      throw error
    }
  }

  /**
   * Actualizar una operación
   */
  static async actualizar(
    id: string,
    cambios: Partial<Operacion>
  ): Promise<void> {
    try {
      const camposSistema = camposSistemaActualizar()
      const ref = doc(db, COLLECTION_NAME, id)
      await updateDoc(ref, {
        ...camposSistema,
        ...this.limpiarUndefined(cambios),
      })
    } catch (error) {
      console.error(`[ServicioOperacion] Error actualizando ${id}:`, error)
      throw error
    }
  }

  /**
   * Eliminar una operación
   */
  static async eliminar(id: string): Promise<void> {
    try {
      const ref = doc(db, COLLECTION_NAME, id)
      await deleteDoc(ref)
    } catch (error) {
      console.error(`[ServicioOperacion] Error eliminando ${id}:`, error)
      throw error
    }
  }

  /**
   * Obtener operaciones de un tutor
   */
  static async obtenerPorTutor(id_tutor: string): Promise<Operacion[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('id_tutor', '==', id_tutor)
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as Operacion[]
    } catch (error) {
      console.error(
        `[ServicioOperacion] Error obteniendo operaciones de tutor ${id_tutor}:`,
        error
      )
      return []
    }
  }

  /**
   * Obtener operaciones de un cuidador
   */
  static async obtenerPorCuidador(id_cuidador: string): Promise<Operacion[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('id_cuidador', '==', id_cuidador)
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Operacion[]
    } catch (error) {
      console.error(
        `[ServicioOperacion] Error obteniendo operaciones de cuidador ${id_cuidador}:`,
        error
      )
      return []
    }
  }

  /**
   * Obtener operaciones por estado
   */
  static async obtenerPorEstado(estado: string): Promise<Operacion[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('estado', '==', estado)
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Operacion[]
    } catch (error) {
      console.error(
        `[ServicioOperacion] Error obteniendo operaciones por estado ${estado}:`,
        error
      )
      return []
    }
  }

  /**
   * Obtener operaciones por tipo
   */
  static async obtenerPorTipo(tipo: TipoOperacion): Promise<Operacion[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('tipo', '==', tipo)
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Operacion[]
    } catch (error) {
      console.error(
        `[ServicioOperacion] Error obteniendo operaciones de tipo ${tipo}:`,
        error
      )
      return []
    }
  }

  /**
   * Ejecutar transacción
   */
  static async enTransaccion(
    callback: (_tx: Transaction) => Promise<void>
  ): Promise<void> {
    try {
      await runTransaction(db, callback)
    } catch (error) {
      console.error('[ServicioOperacion] Error en transacción:', error)
      throw error
    }
  }

  /**
   * Limpiar valores undefined antes de guardar en Firestore
   */
  private static limpiarUndefined(obj: any): any {
    const resultado: any = {}
    for (const key in obj) {
      if (obj[key] !== undefined) {
        resultado[key] = obj[key]
      }
    }
    return resultado
  }
}
