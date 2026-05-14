import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import {
  mapFirebaseError,
  type CrudResult,
  toDb,
  camposSistemaCrear,
  camposSistemaActualizar,
} from '@/services/firebase/comun'
import type { PerfilPublico } from '@/models/PerfilPublico'
import { db } from '@/firebase.config'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore'

/**
 * Servicio de persistencia para Perfiles Públicos.
 * Solo realiza operaciones CRUD básicas.
 */
export class ServicioPerfilPublico {
  private static readonly COLLECTION = 'perfiles_publicos'

  static async crear(
    data: Partial<PerfilPublico>
  ): Promise<CrudResult<PerfilPublico>> {
    return ServicioCrudBase.crear<PerfilPublico>(this.COLLECTION, data as any)
  }

  /**
   * Crea o actualiza un perfil público con un ID específico (usualmente el UID del usuario).
   */
  static async guardarConId(
    uid: string,
    data: Partial<PerfilPublico>
  ): Promise<CrudResult<PerfilPublico>> {
    try {
      const docRef = doc(db, this.COLLECTION, uid)

      // Verificar existencia real en Firestore para elegir campos de sistema correctos.
      // NO usar `data.creado_en` como indicador: el caller raramente incluye ese campo.
      const snapshot = await getDoc(docRef)
      const systemFields = snapshot.exists()
        ? camposSistemaActualizar(uid) // update: preserva creado_en / creado_por vía merge
        : camposSistemaCrear(uid) // create: escribe todos los campos de sistema

      const dataTransformed = toDb(data)
      const finalData = {
        ...dataTransformed,
        id: uid,
        ...systemFields,
      }

      await setDoc(docRef, finalData, { merge: true })

      return {
        success: true,
        data: { ...finalData, id: uid } as unknown as PerfilPublico,
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

  /**
   * Ejecuta una consulta de perfiles públicos basada en filtros.
   * La lógica de qué filtros aplicar debe venir de /logic.
   */
  static async buscarPerfiles(
    filtros: { campo: string; op: any; valor: any }[],
    orden?: { campo: string; dir: 'asc' | 'desc' },
    limite: number = 20
  ): Promise<CrudResult<PerfilPublico[]>> {
    try {
      let q = query(collection(db, this.COLLECTION))

      for (const f of filtros) {
        q = query(q, where(f.campo, f.op, f.valor))
      }

      if (orden) {
        q = query(q, orderBy(orden.campo, orden.dir))
      }

      q = query(q, limit(limite))

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
}
