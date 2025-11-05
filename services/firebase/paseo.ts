import { BaseCrudService } from './crud'
import { Paseo } from '../../models/Paseo'
import { CrudResult } from './types'
import { AuthService } from './auth'
import type { Mascota } from '@/models/Mascota'
import { addMascotasAlPaseo } from './paseo-mascota'
import { MAX_MASCOTAS_POR_PASEO, ERR } from '@/constants'

export class PaseoService {
  private static readonly COLLECTION = 'paseos'

  static async create(
    data: Omit<
      Paseo,
      'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
    >
  ): Promise<CrudResult<Paseo>> {
    const currentUser = AuthService.getCurrentUser()
    const uid = currentUser?.uid
    if (!uid) return { success: false, error: ERR.NO_AUTENTICADO }

    // Enforce que el dueño del paseo sea el usuario actual
    const payload: typeof data & { creado_por: string } = {
      ...data,
      creado_por: uid,
    }

    return BaseCrudService.create<Paseo>(this.COLLECTION, payload as any)
  }

  /**
   * Crear paseo con 0..N mascotas (N <= MAX_MASCOTAS_POR_PASEO)
   * Si N=0, paseo propuesto por paseador; si N>0, se crean subdocs en 'mascotas'.
   */
  static async createConMascotas(
    data: Omit<
      Paseo,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'createdBy'
      | 'updatedBy'
      | 'mascotas_count'
    >,
    mascotaIds: string[]
  ): Promise<CrudResult<Paseo>> {
    const current = AuthService.getCurrentUser()
    const uid = current?.uid
    if (!uid) return { success: false, error: ERR.NO_AUTENTICADO }

    // Validaciones básicas de mascotaIds
    const unique = Array.from(new Set((mascotaIds || []).filter(Boolean)))
    // Cupo: mínimo entre global y el solicitado en data (si existe)
    const maxPaseo =
      typeof (data as any).cupo_maximo_mascotas === 'number'
        ? (data as any).cupo_maximo_mascotas
        : MAX_MASCOTAS_POR_PASEO
    const max = Math.min(MAX_MASCOTAS_POR_PASEO, maxPaseo)
    if (unique.length > max)
      return { success: false, error: ERR.LIMITE_DE_MASCOTAS_SUPERADO }

    // Validar que todas las mascotas pertenecen al usuario actual (si hay)
    if (unique.length > 0) {
      for (const mid of unique) {
        const m = await BaseCrudService.getById<Mascota>('mascotas', mid)
        if (!m.success || !m.data)
          return { success: false, error: ERR.MASCOTA_NO_ENCONTRADA }
        const ownerOk = m.data.id_usuario === uid || m.data.createdBy === uid
        if (!ownerOk)
          return { success: false, error: ERR.MASCOTA_NO_PERTENECE_AL_USUARIO }
      }
    }

    // Crear paseo
    const paseoRes = await BaseCrudService.create<Paseo>(this.COLLECTION, {
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

  static async getById(id: string): Promise<CrudResult<Paseo>> {
    return BaseCrudService.getById<Paseo>(this.COLLECTION, id)
  }

  static async update(
    id: string,
    data: Partial<Omit<Paseo, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<CrudResult<Paseo>> {
    return BaseCrudService.update<Paseo>(this.COLLECTION, id, data)
  }

  static async delete(id: string): Promise<CrudResult<boolean>> {
    return BaseCrudService.delete(this.COLLECTION, id)
  }

  static async getAll(): Promise<CrudResult<Paseo[]>> {
    return BaseCrudService.getAll<Paseo>(this.COLLECTION)
  }

  // Métodos específicos
  static async getByPaseador(paseadorId: string): Promise<CrudResult<Paseo[]>> {
    return BaseCrudService.getWhere<Paseo>(
      this.COLLECTION,
      'id_paseador',
      paseadorId
    )
  }

  static async getByMascota(mascotaId: string): Promise<CrudResult<Paseo[]>> {
    // Buscar paseos donde la mascota participe vía collectionGroup sobre subcolección 'mascotas'
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
        const res = await BaseCrudService.getById<Paseo>(this.COLLECTION, id)
        if (res.success && res.data) results.push(res.data)
      }
      return { success: true, data: results }
    } catch (e: any) {
      const code = e?.code as string | undefined
      if (code === 'permission-denied')
        return { success: false, error: ERR.PERMISOS_INSUFICIENTES }
      if (code === 'unauthenticated')
        return { success: false, error: ERR.NO_AUTENTICADO }
      const msg = e?.message as string | undefined
      const isErrCode = msg && (Object as any).values(ERR).includes(msg)
      return {
        success: false,
        error: isErrCode ? (msg as any) : ERR.ERROR_DESCONOCIDO,
      }
    }
  }

  static async getByEstado(estado: string): Promise<CrudResult<Paseo[]>> {
    return BaseCrudService.getWhere<Paseo>(this.COLLECTION, 'estado', estado)
  }
}
