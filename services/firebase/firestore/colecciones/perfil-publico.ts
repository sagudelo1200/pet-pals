import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { mapFirebaseError, type CrudResult } from '@/services/firebase/comun'
import type { PerfilPublico } from '@/models/PerfilPublico'

export class ServicioPerfilPublico {
  private static readonly COLLECTION = 'perfil_publico'

  static async crear(
    data: Partial<PerfilPublico>
  ): Promise<CrudResult<PerfilPublico>> {
    return ServicioCrudBase.crear<PerfilPublico>(this.COLLECTION, data as any)
  }

  static async crearConId(
    uid: string,
    data: Partial<PerfilPublico>
  ): Promise<CrudResult<PerfilPublico>> {
    try {
      const { db } = await import('@/firebase.config')
      const { doc, setDoc, serverTimestamp } =
        await import('firebase/firestore')

      const docRef = doc(db, this.COLLECTION, uid)
      const dataConCamposSistema = {
        ...data,
        id: uid,
        creado_en: serverTimestamp(),
        actualizado_en: serverTimestamp(),
        actualizado_por: uid,
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

  static async obtenerPorId(id: string): Promise<CrudResult<PerfilPublico>> {
    return ServicioCrudBase.obtenerPorId<PerfilPublico>(this.COLLECTION, id)
  }

  static async actualizar(
    id: string,
    data: Partial<PerfilPublico>
  ): Promise<CrudResult<PerfilPublico>> {
    return ServicioCrudBase.actualizar<PerfilPublico>(
      this.COLLECTION,
      id,
      data as any
    )
  }

  static async eliminar(id: string): Promise<CrudResult<boolean>> {
    return ServicioCrudBase.eliminar(this.COLLECTION, id)
  }

  static async obtenerCuidadoresDisponibles(): Promise<
    CrudResult<PerfilPublico[]>
  > {
    try {
      const { db } = await import('@/firebase.config')
      const { collection, query, where, orderBy, limit, getDocs } =
        await import('firebase/firestore')

      const q = query(
        collection(db, this.COLLECTION),
        where('verificacion', '==', 'verificado'),
        orderBy('rating_promedio', 'desc'),
        limit(21)
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

  static async obtenerPorUsuario(
    uid: string
  ): Promise<CrudResult<PerfilPublico>> {
    try {
      const { db } = await import('@/firebase.config')
      const { collection, query, where, getDocs } =
        await import('firebase/firestore')

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
        data: { id: doc.id, ...doc.data() } as PerfilPublico,
      }
    } catch (e: any) {
      return { success: false, error: mapFirebaseError(e) }
    }
  }
}
