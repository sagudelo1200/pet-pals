import { ServicioCrudBase } from './crud'
import { Usuario } from '../../models/Usuario'
import { PerfilPublico } from '../../models/PerfilPublico'
import { CrudResult } from './types'
import { db } from '@/firebase.config'
import { doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { toDb, nowServerTimestamp } from './converters'
import { mapFirebaseError } from './errors'

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
}
