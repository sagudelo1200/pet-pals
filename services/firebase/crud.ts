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

export class BaseCrudService {
  /**
   * Crear un documento
   */
  static async create<T extends BaseModel>(
    collectionName: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>
  ): Promise<CrudResult<T>> {
    try {
      const currentUser = AuthService.getCurrentUser()
      const base = {
        createdAt: nowServerTimestamp(),
        updatedAt: nowServerTimestamp(),
        createdBy: currentUser?.uid,
        updatedBy: currentUser?.uid,
      }

      const docDataDb = { ...toDb(data), ...base }
      const docRef = await addDoc(collection(db, collectionName), docDataDb)

      // Re-leer para retornar en formato de dominio (Date)
      return this.getById<T>(collectionName, docRef.id)
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Obtener por ID
   */
  static async getById<T extends BaseModel>(
    collectionName: string,
    id: string
  ): Promise<CrudResult<T>> {
    try {
      const docRef = doc(db, collectionName, id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = toDomain(docSnap.data())
        return {
          success: true,
          data: { id: docSnap.id, ...data } as T,
        }
      }

      return {
        success: false,
        error: ERR.DOCUMENTO_NO_ENCONTRADO,
      }
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.code === 'permission-denied'
            ? ERR.PERMISOS_INSUFICIENTES
            : error.message,
      }
    }
  }

  /**
   * Actualizar documento
   */
  static async update<T extends BaseModel>(
    collectionName: string,
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<CrudResult<T>> {
    try {
      const currentUser = AuthService.getCurrentUser()
      const docRef = doc(db, collectionName, id)

      const updateDataDb = {
        ...toDb(data),
        updatedAt: nowServerTimestamp(),
        updatedBy: currentUser?.uid,
      }

      await updateDoc(docRef, updateDataDb)

      // Retornar documento actualizado
      return this.getById<T>(collectionName, id)
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Eliminar documento
   */
  static async delete(
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
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Obtener todos los documentos de una colección
   */
  static async getAll<T extends BaseModel>(
    collectionName: string
  ): Promise<CrudResult<T[]>> {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName))
      const documents: T[] = []

      querySnapshot.forEach(snap => {
        const data = toDomain(snap.data())
        documents.push({ id: snap.id, ...data } as T)
      })

      return {
        success: true,
        data: documents,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Obtener documentos con filtro simple
   */
  static async getWhere<T extends BaseModel>(
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
        const data = toDomain(snap.data())
        documents.push({ id: snap.id, ...data } as T)
      })

      return {
        success: true,
        data: documents,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }
}
