import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { Usuario } from '@/models/Usuario'
import { PerfilPublico } from '@/models/PerfilPublico'
import { db } from '@/firebase.config'
import { doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
import {
  CrudResult,
  toDb,
  nowServerTimestamp,
  mapFirebaseError,
} from '@/services/firebase/comun'

export class ServicioUsuario {
  private static readonly COLLECTION = 'usuarios'
  private static readonly PUBLIC_COLLECTION = 'perfil_publico'

  static async crear(
    data: Omit<
      Usuario,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Usuario>> {
    return ServicioCrudBase.crear<Usuario>(this.COLLECTION, data)
  }

  static async crearConUid(
    uid: string,
    data: Omit<
      Usuario,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Usuario>> {
    try {
      const base: any = {
        creado_en: nowServerTimestamp(),
        actualizado_en: nowServerTimestamp(),
        creado_por: uid,
        actualizado_por: uid,
      }
      if (!(data as any).fecha_registro) {
        base.fecha_registro = nowServerTimestamp()
      }

      const ref = doc(db, this.COLLECTION, uid)
      await setDoc(ref, { id: uid, ...toDb(data), ...base })

      return ServicioCrudBase.obtenerPorId<Usuario>(this.COLLECTION, uid)
    } catch (error: any) {
      return {
        success: false,
        error: mapFirebaseError(error),
      }
    }
  }

  static async commitPerfilBatch(
    uid: string,
    datosUsuario: Partial<Usuario>,
    datosPerfilPublico: Partial<PerfilPublico>
  ): Promise<CrudResult<void>> {
    try {
      const batch = writeBatch(db)

      const usuarioRef = doc(db, this.COLLECTION, uid)
      const datosUsuarioDb = {
        ...toDb(datosUsuario),
        actualizado_en: serverTimestamp(),
        actualizado_por: uid,
      }
      batch.update(usuarioRef, datosUsuarioDb)

      const perfilRef = doc(db, this.PUBLIC_COLLECTION, uid)
      if (Object.keys(datosPerfilPublico || {}).length > 0) {
        batch.set(
          perfilRef,
          {
            ...toDb(datosPerfilPublico),
            actualizado_en: serverTimestamp(),
          },
          { merge: true }
        )
      }

      await batch.commit()
      return { success: true, data: undefined }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  static async obtenerPorId(id: string): Promise<CrudResult<Usuario>> {
    return ServicioCrudBase.obtenerPorId<Usuario>(this.COLLECTION, id)
  }

  static async actualizar(
    id: string,
    data: Partial<Omit<Usuario, 'id' | 'creado_en' | 'creado_por'>>
  ): Promise<CrudResult<Usuario>> {
    return ServicioCrudBase.actualizar<Usuario>(this.COLLECTION, id, data)
  }
  static async eliminar(id: string): Promise<CrudResult<boolean>> {
    return ServicioCrudBase.eliminar(this.COLLECTION, id)
  }

  static async agregarUbicacion(
    _userId: string,
    _ubicacionId: string,
    _alias?: string,
    _coordenadas?: { latitude: number; longitude: number }
  ): Promise<CrudResult<Usuario>> {
    return {
      success: false,
      error: 'DEPRECATED: usar logic/usuarios.agregarUbicacion',
    }
  }

  static async fijarUbicacionPrincipal(
    _userId: string,
    _ubicacionId: string
  ): Promise<CrudResult<Usuario>> {
    return {
      success: false,
      error: 'DEPRECATED: usar logic/usuarios.fijarUbicacionPrincipal',
    }
  }

  static async eliminarUbicacion(
    _userId: string,
    _ubicacionId: string
  ): Promise<CrudResult<Usuario>> {
    return {
      success: false,
      error: 'DEPRECATED: usar logic/usuarios.eliminarUbicacion',
    }
  }
}
