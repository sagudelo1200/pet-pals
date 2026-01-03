import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import {
  toDomain,
  toDb,
  mapFirebaseError,
  camposSistemaCrear,
  type CrudResult,
} from '@/services/firebase/comun'
import { Ubicacion } from '@/models/Ubicacion'

export class ServicioUbicacion {
  private static readonly COLLECTION = 'ubicaciones'

  // Conversión simplificada: toDomain ya maneja GeoPoint automáticamente
  private static mapSnapshotToDomain(id: string, data: any): Ubicacion {
    return { id, ...toDomain<Ubicacion>(data) }
  }

  static async obtenerPorId(id: string): Promise<CrudResult<Ubicacion>> {
    try {
      const ref = doc(db, this.COLLECTION, id)
      const snap = await getDoc(ref)
      if (!snap.exists())
        return { success: false, error: 'DOCUMENTO_NO_ENCONTRADO' }
      const data = snap.data()
      const domain = this.mapSnapshotToDomain(snap.id, data)
      return { success: true, data: domain }
    } catch (err: any) {
      return { success: false, error: mapFirebaseError(err) }
    }
  }

  static async obtenerPorIds(ids: string[]): Promise<CrudResult<Ubicacion[]>> {
    try {
      const results = await Promise.all(ids.map(id => this.obtenerPorId(id)))
      const found: Ubicacion[] = []
      for (const r of results) {
        if (r.success && r.data) found.push(r.data)
      }
      return { success: true, data: found }
    } catch (err: any) {
      return { success: false, error: mapFirebaseError(err) }
    }
  }

  static async buscarPorProveedorPlaceId(
    proveedor: Ubicacion['proveedor'],
    proveedor_place_id: string
  ): Promise<CrudResult<Ubicacion | null>> {
    try {
      const col = collection(db, this.COLLECTION)
      const q = query(
        col,
        where('proveedor', '==', proveedor),
        where('proveedor_place_id', '==', proveedor_place_id)
      )
      const snaps = await getDocs(q)
      if (snaps.empty) return { success: true, data: null }
      const snap = snaps.docs[0]
      const domain = this.mapSnapshotToDomain(snap.id, snap.data())
      return { success: true, data: domain }
    } catch (err: any) {
      return { success: false, error: mapFirebaseError(err) }
    }
  }

  static async crear(
    payload: Omit<
      Ubicacion,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Ubicacion>> {
    try {
      const colRef = collection(db, this.COLLECTION)
      const docRef = doc(colRef)
      const id = docRef.id

      // Generar campos de sistema desde auth.currentUser
      const base = camposSistemaCrear()

      // Validar que tenemos un usuario autenticado
      if (!base.creado_por) {
        return { success: false, error: 'NO_AUTENTICADO' }
      }

      // toDb() convierte automáticamente:
      // - Dates → Timestamps
      // - {latitude, longitude} → GeoPoint
      const dataToSave = toDb({
        proveedor: payload.proveedor,
        proveedor_place_id: payload.proveedor_place_id,
        direccion_formateada: payload.direccion_formateada,
        coordenadas: payload.coordenadas,
        componentes_raw: (payload as any).componentes_raw ?? null,
        componentes: (payload as any).componentes ?? {},
        componentes_source:
          (payload as any).componentes_source ?? payload.proveedor,
        estado: payload.estado ?? 'pendiente',
        viewport: payload.viewport,
        alias: payload.alias,
        instrucciones: payload.instrucciones,
        metadata: (payload as any).metadata,
      })

      const finalData = {
        id,
        ...dataToSave,
        ...base, // campos de sistema con serverTimestamp intacto
      }

      await setDoc(docRef, finalData)

      return this.obtenerPorId(id)
    } catch (err: any) {
      return { success: false, error: mapFirebaseError(err) }
    }
  }
}
