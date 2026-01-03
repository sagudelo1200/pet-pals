import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { Paseo, ESTADOS_PASEO } from '@/models/Paseo'
import {
  CrudResult,
  mapFirebaseError,
  camposSistemaActualizar,
  camposSistemaCrear,
} from '@/services/firebase/comun'
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
  getDocs,
} from 'firebase/firestore'
import { db } from '@/firebase.config'

/**
 * Servicio de persistencia para Paseos.
 * Solo realiza operaciones CRUD y transiciones atómicas.
 */
export class ServicioPaseo {
  private static readonly COLLECTION = 'paseos'
  // Buffer local para eventos creados por el cliente y aún no confirmados por el servidor
  private static pendingEventos: Map<string, any[]> = new Map()

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

        // Generar campos de sistema de actualización
        const updateFields = camposSistemaActualizar(uid)

        transaction.update(paseoRef, {
          ...fields,
          estado: nuevo,
          ...updateFields,
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
    if (!currentUser) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    try {
      // Crear una entrada local optimista para mostrar inmediatamente en UI
      const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const localEntry: any = {
        id: localId,
        evento,
        payload: payload || {},
        actor: currentUser.uid,
        creado_en: new Date(), // fecha local hasta confirmación del servidor
        _local: true,
      }
      // Push a buffer
      const buf = this.pendingEventos.get(paseoId) || []
      buf.unshift(localEntry)
      this.pendingEventos.set(paseoId, buf)

      // Usar campos del sistema consistente con el resto del proyecto
      const camposSistema = camposSistemaCrear(currentUser.uid)
      const entry = {
        evento,
        payload: payload || {},
        actor: currentUser.uid,
        ...camposSistema,
      }

      const { addDoc } = await import('firebase/firestore')
      const eventosCol = collection(db, this.COLLECTION, paseoId, 'eventos')
      await addDoc(eventosCol, entry)

      // Al confirmarse en el servidor, eliminamos el local optimista
      const remain = (this.pendingEventos.get(paseoId) || []).filter(
        (e: any) => e.id !== localId
      )
      if (remain.length) this.pendingEventos.set(paseoId, remain)
      else this.pendingEventos.delete(paseoId)

      return { success: true }
    } catch (error) {
      // En caso de error, eliminar el optimista y propagar el error
      const before = this.pendingEventos.get(paseoId) || []
      const after = before.filter((e: any) => !e._local)
      if (after.length) this.pendingEventos.set(paseoId, after)
      else this.pendingEventos.delete(paseoId)
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  static obtenerEventosPendientes(paseoId: string) {
    return (this.pendingEventos.get(paseoId) || []).slice()
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
