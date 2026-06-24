import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { Mascota } from '@/models/Mascota'
import { CrudResult } from '@/services/firebase/comun'
import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  doc,
} from 'firebase/firestore'
import { db } from '@/firebase.config'

export class ServicioMascota {
  private static readonly COLLECTION = 'mascotas'

  static async crear(
    data: Omit<
      Mascota,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Mascota>> {
    const payload = { ...data } as any
    return ServicioCrudBase.crear<Mascota>(this.COLLECTION, payload)
  }

  static async obtenerPorId(id: string): Promise<CrudResult<Mascota>> {
    return ServicioCrudBase.obtenerPorId<Mascota>(this.COLLECTION, id)
  }

  static async actualizar(
    id: string,
    data: Partial<Omit<Mascota, 'id' | 'creado_en' | 'creado_por'>>
  ): Promise<CrudResult<Mascota>> {
    return ServicioCrudBase.actualizar<Mascota>(this.COLLECTION, id, data)
  }

  static async eliminar(id: string): Promise<CrudResult<boolean>> {
    return ServicioCrudBase.eliminar(this.COLLECTION, id)
  }

  // Métodos específicos
  static async obtenerPorUsuario(
    userId: string
  ): Promise<CrudResult<Mascota[]>> {
    return ServicioCrudBase.buscar<Mascota>(
      this.COLLECTION,
      'creado_por',
      userId
    )
  }

  /**
   * Listener en tiempo real para mascotas de un usuario.
   * Retorna función para cancelar la suscripción.
   */
  static escucharPorUsuario(
    userId: string,
    onData: (mascotas: Mascota[]) => void,
    onError: (error: string) => void
  ): Unsubscribe {
    const mascotasRef = collection(db, this.COLLECTION)
    const q = query(mascotasRef, where('creado_por', '==', userId))

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const mascotasData = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            // Normalizar fechas si es necesario
            fecha_nacimiento:
              data.fecha_nacimiento instanceof Date
                ? data.fecha_nacimiento
                : data.fecha_nacimiento?.toDate?.() ||
                  (data.fecha_nacimiento
                    ? new Date(data.fecha_nacimiento)
                    : null),
            creado_en:
              data.creado_en instanceof Date
                ? data.creado_en
                : data.creado_en?.toDate?.(),
            actualizado_en:
              data.actualizado_en instanceof Date
                ? data.actualizado_en
                : data.actualizado_en?.toDate?.(),
            vacunas: (data.vacunas || []).map((v: any) => ({
              ...v,
              fecha:
                v.fecha instanceof Date
                  ? v.fecha
                  : v.fecha?.toDate?.() || (v.fecha ? new Date(v.fecha) : null),
            })),
          } as Mascota
        })
        onData(mascotasData)
      },
      err => {
        console.error('Error en listener de mascotas:', err)
        onError(err.message || 'Error desconocido')
      }
    )

    return unsubscribe
  }

  /**
   * Listener en tiempo real para una mascota específica por ID.
   * Retorna función para cancelar la suscripción.
   */
  static escucharPorId(
    mascotaId: string,
    onData: (mascota: Mascota) => void,
    onError: (error: string) => void
  ): Unsubscribe {
    const docRef = doc(db, this.COLLECTION, mascotaId)

    const unsubscribe = onSnapshot(
      docRef,
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data() as any
          const mascota: Mascota = {
            id: snapshot.id,
            nombre: data.nombre || '',
            especie: data.especie || '',
            creado_por: data.creado_por || '',
            actualizado_por: data.actualizado_por || '',
            ...data,
            fecha_nacimiento:
              data.fecha_nacimiento instanceof Date
                ? data.fecha_nacimiento
                : data.fecha_nacimiento?.toDate?.() ||
                  (data.fecha_nacimiento
                    ? new Date(data.fecha_nacimiento)
                    : null),
            creado_en:
              data.creado_en instanceof Date
                ? data.creado_en
                : data.creado_en?.toDate?.(),
            actualizado_en:
              data.actualizado_en instanceof Date
                ? data.actualizado_en
                : data.actualizado_en?.toDate?.(),
            vacunas: (data.vacunas || []).map((v: any) => ({
              ...v,
              fecha:
                v.fecha instanceof Date
                  ? v.fecha
                  : v.fecha?.toDate?.() || (v.fecha ? new Date(v.fecha) : null),
            })),
          }
          onData(mascota)
        }
      },
      err => {
        console.error('Error en listener de mascota:', err)
        onError(err.message || 'Error desconocido')
      }
    )

    return unsubscribe
  }
}
