import { ServicioCrudBase } from './crud'
import { mapFirebaseError } from './errors'
import type { PerfilPublico } from '@/models/PerfilPublico'
import type { CrudResult } from './types'

/**
 * Servicio para gestionar perfiles públicos de usuarios (especialmente cuidadores)
 */
export class ServicioPerfilPublico {
  private static readonly COLLECTION = 'perfil_publico'

  /**
   * Crear un perfil público
   */
  static async crear(data: Partial<PerfilPublico>): Promise<CrudResult<PerfilPublico>> {
    return ServicioCrudBase.crear<PerfilPublico>(this.COLLECTION, data as any)
  }

  /**
   * Crear un perfil público con un ID específico (UID del usuario)
   */
  static async crearConId(uid: string, data: Partial<PerfilPublico>): Promise<CrudResult<PerfilPublico>> {
    try {
      const { db } = await import('@/firebase.config')
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')

      const docRef = doc(db, this.COLLECTION, uid)
      const dataConCamposSistema = {
        ...data,
        id: uid,
        creado_en: serverTimestamp(),
        actualizado_en: serverTimestamp(),
      }

      await setDoc(docRef, dataConCamposSistema)
      
      return {
        success: true,
        data: { ...dataConCamposSistema, id: uid } as unknown as PerfilPublico,
      }
    } catch (e: any) {
      return { success: false, error: mapFirebaseError(e) }
    }
  }

  /**
   * Obtener perfil público por ID
   */
  static async obtenerPorId(id: string): Promise<CrudResult<PerfilPublico>> {
    return ServicioCrudBase.obtenerPorId<PerfilPublico>(this.COLLECTION, id)
  }

  /**
   * Actualizar perfil público
   */
  static async actualizar(id: string, data: Partial<PerfilPublico>): Promise<CrudResult<PerfilPublico>> {
    return ServicioCrudBase.actualizar<PerfilPublico>(this.COLLECTION, id, data as any)
  }

  /**
   * Eliminar perfil público
   */
  static async eliminar(id: string): Promise<CrudResult<boolean>> {
    return ServicioCrudBase.eliminar(this.COLLECTION, id)
  }

  /**
   * Obtener cuidadores disponibles (perfiles verificados)
   * Ordenados por rating de mayor a menor
   */
  static async obtenerCuidadoresDisponibles(): Promise<CrudResult<PerfilPublico[]>> {
    try {
      const { db } = await import('@/firebase.config')
      const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore')

      const q = query(
        collection(db, this.COLLECTION),
        where('verificacion', '==', 'verificado'),
        orderBy('rating_promedio', 'desc'),
        limit(21) // Límite de cuidadores a mostrar
      )

      const snapshot = await getDocs(q)
      const perfiles: PerfilPublico[] = []
      
      snapshot.forEach(doc => {
        perfiles.push({ id: doc.id, ...doc.data() } as PerfilPublico)
      })

      return { success: true, data: perfiles }
    } catch (e: any) {
      return { success: false, error: mapFirebaseError(e) }
    }
  }

  /**
   * Obtener perfil público por UID de usuario
   */
  static async obtenerPorUsuario(uid: string): Promise<CrudResult<PerfilPublico>> {
    try {
      const { db } = await import('@/firebase.config')
      const { collection, query, where, getDocs } = await import('firebase/firestore')

      const q = query(
        collection(db, this.COLLECTION),
        where('creado_por', '==', uid)
      )

      const snapshot = await getDocs(q)
      
      if (snapshot.empty) {
        return { success: false, error: 'PERFIL_NO_ENCONTRADO' }
      }

      const doc = snapshot.docs[0]
      return { 
        success: true, 
        data: { id: doc.id, ...doc.data() } as PerfilPublico 
      }
    } catch (e: any) {
      return { success: false, error: mapFirebaseError(e) }
    }
  }
}
