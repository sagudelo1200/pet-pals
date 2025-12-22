import { ServicioCrudBase } from './crud'
import { Usuario } from '@/models/Usuario'
import { PerfilPublico } from '@/models/PerfilPublico'
import { CrudResult } from './types'
import { db } from '@/firebase.config'
import { doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { toDb, nowServerTimestamp } from './converters'
import { mapFirebaseError } from './errors'
import {
  agregarUbicacionRef,
  fijarPrincipalRef,
  eliminarUbicacionRef,
} from '@/helpers/logicaUbicacion'

export class ServicioUsuario {
  private static readonly COLLECTION = 'usuarios'
  private static readonly PUBLIC_COLLECTION = 'perfil_publico'

  /**
   * Actualiza los datos del usuario y sincroniza los campos relevantes
   * con el perfil público en una transacción atómica (batch).
   * Esto prepara el terreno para futuras Cloud Functions.
   */
  static async actualizarPerfilCompleto(
    uid: string,
    datosUsuario: Partial<Usuario>
  ): Promise<CrudResult<void>> {
    try {
      const batch = writeBatch(db)

      // 1. Referencia y datos para colección privada 'usuarios'
      const usuarioRef = doc(db, this.COLLECTION, uid)
      const datosUsuarioDb = {
        ...toDb(datosUsuario),
        actualizado_en: serverTimestamp(),
        actualizado_por: uid,
      }
      batch.update(usuarioRef, datosUsuarioDb)

      // 2. Referencia y datos para colección pública 'perfil_publico'
      // Solo sincronizamos campos visuales compartidos
      const perfilRef = doc(db, this.PUBLIC_COLLECTION, uid)
      const datosPerfilPublico: Partial<PerfilPublico> = {}

      if (datosUsuario.nombre) datosPerfilPublico.nombre = datosUsuario.nombre
      if (datosUsuario.foto) datosPerfilPublico.foto = datosUsuario.foto
      // Si hay otros campos compartidos, agregarlos aquí

      if (Object.keys(datosPerfilPublico).length > 0) {
        // Usamos set con merge: true para no sobrescribir otros datos del perfil público (como ratings)
        // O update si estamos seguros que existe. Para seguridad, set con merge es mejor aquí.
        batch.set(
          perfilRef,
          {
            ...datosPerfilPublico,
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

  static async crear(
    data: Omit<
      Usuario,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Usuario>> {
    return ServicioCrudBase.crear<Usuario>(this.COLLECTION, data)
  }

  /**
   * Crear documento de usuario usando un UID explícito.
   * Útil como fallback justo después de registro cuando `auth.currentUser` puede
   * no estar todavía disponible en algunos entornos.
   */
  static async crearConUid(
    uid: string,
    data: Omit<
      Usuario,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Usuario>> {
    try {
      // Construir campos base del sistema. Si el llamador proporcionó
      // `fecha_registro` se respeta (será convertido por `toDb`). Si no,
      // usar `nowServerTimestamp()` para que el servidor asigne la fecha.
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
      // Importante: no ejecutar `toDb` sobre `base` porque contiene
      // sentinelas `serverTimestamp()` que deben escribirse tal cual.
      await setDoc(ref, { id: uid, ...toDb(data), ...base })

      return ServicioCrudBase.obtenerPorId<Usuario>(this.COLLECTION, uid)
    } catch (error: any) {
      return {
        success: false,
        error: mapFirebaseError(error),
      }
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

  // Métodos específicos
  static async obtenerPorCorreo(email: string): Promise<CrudResult<Usuario[]>> {
    return ServicioCrudBase.buscar<Usuario>(this.COLLECTION, 'correo', email)
  }

  static async obtenerPorEstado(
    estado: string
  ): Promise<CrudResult<Usuario[]>> {
    return ServicioCrudBase.buscar<Usuario>(this.COLLECTION, 'estado', estado)
  }

  // ---------------------------------------------------------------------------
  // Gestión de Ubicaciones (Fase 2)
  // ---------------------------------------------------------------------------

  /**
   * Agrega una referencia de ubicación al usuario.
   * Maneja automáticamente la lógica de principal si es la primera.
   */
  static async agregarUbicacion(
    userId: string,
    ubicacionId: string,
    alias?: string,
    coordenadas?: { latitude: number; longitude: number }
  ): Promise<CrudResult<Usuario>> {
    try {
      const userRes = await this.obtenerPorId(userId)
      if (!userRes.success || !userRes.data) throw new Error('USUARIO_NO_ENCONTRADO')

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

  /**
   * Cambia la ubicación principal del usuario.
   */
  static async fijarUbicacionPrincipal(
    userId: string,
    ubicacionId: string
  ): Promise<CrudResult<Usuario>> {
    try {
      const userRes = await this.obtenerPorId(userId)
      if (!userRes.success || !userRes.data) throw new Error('USUARIO_NO_ENCONTRADO')

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

  /**
   * Elimina una ubicación del usuario y reasigna principal si es necesario.
   */
  static async eliminarUbicacion(
    userId: string,
    ubicacionId: string
  ): Promise<CrudResult<Usuario>> {
    try {
      const userRes = await this.obtenerPorId(userId)
      if (!userRes.success || !userRes.data) throw new Error('USUARIO_NO_ENCONTRADO')

      const usuario = userRes.data
      const { lista, idPrincipal } = eliminarUbicacionRef(
        usuario.ubicaciones || [],
        ubicacionId
      )

      // Si idPrincipal es undefined (ej. borró la última), pasamos null o undefined según convenga
      // Firestore acepta null para borrar campo o guardar null
      return this.actualizar(userId, {
        ubicaciones: lista,
        ubicacion_principal_id: idPrincipal ?? undefined, // undefined no borra campo en update de firebase a menos que se use deleteField(), pero null sí.
        // Nota: en actual partial update, undefined suele ser ignorado.
        // Si queremos borrar explicitamente, mejor logic de update.
        // Por ahora asumimos que si queda vacio, queda undefined en memoria y no actualiza nada o queda el valor viejo?
        // Revisar implementación de update base.
      })
    } catch (err: any) {
      return { success: false, error: mapFirebaseError(err) }
    }
  }
}
