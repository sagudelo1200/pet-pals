import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { Paseo, ESTADOS_PASEO } from '@/models/Paseo'
import { CrudResult, mapFirebaseError } from '@/services/firebase/comun'
import { ServicioAuth } from '@/services/firebase/auth/auth'
import { ERR } from '@/constants'
import {
  collection,
  query,
  where,
  orderBy,
  type Query,
  runTransaction,
  doc,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore'
import { db } from '@/firebase.config'

/**
 * Servicio de persistencia para Paseos.
 * Solo realiza operaciones CRUD y transiciones atómicas.
 */
export class ServicioPaseo {
  private static readonly COLLECTION = 'paseos'

  static getQuerySolicitudesPendientes(): Query {
    return query(
      collection(db, this.COLLECTION),
      where('estado', '==', ESTADOS_PASEO.PENDIENTE),
      orderBy('creado_en', 'desc')
    )
  }

  static async crear(
    data: Omit<
      Paseo,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Paseo>> {
    return ServicioCrudBase.crear<Paseo>(this.COLLECTION, data as any)
  }

  static async obtenerPorId(id: string): Promise<CrudResult<Paseo>> {
    return ServicioCrudBase.obtenerPorId<Paseo>(this.COLLECTION, id)
  }

  static async actualizar(
    id: string,
    data: Partial<Omit<Paseo, 'id' | 'creado_en' | 'creado_por'>>
  ): Promise<CrudResult<Paseo>> {
    return ServicioCrudBase.actualizar<Paseo>(this.COLLECTION, id, data)
  }

  static async eliminar(id: string): Promise<CrudResult<boolean>> {
    return ServicioCrudBase.eliminar(this.COLLECTION, id)
  }

  /**
   * Realiza una transición de estado atómica.
   */
  static async commitEstadoTransaccional(
    paseoId: string,
    esperado: string,
    nuevo: string,
    fields: Record<string, any> = {}
  ): Promise<CrudResult<void>> {
    const uid = ServicioAuth.obtenerUsuarioActual()?.uid
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    try {
      await runTransaction(db, async transaction => {
        const paseoRef = doc(db, this.COLLECTION, paseoId)
        const paseoDoc = await transaction.get(paseoRef)

        if (!paseoDoc.exists()) {
          throw new Error(ERR.COMUN.DOCUMENTO_NO_ENCONTRADO)
        }

        const data = paseoDoc.data() as Paseo

        if (data.estado !== esperado) {
          throw new Error(ERR.PASEOS.ESTADO_NO_ESPERADO)
        }

        transaction.update(paseoRef, {
          ...fields,
          estado: nuevo,
          actualizado_en: serverTimestamp(),
          actualizado_por: uid,
        })
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  static async registrarEvento(
    paseoId: string,
    evento: string,
    payload?: Record<string, any>
  ): Promise<CrudResult<void>> {
    const currentUser = ServicioAuth.obtenerUsuarioActual()
    try {
      const entry = {
        evento,
        payload: payload || {},
        actor: currentUser?.uid || null,
        creado_en: serverTimestamp(),
        creado_por: currentUser?.uid || null,
      }

      const { addDoc } = await import('firebase/firestore')
      const eventosCol = collection(db, this.COLLECTION, paseoId, 'eventos')
      await addDoc(eventosCol, entry)

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  static async buscarPaseos(
    filtros: { campo: string; op: any; valor: any }[],
    orden?: { campo: string; dir: 'asc' | 'desc' }
  ): Promise<CrudResult<Paseo[]>> {
    try {
      let q = query(collection(db, this.COLLECTION))
      for (const f of filtros) {
        q = query(q, where(f.campo, f.op, f.valor))
      }
      if (orden) {
        q = query(q, orderBy(orden.campo, orden.dir))
      }

      const snap = await getDocs(q)
      const results: Paseo[] = []
      snap.forEach(d => {
        results.push({ id: d.id, ...d.data() } as Paseo)
      })

      return { success: true, data: results }
    } catch (e: any) {
      return { success: false, error: mapFirebaseError(e) }
    }
  }
}
