import { ServicioCrudBase } from './crud'
import { Paseo } from '../../models/Paseo'
import { CrudResult } from './types'
import { ServicioAuth } from './auth'
import type { Mascota } from '@/models/Mascota'
import { addMascotasAlPaseo } from './paseo-mascota'
import { MAX_MASCOTAS_POR_PASEO, ERR } from '@/constants'
import { mapFirebaseError } from './errors'

export class ServicioPaseo {
  private static readonly COLLECTION = 'paseos'

  static async crear(
    data: Omit<
      Paseo,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Paseo>> {
    const currentUser = ServicioAuth.obtenerUsuarioActual()
    const uid = currentUser?.uid
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    // Enforce que el dueño del paseo sea el usuario actual
    const payload: typeof data & { creado_por: string } = {
      ...data,
      creado_por: uid,
    }

    return ServicioCrudBase.crear<Paseo>(this.COLLECTION, payload as any)
  }

  /**
   * Crear paseo con 0..N mascotas (N <= MAX_MASCOTAS_POR_PASEO)
   * Si N=0, paseo propuesto por paseador; si N>0, se crean subdocs en 'mascotas'.
   */
  static async crearConMascotas(
    data: Omit<
      Paseo,
      | 'id'
      | 'creado_en'
      | 'actualizado_en'
      | 'creado_por'
      | 'actualizado_por'
      | 'mascotas_count'
    >,
    mascotaIds: string[]
  ): Promise<CrudResult<Paseo>> {
    const current = ServicioAuth.obtenerUsuarioActual()
    const uid = current?.uid
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    // Validaciones básicas de mascotaIds
    const unique = Array.from(new Set((mascotaIds || []).filter(Boolean)))
    // Cupo: mínimo entre el máximo permitido y el solicitado en 'data' (si existe)
    const maxPaseo =
      typeof (data as any).cupo_maximo_mascotas === 'number'
        ? (data as any).cupo_maximo_mascotas
        : MAX_MASCOTAS_POR_PASEO
    const max = Math.min(MAX_MASCOTAS_POR_PASEO, maxPaseo)
    // Validación de cupo: si se excede el límite, devolver error
    if (unique.length > max)
      return { success: false, error: ERR.PASEOS.LIMITE_DE_MASCOTAS_SUPERADO }

    // Validar que todas las mascotas pertenecen al usuario actual (si hay)
    if (unique.length > 0) {
      for (const mid of unique) {
        const m = await ServicioCrudBase.obtenerPorId<Mascota>('mascotas', mid)
        if (!m.success || !m.data)
          return { success: false, error: ERR.MASCOTAS.MASCOTA_NO_ENCONTRADA }
        const ownerOk = (m.data as any).creado_por === uid
        if (!ownerOk)
          return {
            success: false,
            error: ERR.MASCOTAS.MASCOTA_NO_PERTENECE_AL_USUARIO,
          }
      }
    }

    // Crear paseo
    const paseoRes = await ServicioCrudBase.crear<Paseo>(this.COLLECTION, {
      ...(data as any),
      creado_por: uid,
      // Si no vienen mascotas: por defecto es múltiple (propuesta de paseador)
      es_multiple: (data as any).es_multiple ?? unique.length !== 1,
      cupo_maximo_mascotas: max,
      mascotas_count: unique.length,
    } as any)

    if (!paseoRes.success || !paseoRes.data) return paseoRes

    // Crear subdocumentos por mascota (si aplica)
    if (unique.length > 0) {
      const addRes = await addMascotasAlPaseo(paseoRes.data.id, unique)
      if (!addRes.success)
        return { success: false, error: (addRes as any).error }
    }

    return paseoRes
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

  // Métodos específicos
  static async obtenerPorPaseador(
    paseadorId: string
  ): Promise<CrudResult<Paseo[]>> {
    return ServicioCrudBase.buscar<Paseo>(
      this.COLLECTION,
      'id_paseador',
      paseadorId
    )
  }

  static async obtenerPorMascota(
    mascotaId: string
  ): Promise<CrudResult<Paseo[]>> {
    // Buscar paseos donde la mascota participe usando collectionGroup sobre la subcolección 'mascotas'
    try {
      const { db } = await import('@/firebase.config')
      const { collectionGroup, query, where, getDocs, documentId } =
        await import('firebase/firestore')

      const q = query(
        collectionGroup(db, 'mascotas'),
        where(documentId(), '==', mascotaId)
      )
      const snap = await getDocs(q)
      const paseoIds = new Set<string>()
      snap.forEach(d => {
        const parent = d.ref.parent.parent
        if (parent) paseoIds.add(parent.id)
      })

      const results: Paseo[] = []
      for (const id of paseoIds) {
        const res = await ServicioCrudBase.obtenerPorId<Paseo>(
          this.COLLECTION,
          id
        )
        if (res.success && res.data) results.push(res.data)
      }
      return { success: true, data: results }
    } catch (e: any) {
      return { success: false, error: mapFirebaseError(e) }
    }
  }

  static async obtenerPorEstado(estado: string): Promise<CrudResult<Paseo[]>> {
    return ServicioCrudBase.buscar<Paseo>(this.COLLECTION, 'estado', estado)
  }
}
