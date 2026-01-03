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
  toDb,
  mapFirebaseError,
} from '@/services/firebase/comun'
import { ServicioAuth } from '@/services/firebase/auth/auth'
import { ERR } from '@/constants'

/**
 * Servicio de persistencia para la relación Paseo-Mascota.
 * Solo realiza operaciones atómicas en la base de datos.
 * La lógica de negocio y denormalización debe venir preparada desde /logic.
 */
export class ServicioPaseoMascota {
  /**
   * Agrega múltiples mascotas a un paseo en un solo batch.
   * @param paseoId ID del paseo
   * @param mascotasData Array de objetos con la data ya denormalizada y lista para guardar
   */
  static async commitMascotasBatch(
    paseoId: string,
    mascotasData: any[]
  ): Promise<{ success: true } | { success: false; error: string }> {
    const uid = ServicioAuth.obtenerUsuarioActual()?.uid
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    try {
      const batch = writeBatch(db)
      const col = collection(db, 'paseos', paseoId, 'mascotas')

      for (const data of mascotasData) {
        const ref = doc(col, data.id)
        const finalData = {
          ...toDb(data),
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

  /**
   * Agrega una mascota y aumenta el contador del paseo de forma transaccional.
   */
  static async commitMascotaTransaccional(
    paseoId: string,
    mascotaId: string,
    data: any
  ): Promise<{ success: true } | { success: false; error: string }> {
    const uid = ServicioAuth.obtenerUsuarioActual()?.uid
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    const paseoRef = doc(db, 'paseos', paseoId)
    const subRef = doc(collection(db, 'paseos', paseoId, 'mascotas'), mascotaId)

    try {
      await runTransaction(db, async tx => {
        const subSnap = await tx.get(subRef)
        if (subSnap.exists()) throw new Error(ERR.MASCOTAS.MASCOTA_YA_AGREGADA)

        tx.set(subRef, {
          ...toDb(data),
          creado_en: nowServerTimestamp(),
          actualizado_en: nowServerTimestamp(),
          creado_por: uid,
          actualizado_por: uid,
        })
        tx.update(paseoRef, {
          mascotas_count: increment(1),
          actualizado_en: nowServerTimestamp(),
          actualizado_por: uid,
        })
      })

      return { success: true }
    } catch (e: any) {
      return { success: false, error: mapFirebaseError(e) }
    }
  }
}
