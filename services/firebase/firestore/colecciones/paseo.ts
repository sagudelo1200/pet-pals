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
} from 'firebase/firestore'
import { db } from '@/firebase.config'

export class ServicioPaseo {
  private static readonly COLLECTION = 'paseos'

  static getQuerySolicitudesPendientes(): Query {
    const { limit } = require('firebase/firestore')
    return query(
      collection(db, this.COLLECTION),
      where('estado', '==', ESTADOS_PASEO.PENDIENTE),
      orderBy('creado_en', 'desc'),
      limit(30)
    )
  }

  static async crear(
    data: Omit<
      Paseo,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Paseo>> {
    const currentUser = ServicioAuth.obtenerUsuarioActual()
    const uid = currentUser?.uid
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    const payload: typeof data & { creado_por: string } = {
      ...data,
      creado_por: uid,
    }

    return ServicioCrudBase.crear<Paseo>(this.COLLECTION, payload as any)
  }

  static async aceptarSolicitud(paseoId: string): Promise<CrudResult<void>> {
    const currentUser = ServicioAuth.obtenerUsuarioActual()
    if (!currentUser) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    const fields: Record<string, any> = {
      id_cuidador: currentUser.uid,
      cuidador_nombre_visual: currentUser.displayName || 'Cuidador',
      cuidador_foto_visual: currentUser.photoURL || null,
      actualizado_por: currentUser.uid,
    }

    return this.transicionarEstado(
      paseoId,
      ESTADOS_PASEO.PENDIENTE,
      ESTADOS_PASEO.CONFIRMADO,
      fields
    )
  }

  static async crearConMascotas(): Promise<CrudResult<Paseo>> {
    // Deprecated: orchestration must live in /logic. Use `@/logic/paseos`.
    return { success: false, error: 'DEPRECATED: usar @/logic/paseos' }
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

  static async obtenerTodos(): Promise<CrudResult<Paseo[]>> {
    return ServicioCrudBase.obtenerTodos<Paseo>(this.COLLECTION)
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
      }

      const { collection, addDoc } = await import('firebase/firestore')
      const eventosCol = collection(db, this.COLLECTION, paseoId, 'eventos')
      await addDoc(eventosCol, {
        ...entry,
        creado_por: currentUser?.uid || null,
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  static async obtenerPorCuidador(
    cuidadorId: string
  ): Promise<CrudResult<Paseo[]>> {
    return ServicioCrudBase.buscar<Paseo>(
      this.COLLECTION,
      'id_cuidador',
      cuidadorId
    )
  }

  static async obtenerPorMascota(
    mascotaId: string
  ): Promise<CrudResult<Paseo[]>> {
    try {
      const { db } = await import('@/firebase.config')
      const { collection, query, where, getDocs, orderBy } =
        await import('firebase/firestore')

      const q = query(
        collection(db, this.COLLECTION),
        where('mascota_ids', 'array-contains', mascotaId),
        orderBy('fecha_hora_inicio', 'desc')
      )

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

  static async obtenerPorEstado(estado: string): Promise<CrudResult<Paseo[]>> {
    return ServicioCrudBase.buscar<Paseo>(this.COLLECTION, 'estado', estado)
  }

  static async actualizarEstado(
    id: string,
    nuevoEstado: string,
    meta: Record<string, any> = {}
  ): Promise<CrudResult<Paseo>> {
    const data: any = {
      estado: nuevoEstado,
      ...meta,
    }
    return this.actualizar(id, data)
  }

  static async obtenerPorCuidadorYEstado(
    cuidadorId: string,
    estados: string[]
  ): Promise<CrudResult<Paseo[]>> {
    try {
      const { db } = await import('@/firebase.config')
      const { collection, query, where, getDocs } =
        await import('firebase/firestore')

      const q = query(
        collection(db, this.COLLECTION),
        where('id_cuidador', '==', cuidadorId),
        where('estado', 'in', estados)
      )

      const snapshot = await getDocs(q)
      const paseos: Paseo[] = []
      snapshot.forEach(doc => {
        paseos.push({ id: doc.id, ...doc.data() } as Paseo)
      })

      return { success: true, data: paseos }
    } catch (e: any) {
      return { success: false, error: mapFirebaseError(e) }
    }
  }

  static async asignarCuidador(
    paseoId: string,
    cuidadorId: string
  ): Promise<CrudResult<Paseo>> {
    return this.actualizar(paseoId, {
      id_cuidador: cuidadorId,
    })
  }

  static async iniciarRuta(paseoId: string): Promise<CrudResult<void>> {
    const currentUser = ServicioAuth.obtenerUsuarioActual()
    if (!currentUser) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }
    return this.transicionarEstado(
      paseoId,
      ESTADOS_PASEO.CONFIRMADO,
      ESTADOS_PASEO.EN_CAMINO,
      {
        actualizado_por: currentUser.uid,
      }
    )
  }

  static async iniciarPaseo(paseoId: string): Promise<CrudResult<void>> {
    const currentUser = ServicioAuth.obtenerUsuarioActual()
    if (!currentUser) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }
    return this.transicionarEstado(
      paseoId,
      ESTADOS_PASEO.EN_CAMINO,
      ESTADOS_PASEO.EN_PROGRESO,
      {
        fecha_inicio_real: serverTimestamp(),
        actualizado_por: currentUser.uid,
      }
    )
  }

  static async finalizarPaseo(paseoId: string): Promise<CrudResult<void>> {
    const currentUser = ServicioAuth.obtenerUsuarioActual()
    if (!currentUser) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }
    return this.transicionarEstado(
      paseoId,
      ESTADOS_PASEO.EN_PROGRESO,
      ESTADOS_PASEO.FINALIZADO,
      {
        fecha_fin_real: serverTimestamp(),
        actualizado_por: currentUser.uid,
      }
    )
  }

  static async transicionarEstado(
    paseoId: string,
    esperado: string,
    nuevo: string,
    fields: Record<string, any> = {}
  ): Promise<CrudResult<void>> {
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
          // actualizado_por se debe pasar explícitamente en fields si se desea
        })
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }
}
