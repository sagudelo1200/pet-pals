import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../../firebase.config'
import { BaseModel } from '../../models/BaseModel'
import { CrudResult } from './types'
import { AuthService } from './auth'
import { nowServerTimestamp, toDb, toDomain } from './converters'
import { ERR } from '@/constants'
import { mapFirebaseError } from './errors'

export class ServicioCrudBase {
  /**
   * Crear un documento
   */
  static async crear<T extends BaseModel>(
    collectionName: string,
    data: Omit<
      T,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<T>> {
    try {
      const currentUser = AuthService.getCurrentUser()
      const base = {
        creado_en: nowServerTimestamp(),
        actualizado_en: nowServerTimestamp(),
        creado_por: currentUser?.uid,
        actualizado_por: currentUser?.uid,
      }

      const docDataDb = { ...toDb(data), ...base }
      const docRef = await addDoc(collection(db, collectionName), docDataDb)

      // Re-leer para retornar en formato de dominio (Date)
      return this.obtenerPorId<T>(collectionName, docRef.id)
    } catch (error: any) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Obtener por ID
   */
  static async obtenerPorId<T extends BaseModel>(
    collectionName: string,
    id: string
  ): Promise<CrudResult<T>> {
    try {
      const docRef = doc(db, collectionName, id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const domainData = toDomain(docSnap.data()) as T | undefined | null
        return {
          success: true,
          data: { id: docSnap.id, ...(domainData ?? {}) } as unknown as T,
        }
      }

      return {
        success: false,
        error: ERR.DOCUMENTO_NO_ENCONTRADO,
      }
    } catch (error: any) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Actualizar documento
   */
  static async actualizar<T extends BaseModel>(
    collectionName: string,
    id: string,
    data: Partial<Omit<T, 'id' | 'creado_en' | 'creado_por'>>
  ): Promise<CrudResult<T>> {
    try {
      const currentUser = AuthService.getCurrentUser()
      const docRef = doc(db, collectionName, id)

      const updateDataDb = {
        ...toDb(data),
        actualizado_en: nowServerTimestamp(),
        actualizado_por: currentUser?.uid,
      }

      await updateDoc(docRef, updateDataDb)

      // Retornar documento actualizado
      return this.obtenerPorId<T>(collectionName, id)
    } catch (error: any) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Eliminar documento
   */
  static async eliminar(
    collectionName: string,
    id: string
  ): Promise<CrudResult<boolean>> {
    try {
      const docRef = doc(db, collectionName, id)
      await deleteDoc(docRef)

      return {
        success: true,
        data: true,
      }
    } catch (error: any) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Obtener todos los documentos de una colección
   */
  static async obtenerTodos<T extends BaseModel>(
    collectionName: string
  ): Promise<CrudResult<T[]>> {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName))
      const documents: T[] = []

      querySnapshot.forEach(snap => {
        const domainData = toDomain(snap.data()) as T | undefined | null
        documents.push({ id: snap.id, ...(domainData ?? {}) } as unknown as T)
      })

      return {
        success: true,
        data: documents,
      }
    } catch (error: any) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Obtener documentos con filtro simple
   */
  static async buscar<T extends BaseModel>(
    collectionName: string,
    field: string,
    value: any
  ): Promise<CrudResult<T[]>> {
    try {
      // Asegurar que valores Date vayan como Timestamp a Firestore
      const valueDb = toDb(value)
      const q = query(
        collection(db, collectionName),
        where(field, '==', valueDb as any)
      )
      const querySnapshot = await getDocs(q)
      const documents: T[] = []

      querySnapshot.forEach(snap => {
        const domainData = toDomain(snap.data()) as T | undefined | null
        documents.push({ id: snap.id, ...(domainData ?? {}) } as unknown as T)
      })

      return {
        success: true,
        data: documents,
      }
    } catch (error: any) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }
}
