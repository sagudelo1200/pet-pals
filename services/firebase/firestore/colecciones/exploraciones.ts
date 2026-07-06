import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { ExploracionTerritorial } from '@/models/ExploracionTerritorial'
import { ServicioTerritorio } from '@/services/territorio'
import { ESTADO_INICIAL_EXPLORACION } from '@/constants'
import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  orderBy,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import {
  CrudResult,
  camposSistemaCrear,
  mapFirebaseError,
  toDb,
} from '@/services/firebase/comun'

export class ServicioExploracionTerritorial {
  private static readonly COLLECTION = 'exploraciones'

  /**
   * Crear una nueva exploración territorial
   * NOTA: Las coordenadas se guardan como objeto plano {latitude, longitude}, NO como GeoPoint,
   * para cumplir con las validaciones de Firestore Rules
   * @param uid (Requerido) UID del usuario creador para consistencia en creado_por
   */
  static async crear(
    data: Omit<
      ExploracionTerritorial,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >,
    uid?: string
  ): Promise<CrudResult<ExploracionTerritorial>> {
    try {
      // Generar campos de sistema con el UID explícito
      const base = camposSistemaCrear(uid)

      if (!base.creado_por) {
        return { success: false, error: 'NO_AUTENTICADO' }
      }

      // Generar ID
      const colRef = collection(db, this.COLLECTION)
      const docRef = doc(colRef)
      const id = docRef.id

      // Filtrar campos undefined (Firestore no los permite)
      const dataFiltered = Object.entries(data).reduce(
        (acc: any, [key, value]) => {
          if (value !== undefined) {
            acc[key] = value
          }
          return acc
        },
        {}
      )

      // Obtener contexto territorial (H3 R8 + R9 desde Servicio)
      const contexto = ServicioTerritorio.obtenerContextoTerritorial(
        dataFiltered.coordenadas.latitude,
        dataFiltered.coordenadas.longitude
      )

      // Usar toDb() para convertir coordenadas a GeoPoint automáticamente
      const dataPersistido = toDb({
        ...dataFiltered,
        h3_index: contexto.h3_index,
        h3_observacion: contexto.h3_observacion,
        estado: ESTADO_INICIAL_EXPLORACION,
      })

      // Preparar documento final
      const docData = {
        id,
        ...dataPersistido,
        ...base,
      } as any

      // Guardar
      await setDoc(docRef, docData)

      // Re-leer para retornar
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        return {
          success: true,
          data: { id, ...docSnap.data() } as ExploracionTerritorial,
        }
      }

      return {
        success: true,
        data: { id, ...docData } as ExploracionTerritorial,
      }
    } catch (error: any) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Obtener exploración por ID
   */
  static async obtenerPorId(
    id: string
  ): Promise<CrudResult<ExploracionTerritorial>> {
    return ServicioCrudBase.obtenerPorId<ExploracionTerritorial>(
      this.COLLECTION,
      id
    )
  }

  /**
   * Actualizar exploración (solo admin, para cambiar estado y huellas)
   */
  static async actualizar(
    id: string,
    data: Partial<
      Omit<
        ExploracionTerritorial,
        'id' | 'creado_en' | 'creado_por' | 'id_explorador'
      >
    >
  ): Promise<CrudResult<ExploracionTerritorial>> {
    return ServicioCrudBase.actualizar<ExploracionTerritorial>(
      this.COLLECTION,
      id,
      data
    )
  }

  /**
   * Eliminar exploración (solo admin)
   */
  static async eliminar(id: string): Promise<CrudResult<boolean>> {
    return ServicioCrudBase.eliminar(this.COLLECTION, id)
  }

  /**
   * Listar exploraciones del usuario actual (por creado_por)
   */
  static async obtenerPorUsuario(
    userId: string
  ): Promise<CrudResult<ExploracionTerritorial[]>> {
    return ServicioCrudBase.buscar<ExploracionTerritorial>(
      this.COLLECTION,
      'creado_por',
      userId
    )
  }

  /**
   * Listar exploraciones por estado (para admin)
   */
  static async obtenerPorEstado(
    estado: 'pendiente' | 'validada' | 'rechazada'
  ): Promise<CrudResult<ExploracionTerritorial[]>> {
    return ServicioCrudBase.buscar<ExploracionTerritorial>(
      this.COLLECTION,
      'estado',
      estado
    )
  }

  /**
   * Listar exploraciones por celda H3
   */
  static async obtenerPorH3Index(
    h3Index: string
  ): Promise<CrudResult<ExploracionTerritorial[]>> {
    return ServicioCrudBase.buscar<ExploracionTerritorial>(
      this.COLLECTION,
      'h3_index',
      h3Index
    )
  }

  /**
   * Listener en tiempo real para exploraciones del usuario actual
   * Ordena por fecha más reciente primero
   */
  static escucharPorUsuario(
    userId: string,
    onData: (_exploraciones: ExploracionTerritorial[]) => void,
    onError: (_error: string) => void
  ): Unsubscribe {
    const exploracionesRef = collection(db, this.COLLECTION)
    const q = query(
      exploracionesRef,
      where('creado_por', '==', userId),
      orderBy('creado_en', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const exploracionesData = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            creado_en:
              data.creado_en instanceof Date
                ? data.creado_en
                : data.creado_en?.toDate?.(),
            actualizado_en:
              data.actualizado_en instanceof Date
                ? data.actualizado_en
                : data.actualizado_en?.toDate?.(),
          } as ExploracionTerritorial
        })
        onData(exploracionesData)
      },
      err => {
        onError(err.message || 'Error al escuchar exploraciones')
      }
    )

    return unsubscribe
  }

  /**
   * Listener en tiempo real para exploraciones pendientes de validación (admin)
   */
  static escucharPendientes(
    onData: (_exploraciones: ExploracionTerritorial[]) => void,
    onError: (_error: string) => void
  ): Unsubscribe {
    const exploracionesRef = collection(db, this.COLLECTION)
    const q = query(
      exploracionesRef,
      where('estado', '==', 'pendiente'),
      orderBy('creado_en', 'asc')
    )

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const exploracionesData = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            creado_en:
              data.creado_en instanceof Date
                ? data.creado_en
                : data.creado_en?.toDate?.(),
            actualizado_en:
              data.actualizado_en instanceof Date
                ? data.actualizado_en
                : data.actualizado_en?.toDate?.(),
          } as ExploracionTerritorial
        })
        onData(exploracionesData)
      },
      err => {
        onError(err.message || 'Error al escuchar exploraciones pendientes')
      }
    )

    return unsubscribe
  }
}
