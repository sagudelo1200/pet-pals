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
      const now = new Date()

      const docData = {
        ...data,
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser?.uid,
        updatedBy: currentUser?.uid,
      }

      const docRef = await addDoc(collection(db, collectionName), docData)

      return {
        success: true,
        data: { id: docRef.id, ...docData } as T,
      }
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
        const data = docSnap.data()
        return {
          success: true,
          data: {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as T,
        }
      }

      return {
        success: false,
        error: 'Documento no encontrado',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
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

      const updateData = {
        ...data,
        updatedAt: new Date(),
        updatedBy: currentUser?.uid,
      }

      await updateDoc(docRef, updateData)

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

      querySnapshot.forEach(doc => {
        const data = doc.data()
        documents.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as T)
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
      const q = query(collection(db, collectionName), where(field, '==', value))
      const querySnapshot = await getDocs(q)
      const documents: T[] = []

      querySnapshot.forEach(doc => {
        const data = doc.data()
        documents.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as T)
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
