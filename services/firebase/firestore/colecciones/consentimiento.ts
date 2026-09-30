import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import {
  DocumentoConsentimiento,
  Consentimiento,
  ConsentimientoEstadoActual,
} from '@/models/Consentimiento'
import { db } from '@/firebase.config'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore'
import {
  CrudResult,
  toDomain,
  mapFirebaseError,
} from '@/services/firebase/comun'

/**
 * ServicioDocumentoConsentimiento
 *
 * Gestiona documentos de consentimiento versionados.
 * Cada versión es un documento independiente e inmutable.
 *
 * Colección: documentos_consentimientos/
 * Documentos: DATOS_PERSONALES_v1, DATOS_PERSONALES_v2, etc.
 */
export class ServicioDocumentoConsentimiento {
  private static readonly COLLECTION = 'documentos_consentimientos'

  /**
   * Crear una versión nueva de un documento de consentimiento
   * (Normalmente solo admin puede hacer esto)
   */
  static async crear(
    data: Omit<
      DocumentoConsentimiento,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<DocumentoConsentimiento>> {
    return ServicioCrudBase.crear<DocumentoConsentimiento>(
      this.COLLECTION,
      data
    )
  }

  /**
   * Obtener un documento por ID
   * Ej: obtenerPorId('DATOS_PERSONALES_v2')
   */
  static async obtenerPorId(
    id: string
  ): Promise<CrudResult<DocumentoConsentimiento>> {
    return ServicioCrudBase.obtenerPorId<DocumentoConsentimiento>(
      this.COLLECTION,
      id
    )
  }

  /**
   * Obtener la versión vigente (activa) de un tipo de documento
   * Ej: obtenerVigente('DATOS_PERSONALES') → retorna la v2 si activo=true
   */
  static async obtenerVigente(
    tipo_documento: string
  ): Promise<CrudResult<DocumentoConsentimiento>> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('tipo_documento', '==', tipo_documento),
        where('activo', '==', true),
        limit(1)
      )

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        return {
          success: false,
          error: `Documento ${tipo_documento} no encontrado o inactivo`,
        }
      }

      const doc = querySnapshot.docs[0]
      const domainData = toDomain(doc.data()) as DocumentoConsentimiento | null

      return {
        success: true,
        data: { id: doc.id, ...(domainData ?? {}) } as DocumentoConsentimiento,
      }
    } catch (error: any) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Obtener todas las versiones de un tipo (para auditoría)
   */
  static async obtenerVersiones(
    tipo_documento: string
  ): Promise<CrudResult<DocumentoConsentimiento[]>> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('tipo_documento', '==', tipo_documento),
        orderBy('version', 'desc')
      )

      const querySnapshot = await getDocs(q)
      const documents: DocumentoConsentimiento[] = []

      querySnapshot.forEach(snap => {
        const domainData = toDomain(
          snap.data()
        ) as DocumentoConsentimiento | null
        documents.push({
          id: snap.id,
          ...(domainData ?? {}),
        } as DocumentoConsentimiento)
      })

      return {
        success: true,
        data: documents,
      }
    } catch (error: any) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Obtener todos los documentos vigentes (para usar en UI)
   */
  static async obtenerVigentes(): Promise<
    CrudResult<DocumentoConsentimiento[]>
  > {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('activo', '==', true)
      )

      const querySnapshot = await getDocs(q)
      const documents: DocumentoConsentimiento[] = []

      querySnapshot.forEach(snap => {
        const domainData = toDomain(
          snap.data()
        ) as DocumentoConsentimiento | null
        documents.push({
          id: snap.id,
          ...(domainData ?? {}),
        } as DocumentoConsentimiento)
      })

      return {
        success: true,
        data: documents,
      }
    } catch (error: any) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }
}

/**
 * ServicioConsentimiento
 *
 * Gestiona eventos de consentimiento (aceptación, rechazo, revocación).
 * Cada evento es inmutable.
 *
 * Colección: consentimientos/
 * Cada documento representa una acción del usuario
 */
export class ServicioConsentimiento {
  private static readonly COLLECTION = 'consentimientos'

  /**
   * Crear un evento de consentimiento
   * (Normalmente llamado solo desde Cloud Function)
   */
  static async crear(
    data: Omit<
      Consentimiento,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Consentimiento>> {
    return ServicioCrudBase.crear<Consentimiento>(this.COLLECTION, data)
  }

  /**
   * Obtener un evento por ID
   */
  static async obtenerPorId(id: string): Promise<CrudResult<Consentimiento>> {
    return ServicioCrudBase.obtenerPorId<Consentimiento>(this.COLLECTION, id)
  }

  /**
   * Obtener el último evento de un usuario para un tipo específico de documento
   *
   * Usado por validación de transiciones de estado.
   * El estado del consentimiento se determina por el ÚLTIMO evento:
   * - undefined (SIN_EVENTOS) → primer evento puede ser ACEPTADO o RECHAZADO
   * - ACEPTADO → puede transicionar a REVOCADO o ACEPTADO (reconfirmación)
   * - RECHAZADO → puede transicionar a ACEPTADO (revierte rechazo)
   * - REVOCADO → puede transicionar a ACEPTADO (reactivación)
   *
   * Retorna:
   * - success=true, data=undefined si no hay eventos (SIN_EVENTOS)
   * - success=true, data=evento si existe al menos un evento
   * - success=false si hay error en la consulta
   */
  static async obtenerUltimoEvento(
    usuarioId: string,
    tipo_documento: string
  ): Promise<CrudResult<Consentimiento | undefined>> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('usuario_id', '==', usuarioId),
        where('tipo_documento', '==', tipo_documento),
        orderBy('creado_en', 'desc'),
        limit(1)
      )

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        return {
          success: true,
          data: undefined,
        }
      }

      const doc = querySnapshot.docs[0]
      const domainData = toDomain(doc.data()) as Consentimiento | null

      return {
        success: true,
        data: { id: doc.id, ...(domainData ?? {}) } as Consentimiento,
      }
    } catch (error: any) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Obtener historial completo de un usuario para un tipo de documento
   */
  static async obtenerHistorial(
    usuarioId: string,
    tipo_documento: string
  ): Promise<CrudResult<Consentimiento[]>> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('usuario_id', '==', usuarioId),
        where('tipo_documento', '==', tipo_documento),
        orderBy('creado_en', 'desc')
      )

      const querySnapshot = await getDocs(q)
      const documents: Consentimiento[] = []

      querySnapshot.forEach(snap => {
        const domainData = toDomain(snap.data()) as Consentimiento | null
        documents.push({
          id: snap.id,
          ...(domainData ?? {}),
        } as Consentimiento)
      })

      return {
        success: true,
        data: documents,
      }
    } catch (error: any) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Obtener historial completo de un usuario (todos los tipos)
   * Útil para auditoría
   */
  static async obtenerHistorialCompleto(
    usuarioId: string
  ): Promise<CrudResult<Consentimiento[]>> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('usuario_id', '==', usuarioId),
        orderBy('creado_en', 'desc')
      )

      const querySnapshot = await getDocs(q)
      const documents: Consentimiento[] = []

      querySnapshot.forEach(snap => {
        const domainData = toDomain(snap.data()) as Consentimiento | null
        documents.push({
          id: snap.id,
          ...(domainData ?? {}),
        } as Consentimiento)
      })

      return {
        success: true,
        data: documents,
      }
    } catch (error: any) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Obtener eventos de un usuario creados en un rango de fechas
   * Útil para auditoría temporal
   */
  static async obtenerEventosPorFecha(
    usuarioId: string,
    desde: Date,
    hasta: Date
  ): Promise<CrudResult<Consentimiento[]>> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('usuario_id', '==', usuarioId),
        where('creado_en', '>=', desde),
        where('creado_en', '<=', hasta),
        orderBy('creado_en', 'desc')
      )

      const querySnapshot = await getDocs(q)
      const documents: Consentimiento[] = []

      querySnapshot.forEach(snap => {
        const domainData = toDomain(snap.data()) as Consentimiento | null
        documents.push({
          id: snap.id,
          ...(domainData ?? {}),
        } as Consentimiento)
      })

      return {
        success: true,
        data: documents,
      }
    } catch (error: any) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Escuchar cambios en tiempo real en el estado de consentimiento del usuario
   */
  static escucharConsentimientosActuales(
    uid: string,
    callback: (
      _consentimientos: Record<string, ConsentimientoEstadoActual> | null
    ) => void,
    onError?: (_error: Error) => void
  ): Unsubscribe {
    const userDocRef = doc(db, 'usuarios', uid)

    return onSnapshot(
      userDocRef,
      snap => {
        if (snap.exists()) {
          const consentimientos = toDomain<
            Record<string, ConsentimientoEstadoActual>
          >(snap.data().consentimientos_estado_actual || {})
          callback(consentimientos)
        } else {
          callback(null)
        }
      },
      error => {
        console.error('[ServicioConsentimiento]', error)
        onError?.(error as Error)
      }
    )
  }
}

/**
 * ServicioEstadoConsentimientoUsuario
 * Maneja lectura del estado actual de consentimientos del usuario.
 */
export class ServicioEstadoConsentimientoUsuario {
  /**
   * Obtener el estado actual de todos los consentimientos de un usuario
   */
  static async obtenerConsentimientosActuales(
    uid: string
  ): Promise<CrudResult<Record<string, ConsentimientoEstadoActual>>> {
    try {
      const snap = await getDocs(
        query(collection(db, 'usuarios'), where('__name__', '==', uid))
      )

      if (snap.empty) {
        return {
          success: false,
          error: 'Usuario no encontrado',
        }
      }

      const consentimientos = toDomain<
        Record<string, ConsentimientoEstadoActual>
      >(snap.docs[0].data().consentimientos_estado_actual || {})
      return {
        success: true,
        data: consentimientos,
      }
    } catch (error: any) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Obtener el estado actual de un consentimiento específico
   */
  static async obtenerConsentimientoActual(
    uid: string,
    tipo_documento: string
  ): Promise<CrudResult<ConsentimientoEstadoActual>> {
    try {
      const snap = await getDocs(
        query(collection(db, 'usuarios'), where('__name__', '==', uid))
      )

      if (snap.empty) {
        return {
          success: false,
          error: 'Usuario no encontrado',
        }
      }

      const consentimiento = toDomain<ConsentimientoEstadoActual>(
        snap.docs[0].data().consentimientos_estado_actual?.[tipo_documento]
      )

      if (!consentimiento) {
        return {
          success: false,
          error: `No hay consentimiento de tipo ${tipo_documento}`,
        }
      }

      return {
        success: true,
        data: consentimiento,
      }
    } catch (error: any) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }
}
