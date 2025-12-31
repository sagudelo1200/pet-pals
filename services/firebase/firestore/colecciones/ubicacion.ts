import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  GeoPoint,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import {
  toDb,
  nowServerTimestamp,
  toDomain,
  mapFirebaseError,
  type CrudResult,
} from '@/services/firebase/comun'
import { ServicioAuth } from '@/services/firebase/auth/auth'
import { Ubicacion } from '@/models/Ubicacion'

export class ServicioUbicacion {
  private static readonly COLLECTION = 'ubicaciones'

  private static mapSnapshotToDomain(id: string, data: any): Ubicacion {
    const domain = toDomain(data) as any
    if (
      domain.coordenadas &&
      (domain.coordenadas as any).latitude !== undefined
    ) {
      const gp = domain.coordenadas as GeoPoint
      domain.coordenadas = { latitude: gp.latitude, longitude: gp.longitude }
    }
    return { id, ...(domain as Ubicacion) }
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

      const currentUser = ServicioAuth.obtenerUsuarioActual()
      const base: any = {
        creado_en: nowServerTimestamp(),
        actualizado_en: nowServerTimestamp(),
        creado_por: currentUser?.uid,
        actualizado_por: currentUser?.uid,
      }

      const gp = new GeoPoint(
        (payload.coordenadas as any).latitude ??
          (payload.coordenadas as any).lat,
        (payload.coordenadas as any).longitude ??
          (payload.coordenadas as any).lng
      )

      const rawComponents: any =
        (payload as any).componentes_raw ?? (payload as any).componentes ?? null
      let componentes_raw_to_store: any = rawComponents
      if (Array.isArray(rawComponents)) {
        const map: Record<string, any> = {}
        for (const item of rawComponents) {
          const name = item.long_name ?? item.short_name
          if (!item.types) continue
          for (const t of item.types) {
            if (!map[t]) map[t] = name
          }
        }
        componentes_raw_to_store = map
      }

      const dataToSave: any = {
        id,
        proveedor: payload.proveedor,
        proveedor_place_id: payload.proveedor_place_id,
        direccion_formateada: payload.direccion_formateada,
        coordenadas: gp,
        componentes_raw: componentes_raw_to_store ?? null,
        componentes: (payload as any).componentes ?? {},
        viewport: payload.viewport ?? null,
        alias: payload.alias ?? null,
        instrucciones: payload.instrucciones ?? null,
        metadata: payload.metadata ?? null,
        componentes_source:
          (payload as any).componentes_source ?? payload.proveedor,
        estado: payload.estado ?? 'pendiente',
        ...base,
      }

      await setDoc(docRef, toDb(dataToSave))

      return this.obtenerPorId(id)
    } catch (err: any) {
      return { success: false, error: mapFirebaseError(err) }
    }
  }
}
