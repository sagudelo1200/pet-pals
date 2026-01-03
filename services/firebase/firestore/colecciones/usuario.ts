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
import {
  agregarUbicacionRef,
  fijarPrincipalRef,
  eliminarUbicacionRef,
} from '@/helpers/logicaUbicacion'

export class ServicioUsuario {
  private static readonly COLLECTION = 'usuarios'
  private static readonly PUBLIC_COLLECTION = 'perfil_publico'

  static async actualizarPerfilCompleto(
    uid: string,
    datosUsuario: Partial<Usuario>
  ): Promise<CrudResult<void>> {
    // Deprecated: use logic/usuarios.actualizarPerfilCompleto which orchestrates business rules
    return {
      success: false,
      error: 'DEPRECATED: usar logic/usuarios.actualizarPerfilCompleto',
    }
  }

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

  static async obtenerTodos(): Promise<CrudResult<Usuario[]>> {
    return ServicioCrudBase.obtenerTodos<Usuario>(this.COLLECTION)
  }

  static async obtenerPorCorreo(email: string): Promise<CrudResult<Usuario[]>> {
    return ServicioCrudBase.buscar<Usuario>(this.COLLECTION, 'correo', email)
  }

  static async obtenerPorEstado(
    estado: string
  ): Promise<CrudResult<Usuario[]>> {
    return ServicioCrudBase.buscar<Usuario>(this.COLLECTION, 'estado', estado)
  }

  static async agregarUbicacion(
    userId: string,
    ubicacionId: string,
    alias?: string,
    coordenadas?: { latitude: number; longitude: number }
  ): Promise<CrudResult<Usuario>> {
    try {
      const userRes = await this.obtenerPorId(userId)
      if (!userRes.success || !userRes.data)
        throw new Error('USUARIO_NO_ENCONTRADO')

      const usuario = userRes.data
      const { lista, idPrincipal } = agregarUbicacionRef(
        usuario.ubicaciones || [],
        ubicacionId,
        alias,
        coordenadas
      )

      return this.actualizar(userId, {
        ubicaciones: lista,
        ubicacion_principal_id: idPrincipal,
      })
    } catch (err: any) {
      return { success: false, error: mapFirebaseError(err) }
    }
  }

  static async fijarUbicacionPrincipal(
    userId: string,
    ubicacionId: string
  ): Promise<CrudResult<Usuario>> {
    try {
      const userRes = await this.obtenerPorId(userId)
      if (!userRes.success || !userRes.data)
        throw new Error('USUARIO_NO_ENCONTRADO')

      const usuario = userRes.data
      const { lista, idPrincipal } = fijarPrincipalRef(
        usuario.ubicaciones || [],
        ubicacionId
      )

      return this.actualizar(userId, {
        ubicaciones: lista,
        ubicacion_principal_id: idPrincipal,
      })
    } catch (err: any) {
      return { success: false, error: mapFirebaseError(err) }
    }
  }

  static async eliminarUbicacion(
    userId: string,
    ubicacionId: string
  ): Promise<CrudResult<Usuario>> {
    try {
      const userRes = await this.obtenerPorId(userId)
      if (!userRes.success || !userRes.data)
        throw new Error('USUARIO_NO_ENCONTRADO')

      const usuario = userRes.data
      const { lista, idPrincipal } = eliminarUbicacionRef(
        usuario.ubicaciones || [],
        ubicacionId
      )

      return this.actualizar(userId, {
        ubicaciones: lista,
        ubicacion_principal_id: idPrincipal ?? undefined,
      })
    } catch (err: any) {
      return { success: false, error: mapFirebaseError(err) }
    }
  }
}
