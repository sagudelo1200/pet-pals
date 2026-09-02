import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { Conversacion, Mensaje } from '@/models/Chat'
import {
  CrudResult,
  mapFirebaseError,
  camposSistemaActualizar,
} from '@/services/firebase/comun'
import { ServicioAuth } from '@/services/firebase/auth/auth'
import { ERR } from '@/constants'
import {
  collection,
  query,
  orderBy,
  limit,
  doc,
  getDocs,
  updateDoc,
  Timestamp,
  startAfter,
} from 'firebase/firestore'
import { db } from '@/firebase.config'

/**
 * Servicio para gestionar conversaciones y mensajes.
 */
export class ServicioChat {
  private static readonly COLLECTION_CONVERSACIONES = 'conversaciones'
  private static readonly COLLECTION_MENSAJES = 'mensajes'

  /**
   * Obtener conversación por ID
   */
  static async obtenerConversacion(
    conversacionId: string
  ): Promise<CrudResult<Conversacion>> {
    return ServicioCrudBase.obtenerPorId<Conversacion>(
      this.COLLECTION_CONVERSACIONES,
      conversacionId
    )
  }

  /**
   * Crear conversación (Cloud Function use only)
   */
  static async crearConversacion(
    data: Omit<
      Conversacion,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Conversacion>> {
    return ServicioCrudBase.crear<Conversacion>(
      this.COLLECTION_CONVERSACIONES,
      data as any
    )
  }

  /**
   * Obtener conversación por paseo_id (ahora conversacion.id === paseo_id)
   *
   * Incluye reintentos automáticos para esperar a que la Cloud Function
   * cree la conversación cuando el paseo entra en CONFIRMADO.
   * La CF puede tardar 1-3 segundos, así que reintentamos hasta que esté disponible.
   *
   * @param paseoId ID del paseo (= ID de conversación)
   * @param maxReintentos Máximo de intentos (default: 3)
   * @param delayMs Delay entre reintentos en ms (default: 500)
   */
  static async obtenerPorPaseoId(
    paseoId: string,
    maxReintentos: number = 3,
    delayMs: number = 666
  ): Promise<CrudResult<Conversacion>> {
    let ultimoError: string | null = null

    for (let intento = 0; intento <= maxReintentos; intento++) {
      try {
        const result = await this.obtenerConversacion(paseoId)

        // Si está disponible, retornar inmediatamente
        if (result.success && result.data) {
          return result
        }

        // Si falla por permisos/no existe y hay reintentos disponibles, esperar y reintentar
        if (
          intento < maxReintentos &&
          result.error?.includes('PERMISOS_INSUFICIENTES')
        ) {
          ultimoError = result.error
          await new Promise(r => setTimeout(r, delayMs))
          continue
        }

        // Otro tipo de error: no reintentar, retornar inmediatamente
        return result
      } catch (err) {
        ultimoError = String(err)
        if (intento < maxReintentos) {
          await new Promise(r => setTimeout(r, delayMs))
        }
      }
    }

    // Si llegamos aquí, agotamos los reintentos
    return {
      success: false,
      error:
        ultimoError ||
        'Conversación no disponible tras reintentos. El chat se activará cuando el paseo sea confirmado.',
    }
  }

  /**
   * Desactivar conversación (cuando paseo finaliza)
   */
  static async desactivarConversacion(
    conversacionId: string
  ): Promise<CrudResult<void>> {
    try {
      const uid = ServicioAuth.obtenerUsuarioActual()?.uid
      if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

      const convRef = doc(db, this.COLLECTION_CONVERSACIONES, conversacionId)
      const updateFields = camposSistemaActualizar(uid)

      await updateDoc(convRef, {
        activa: false,
        cerrada_en: Timestamp.now(),
        ...updateFields,
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Enviar mensaje
   */
  static async enviarMensaje(
    conversacionId: string,
    contenido: string,
    tipo: 'texto' | 'sistema' | 'notificacion' = 'texto',
    metadata?: Record<string, any>
  ): Promise<CrudResult<Mensaje>> {
    const uid = ServicioAuth.obtenerUsuarioActual()?.uid
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    if (!contenido?.trim()) {
      return { success: false, error: 'CONTENIDO_VACIO' }
    }

    try {
      const data: Omit<
        Mensaje,
        'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
      > = {
        contenido: contenido.trim(),
        autor_uid: uid,
        tipo_mensaje: tipo,
        ...(metadata && { metadata }),
      }

      return this.crearMensaje(conversacionId, data)
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Crear mensaje (interno)
   */
  private static async crearMensaje(
    conversacionId: string,
    data: Omit<
      Mensaje,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Mensaje>> {
    try {
      const _colRef = collection(
        db,
        this.COLLECTION_CONVERSACIONES,
        conversacionId,
        this.COLLECTION_MENSAJES
      )

      // Usar ServicioCrudBase delegando la colección completa como string con path
      // Firestore acepta subcollections si pasamos el path completo
      const subcollectionPath = `${this.COLLECTION_CONVERSACIONES}/${conversacionId}/${this.COLLECTION_MENSAJES}`
      const result = await ServicioCrudBase.crear<Mensaje>(
        subcollectionPath,
        data as any
      )
      return result
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Listar mensajes de una conversación (últimos primero)
   */
  static async listarMensajes(
    conversacionId: string,
    limitCount: number = 50,
    startAfterDoc?: string
  ): Promise<CrudResult<Mensaje[]>> {
    try {
      const colRef = collection(
        db,
        this.COLLECTION_CONVERSACIONES,
        conversacionId,
        this.COLLECTION_MENSAJES
      )

      let q = query(colRef, orderBy('creado_en', 'desc'), limit(limitCount))

      if (startAfterDoc) {
        // Para paginación: obtener documento pivote y hacer startAfter
        const pivotRef = doc(colRef, startAfterDoc)
        const pivotSnap = await (
          await import('firebase/firestore')
        ).getDoc(pivotRef)
        if (pivotSnap.exists()) {
          q = query(
            colRef,
            orderBy('creado_en', 'desc'),
            startAfter(pivotSnap),
            limit(limitCount)
          )
        }
      }

      const snapshot = await getDocs(q)
      const mensajes = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as Mensaje)
        .reverse() // Invertir para mostrar cronológico (más nuevo abajo)

      return { success: true, data: mensajes }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Marcar mensaje como leído por el usuario actual
   */
  static async marcarComoLeido(
    conversacionId: string,
    mensajeId: string
  ): Promise<CrudResult<void>> {
    try {
      const uid = ServicioAuth.obtenerUsuarioActual()?.uid
      if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

      const msgRef = doc(
        db,
        this.COLLECTION_CONVERSACIONES,
        conversacionId,
        this.COLLECTION_MENSAJES,
        mensajeId
      )

      const updateFields = camposSistemaActualizar(uid)

      await updateDoc(msgRef, {
        [`leidos_por.${uid}`]: true,
        ...updateFields,
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Obtener mensajes no leídos en una conversación para el usuario actual
   */
  static async obtenerNoLeidosPorUsuario(
    conversacionId: string
  ): Promise<CrudResult<number>> {
    try {
      const uid = ServicioAuth.obtenerUsuarioActual()?.uid
      if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

      const colRef = collection(
        db,
        this.COLLECTION_CONVERSACIONES,
        conversacionId,
        this.COLLECTION_MENSAJES
      )

      // Obtener todos los mensajes y contar los no leídos por este usuario
      const snapshot = await getDocs(colRef)
      const noLeidos = snapshot.docs.filter(doc => {
        const data = doc.data()
        return !data.leidos_por || !data.leidos_por[uid]
      }).length

      return { success: true, data: noLeidos }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }
}
