import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { Usuario } from '@/models/Usuario'
import { PerfilPublico } from '@/models/PerfilPublico'
import { db } from '@/firebase.config'
import { doc, setDoc, writeBatch } from 'firebase/firestore'
import {
  CrudResult,
  toDb,
  mapFirebaseError,
  camposSistemaCrear,
  camposSistemaActualizar,
} from '@/services/firebase/comun'

export class ServicioUsuario {
  private static readonly COLLECTION = 'usuarios'
  private static readonly PUBLIC_COLLECTION = 'perfiles_publicos'

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
      // Generar campos de sistema con uid explícito
      const base: any = camposSistemaCrear(uid)

      if (!(data as any).fecha_registro) {
        base.fecha_registro = base.creado_en
      }

      const ref = doc(db, this.COLLECTION, uid)

      // Aplicar toDb solo a los datos de dominio
      const dataTransformed = toDb(data)
      await setDoc(ref, { id: uid, ...dataTransformed, ...base })

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

      // Generar campos de sistema de actualización con uid explícito
      const updateFields = camposSistemaActualizar(uid)

      const usuarioRef = doc(db, this.COLLECTION, uid)
      const datosUsuarioDb = {
        ...toDb(datosUsuario),
        ...updateFields,
      }
      batch.update(usuarioRef, datosUsuarioDb)

      const perfilRef = doc(db, this.PUBLIC_COLLECTION, uid)
      if (Object.keys(datosPerfilPublico || {}).length > 0) {
        batch.set(
          perfilRef,
          {
            ...toDb(datosPerfilPublico),
            actualizado_en: updateFields.actualizado_en,
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
}
