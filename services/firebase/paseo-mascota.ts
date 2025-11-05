import { db } from '@/firebase.config'
import {
  doc,
  writeBatch,
  collection,
  runTransaction,
  increment,
} from 'firebase/firestore'
import { nowServerTimestamp } from './converters'
import { AuthService } from './auth'
import type { Mascota } from '@/models/Mascota'
import { BaseCrudService } from './crud'
import { MAX_MASCOTAS_POR_PASEO, ERR } from '@/constants'

// Subcolección: paseos/{paseoId}/mascotas/{mascotaId}
export async function addMascotasAlPaseo(
  paseoId: string,
  mascotaIds: string[]
): Promise<{ success: true } | { success: false; error: string }> {
  const uid = AuthService.getCurrentUser()?.uid
  if (!uid) return { success: false, error: ERR.NO_AUTENTICADO }

  try {
    const batch = writeBatch(db)
    const col = collection(db, 'paseos', paseoId, 'mascotas')

    for (const mascotaId of mascotaIds) {
      // Obtener dueño real de la mascota para denormalizar
      const m = await BaseCrudService.getById<Mascota>('mascotas', mascotaId)
      if (!m.success || !m.data)
        return { success: false, error: ERR.MASCOTA_NO_ENCONTRADA }
      const ownerId = m.data.id_usuario || m.data.createdBy || uid

      const ref = doc(col, mascotaId)
      const base = {
        id_paseo: paseoId,
        id_mascota: mascotaId,
        id_usuario: ownerId,
        estado_mascota: 'pendiente',
        createdAt: nowServerTimestamp(),
        updatedAt: nowServerTimestamp(),
        createdBy: uid,
        updatedBy: uid,
      }
      // Importante: no envolver FieldValue (serverTimestamp) con toDb
      batch.set(ref, base)
    }

    await batch.commit()
    return { success: true }
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

// Agregar UNA mascota con validaciones y contador transaccional
export async function addMascotaAlPaseo(
  paseoId: string,
  mascotaId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const uid = AuthService.getCurrentUser()?.uid
  if (!uid) return { success: false, error: ERR.NO_AUTENTICADO }
  if (!mascotaId) return { success: false, error: ERR.MASCOTA_REQUERIDA }

  // Validar que la mascota exista y sea del usuario actual
  const m = await BaseCrudService.getById<Mascota>('mascotas', mascotaId)
  if (!m.success || !m.data)
    return { success: false, error: ERR.MASCOTA_NO_ENCONTRADA }
  const ownerOk = m.data.id_usuario === uid || m.data.createdBy === uid
  if (!ownerOk)
    return { success: false, error: ERR.MASCOTA_NO_PERTENECE_AL_USUARIO }

  const paseoRef = doc(db, 'paseos', paseoId)
  const subRef = doc(collection(db, 'paseos', paseoId, 'mascotas'), mascotaId)

  try {
    await runTransaction(db, async tx => {
      const paseoSnap = await tx.get(paseoRef)
      if (!paseoSnap.exists()) throw new Error(ERR.PASEO_NO_ENCONTRADO)
      const paseo = paseoSnap.data() as any

      // Verificar estado y es_multiple
      const estado = paseo.estado as string
      const esMultiple = !!paseo.es_multiple
      if (!esMultiple) throw new Error(ERR.PASEO_NO_ES_MULTIPLE)
      if (!(estado === 'pendiente' || estado === 'confirmado')) {
        throw new Error(ERR.ESTADO_DEL_PASEO_NO_ACEPTA_MASCOTAS)
      }

      // Cupo: mínimo entre global y cupo del paseo (si existe)
      const maxGlobal = MAX_MASCOTAS_POR_PASEO
      const maxPaseo =
        typeof paseo.cupo_maximo_mascotas === 'number'
          ? paseo.cupo_maximo_mascotas
          : maxGlobal
      const max = Math.min(maxGlobal, maxPaseo)

      const count =
        typeof paseo.mascotas_count === 'number' ? paseo.mascotas_count : 0
      if (count >= max) throw new Error(ERR.LIMITE_DE_MASCOTAS_SUPERADO)

      // Duplicado
      const subSnap = await tx.get(subRef)
      if (subSnap.exists()) throw new Error(ERR.MASCOTA_YA_AGREGADA)

      // Crear subdoc (con denormalización) y aumentar contador
      // Importante: no envolver FieldValue (serverTimestamp) con toDb
      tx.set(subRef, {
        id_paseo: paseoId,
        id_mascota: mascotaId,
        id_usuario: m.data.id_usuario || m.data.createdBy || uid,
        estado_mascota: 'pendiente',
        createdAt: nowServerTimestamp(),
        updatedAt: nowServerTimestamp(),
        createdBy: uid,
        updatedBy: uid,
      })
      tx.update(paseoRef, { mascotas_count: increment(1) })
    })

    return { success: true }
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
