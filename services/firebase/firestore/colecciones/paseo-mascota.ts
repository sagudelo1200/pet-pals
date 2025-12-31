import { db } from '@/firebase.config'
import {
  doc,
  writeBatch,
  collection,
  runTransaction,
  increment,
} from 'firebase/firestore'
import {
  nowServerTimestamp,
  toDomain,
  toDb,
  mapFirebaseError,
} from '@/services/firebase/comun'
import { ServicioAuth } from '@/services/firebase/auth/auth'
import type { Mascota } from '@/models/Mascota'
import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { MAX_MASCOTAS_POR_PASEO, ERR } from '@/constants'

import type { Ubicacion } from '@/models/Ubicacion'

// Subcolección: paseos/{paseoId}/mascotas/{mascotaId}
export async function addMascotasAlPaseo(
  paseoId: string,
  mascotaIds: string[],
  direccion?: Ubicacion
): Promise<{ success: true } | { success: false; error: string }> {
  const uid = ServicioAuth.obtenerUsuarioActual()?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  try {
    const batch = writeBatch(db)
    const col = collection(db, 'paseos', paseoId, 'mascotas')

    for (const mascotaId of mascotaIds) {
      // Obtener tutor real de la mascota para denormalizar
      const m = await ServicioCrudBase.obtenerPorId<Mascota>(
        'mascotas',
        mascotaId
      )
      if (!m.success || !m.data)
        return { success: false, error: ERR.MASCOTAS.MASCOTA_NO_ENCONTRADA }
      const ownerId = (m.data as any).creado_por || uid

      const ref = doc(col, mascotaId)
      const base = toDb({
        id: mascotaId,
        id_paseo: paseoId,
        id_mascota: mascotaId,
        id_usuario: ownerId,
        estado_mascota: 'pendiente',
        // Denormalización de dirección (snapshot enriquecido)
        direccion: direccion
          ? {
              id_origen: direccion.id,
              alias: direccion.alias,
              direccion_formateada: direccion.direccion_formateada,
              coordenadas: {
                latitude: Number(direccion.coordenadas.latitude),
                longitude: Number(direccion.coordenadas.longitude),
              },
              instrucciones: direccion.instrucciones || null,
            }
          : null,
      })

      // Añadir timestamps manuales (sentinelas) después del toDb para que no se conviertan
      const finalData = {
        ...base,
        creado_en: nowServerTimestamp(),
        actualizado_en: nowServerTimestamp(),
        creado_por: uid,
        actualizado_por: uid,
      }

      batch.set(ref, finalData)
    }

    await batch.commit()
    return { success: true }
  } catch (e: any) {
    return { success: false, error: mapFirebaseError(e) }
  }
}

// Agregar UNA mascota con validaciones y contador transaccional
export async function addMascotaAlPaseo(
  paseoId: string,
  mascotaId: string
): Promise<{ success: true } | { success: false; error: string }> {
  // Service: perform atomic add + increment; validation must live in logic layer.
  const uid = ServicioAuth.obtenerUsuarioActual()?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  if (!mascotaId)
    return { success: false, error: ERR.MASCOTAS.MASCOTA_REQUERIDA }

  const paseoRef = doc(db, 'paseos', paseoId)
  const subRef = doc(collection(db, 'paseos', paseoId, 'mascotas'), mascotaId)

  try {
    await runTransaction(db, async tx => {
      const paseoSnap = await tx.get(paseoRef)
      if (!paseoSnap.exists()) throw new Error(ERR.PASEOS.PASEO_NO_ENCONTRADO)

      // Duplicado: si ya existe el subdocumento, abortamos
      const subSnap = await tx.get(subRef)
      if (subSnap.exists()) throw new Error(ERR.MASCOTAS.MASCOTA_YA_AGREGADA)

      // Obtener mascota para denormalizar owner
      const m = await ServicioCrudBase.obtenerPorId<Mascota>(
        'mascotas',
        mascotaId
      )
      const ownerId =
        m.success && m.data ? (m.data as any).creado_por || uid : uid

      tx.set(subRef, {
        id: mascotaId,
        id_paseo: paseoId,
        id_mascota: mascotaId,
        id_usuario: ownerId,
        estado_mascota: 'pendiente',
        creado_en: nowServerTimestamp(),
        actualizado_en: nowServerTimestamp(),
        creado_por: uid,
        actualizado_por: uid,
      })
      tx.update(paseoRef, { mascotas_count: increment(1) })
    })

    return { success: true }
  } catch (e: any) {
    return { success: false, error: mapFirebaseError(e) }
  }
}
