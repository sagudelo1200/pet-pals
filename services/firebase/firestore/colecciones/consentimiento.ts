import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { obtenerVersionVigente } from '@/services/firebase/versionado'
import { idVersion } from '@/functions/src/compartido/versionables'
import {
  tipoVersionableConsentimiento,
  type ContenidoConsentimiento,
} from '@/functions/src/compartido/consentimiento'
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
 * Lee la versión vigente de un documento de consentimiento desde el
 * versionado genérico (serie `consentimiento_{TIPO}`). Se publica desde el
 * admin con el callable publicarVersion.
 */
export class ServicioDocumentoConsentimiento {
  /**
   * Obtener la versión vigente de un tipo de documento
   * Ej: obtenerVigente('DATOS_PERSONALES') → la v2 si es la vigente
   */
  static async obtenerVigente(
    tipo_documento: string
  ): Promise<CrudResult<DocumentoConsentimiento>> {
    try {
      const tipo = tipoVersionableConsentimiento(tipo_documento)
      const vigente = await obtenerVersionVigente<ContenidoConsentimiento>(tipo)
      if (!vigente) {
        return {
          success: false,
          error: `Documento ${tipo_documento} no publicado`,
        }
      }
      return {
        success: true,
        data: {
          ...vigente.contenido,
          tipo_documento,
          documento_id: `${tipo}/${idVersion(vigente.version)}`,
          version: vigente.version,
          hash: vigente.hash,
        },
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
