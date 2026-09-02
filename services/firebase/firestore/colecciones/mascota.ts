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
  getDocs,
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
  /**
   * Obtiene todas las mascotas de un usuario (creadas por él O donde está en ids_tutores).
   * Usa dos queries en paralelo ya que Firestore no soporta OR directo.
   *
   * MULTI-TUTOR: Retorna mascotas donde:
   * 1. creado_por == userId (propietario)
   * 2. userId está en ids_tutores (tutor compartido)
   */
  static async obtenerPorUsuario(
    userId: string
  ): Promise<CrudResult<Mascota[]>> {
    try {
      // Query 1: Mascotas donde creado_por == userId
      const q1 = query(
        collection(db, this.COLLECTION),
        where('creado_por', '==', userId)
      )
      const snap1 = await getDocs(q1)
      const resultados1 = snap1.docs.map(doc => doc.data() as Mascota)

      // Query 2: Mascotas donde userId está en ids_tutores
      const q2 = query(
        collection(db, this.COLLECTION),
        where('ids_tutores', 'array-contains', userId)
      )
      const snap2 = await getDocs(q2)
      const resultados2 = snap2.docs.map(doc => doc.data() as Mascota)

      // Deduplicar por ID (una mascota puede estar en ambas queries si el creador se agregó a ids_tutores)
      const mascotasMap = new Map<string, Mascota>()
      for (const m of [...resultados1, ...resultados2]) {
        mascotasMap.set(m.id, m)
      }

      return {
        success: true,
        data: Array.from(mascotasMap.values()),
      }
    } catch (error: any) {
      console.error('[ServicioMascota.obtenerPorUsuario] Error:', error)
      return {
        success: false,
        error: error?.message || 'Error obteniendo mascotas del usuario',
      }
    }
  }

  /**
   * Listener en tiempo real para mascotas de un usuario (multi-tutor).
   * Retorna función para cancelar la suscripción.
   *
   * MULTI-TUTOR: Escucha cambios en:
   * 1. Mascotas donde creado_por == userId
   * 2. Mascotas donde userId está en ids_tutores
   */
  static escucharPorUsuario(
    userId: string,
    onData: (_mascotas: Mascota[]) => void,
    onError: (_error: string) => void
  ): Unsubscribe {
    const mascotasRef = collection(db, this.COLLECTION)
    const q1 = query(mascotasRef, where('creado_por', '==', userId))
    const q2 = query(
      mascotasRef,
      where('ids_tutores', 'array-contains', userId)
    )

    let datos1: Mascota[] = []
    let datos2: Mascota[] = []
    let unsub1: Unsubscribe | null = null
    let unsub2: Unsubscribe | null = null

    const emitirDatos = () => {
      // Deduplicar por ID
      const mascotasMap = new Map<string, Mascota>()
      for (const m of [...datos1, ...datos2]) {
        mascotasMap.set(m.id, m)
      }
      onData(Array.from(mascotasMap.values()))
    }

    const normalizarMascotas = (docs: any[]) =>
      docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
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
        } as Mascota
      })

    unsub1 = onSnapshot(
      q1,
      snapshot => {
        datos1 = normalizarMascotas(snapshot.docs)
        emitirDatos()
      },
      _err => {
        console.error('Error en listener de mascotas (creadas):', _err)
        onError(_err.message || 'Error desconocido')
      }
    )

    unsub2 = onSnapshot(
      q2,
      snapshot => {
        datos2 = normalizarMascotas(snapshot.docs)
        emitirDatos()
      },
      _err => {
        console.error('Error en listener de mascotas (compartidas):', _err)
        onError(_err.message || 'Error desconocido')
      }
    )

    // Retornar unsubscribe que cierre ambas listeners
    return () => {
      if (unsub1) unsub1()
      if (unsub2) unsub2()
    }
  }

  /**
   * Listener en tiempo real para una mascota específica por ID.
   * Retorna función para cancelar la suscripción.
   */
  static escucharPorId(
    mascotaId: string,
    onData: (_mascota: Mascota) => void,
    onError: (_error: string) => void
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
