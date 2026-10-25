/**
 * SERVICIO DE PASEO - WRAPPER ESPECIALIZADO
 *
 * Proporciona una interfaz específica para paseos.
 * Internamente utiliza ServicioOperacion y la colección /operaciones con tipo='paseo'.
 *
 * RESPONSABILIDAD:
 * - Transacciones de estado Paseo-específicas (atomic state transitions)
 * - Registro de eventos (bitácora, incidentes, auditoría)
 * - Validación de códigos de recogida/entrega
 * - Búsquedas Paseo-específicas
 * - Enriquecimiento territorial automático
 *
 * CRUD base (crear, obtener, actualizar, eliminar) está delegado a ServicioOperacion.
 */

import { ServicioOperacion } from '@/services/firebase/firestore/colecciones/operacion'
import {
  ESTADOS_PASEO,
  type Paseo,
  type CapaTerritorialHecho,
  type CapaContextoTerritorial,
} from '@/models/Paseo'
import type { Operacion } from '@/models/Operacion'
import { ServicioAuth } from '@/services/firebase/auth/auth'
import { ERR } from '@/constants'
import { validarFormatoCodigo } from '@/logic/paseos/generador'
import { celdaDe } from '@/services/geo/h3Utils'
import { enriquecerContextoConAPIs } from '@/services/geo/enriquecimientoTerritorial'
import { detectarPatron } from '@/logic/paseos/detectarPatrones'
import {
  momentoPorClave,
  validarMomento,
  type MomentoRegistrado,
} from '@/functions/src/compartido/expediente'
import { ServicioChat } from '@/services/firebase/firestore/colecciones/chat'
import {
  mapFirebaseError,
  toDb,
  camposSistemaActualizar,
  camposSistemaCrear,
  type CrudResult,
} from '@/services/firebase/comun'
import {
  collection,
  query,
  where,
  orderBy,
  type Query,
  runTransaction,
  doc,
  getDocs,
  Timestamp,
  getDoc,
  addDoc,
  limit,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase.config'

const COLLECTION_NAME = 'operaciones'

/** Seguimientos del momento que el chat traduce junto al mensaje. */
function detalleParaElChat(
  extras?: Record<string, unknown>
): Record<string, unknown> {
  const detalle: Record<string, unknown> = {}
  for (const campo of ['causa', 'calmo_con', 'detalle_del_conflicto']) {
    if (extras?.[campo] !== undefined) detalle[campo] = extras[campo]
  }
  return detalle
}

/**
 * Servicio de Paseo
 * Wrapper que garantiza que las operaciones sean de tipo 'paseo'
 */
export class ServicioPaseo {
  // Buffer local para eventos creados por el cliente y aún no confirmados por el servidor
  private static pendingEventos: Map<string, any[]> = new Map()

  /**
   * Limpia recursivamente campos undefined de un objeto
   * Firestore no permite valores undefined en documentos
   */
  private static limpiarUndefined(obj: any): any {
    if (obj === null || obj === undefined) return obj
    if (Array.isArray(obj)) return obj.map(item => this.limpiarUndefined(item))
    if (typeof obj !== 'object') return obj

    const limpio: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        limpio[key] = this.limpiarUndefined(value)
      }
    }
    return limpio
  }

  /**
   * Solicitudes pendientes en las celdas H3 dadas (máx. 30 por límite de
   * Firestore). Sin orderBy para no requerir un índice compuesto: se ordena
   * en la app.
   */
  static getQuerySolicitudesEnZona(celdas: string[]): Query {
    return query(
      collection(db, COLLECTION_NAME),
      where('tipo', '==', 'paseo'),
      where('estado', '==', ESTADOS_PASEO.PENDIENTE),
      where('h3_r8', 'in', celdas.slice(0, 30))
    )
  }

  /** Solicitudes pendientes dirigidas a un cuidador. */
  static getQuerySolicitudesDirigidas(uid: string): Query {
    return query(
      collection(db, COLLECTION_NAME),
      where('tipo', '==', 'paseo'),
      where('estado', '==', ESTADOS_PASEO.PENDIENTE),
      where('id_cuidador', '==', uid)
    )
  }

  /**
   * Query helper para obtener solicitudes pendientes de paseos
   */
  static getQuerySolicitudesPendientes(): Query {
    return query(
      collection(db, COLLECTION_NAME),
      where('tipo', '==', 'paseo'),
      where('estado', '==', ESTADOS_PASEO.PENDIENTE),
      orderBy('creado_en', 'desc')
    )
  }

  /**
   * Crear un paseo
   * Delega a ServicioOperacion pero asegura tipo='paseo'
   */
  static async crear(
    data: Omit<Paseo, 'id' | 'tipo' | 'timestamp_creacion'>
  ): Promise<CrudResult<Paseo>> {
    try {
      const currentUser = ServicioAuth.obtenerUsuarioActual()
      if (!currentUser?.uid) {
        return {
          success: false,
          error: 'Usuario no autenticado',
        }
      }

      const id = await ServicioOperacion.crear(
        {
          ...data,
          tipo: 'paseo',
        } as any,
        currentUser.uid
      )

      return {
        success: true,
        data: { id, ...data, tipo: 'paseo' } as Paseo,
      }
    } catch (error) {
      return {
        success: false,
        error: mapFirebaseError(error),
      }
    }
  }

  /**
   * Crea el paseo y sus mascotas en UNA sola escritura atómica (batch):
   * o se crea todo o no se crea nada. Evita paseos publicados sin mascotas
   * (sin ellas no hay cobro, códigos por tutor ni observaciones).
   *
   * @param data Datos del paseo
   * @param construirMascotas Recibe el id del paseo y devuelve las mascotas
   *   ya denormalizadas (cada una con su `id`)
   */
  static async crearConMascotas(
    data: Omit<Paseo, 'id' | 'tipo' | 'timestamp_creacion'>,
    construirMascotas: (_paseoId: string) => Array<{ id: string }>
  ): Promise<CrudResult<Paseo>> {
    try {
      const currentUser = ServicioAuth.obtenerUsuarioActual()
      if (!currentUser?.uid) {
        return { success: false, error: 'Usuario no autenticado' }
      }
      const uid = currentUser.uid

      const { id, ref, datos } = ServicioOperacion.prepararCreacion(
        { ...data, tipo: 'paseo' } as any,
        uid
      )
      const mascotas = construirMascotas(id)

      const batch = writeBatch(db)
      batch.set(ref, datos)
      const colMascotas = collection(db, COLLECTION_NAME, id, 'mascotas')
      for (const mascota of mascotas) {
        batch.set(doc(colMascotas, mascota.id), {
          ...toDb(mascota),
          ...camposSistemaCrear(uid),
        })
      }
      await batch.commit()

      return {
        success: true,
        data: { id, ...data, tipo: 'paseo' } as Paseo,
      }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Obtener un paseo por ID
   * Verifica que sea tipo='paseo'
   */
  static async obtenerPorId(id: string): Promise<CrudResult<Paseo>> {
    try {
      const operacion = await ServicioOperacion.obtener(id)

      if (!operacion) {
        return { success: false, error: ERR.COMUN.DOCUMENTO_NO_ENCONTRADO }
      }

      if (operacion.tipo !== 'paseo') {
        return { success: false, error: 'La operación no es un paseo' }
      }

      return {
        success: true,
        data: operacion as Paseo,
      }
    } catch (error) {
      return {
        success: false,
        error: mapFirebaseError(error),
      }
    }
  }

  /**
   * Actualizar un paseo
   */
  static async actualizar(
    id: string,
    cambios: Partial<Paseo>
  ): Promise<CrudResult<void>> {
    try {
      await ServicioOperacion.actualizar(id, cambios as any)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: mapFirebaseError(error),
      }
    }
  }

  /**
   * Eliminar un paseo
   */
  static async eliminar(id: string): Promise<CrudResult<boolean>> {
    try {
      await ServicioOperacion.eliminar(id)
      return { success: true, data: true }
    } catch (error) {
      return {
        success: false,
        error: mapFirebaseError(error),
      }
    }
  }

  /**
   * Obtener paseos por tutor
   */
  static async obtenerPorTutor(id_tutor: string): Promise<CrudResult<Paseo[]>> {
    try {
      const operaciones = await ServicioOperacion.obtenerPorTutor(id_tutor)
      const paseos = operaciones.filter(op => op.tipo === 'paseo') as Paseo[]

      return { success: true, data: paseos }
    } catch (error) {
      return {
        success: false,
        error: mapFirebaseError(error),
      }
    }
  }

  /**
   * Obtener paseos por cuidador
   */
  static async obtenerPorCuidador(
    id_cuidador: string
  ): Promise<CrudResult<Paseo[]>> {
    try {
      const operaciones =
        await ServicioOperacion.obtenerPorCuidador(id_cuidador)
      const paseos = operaciones.filter(op => op.tipo === 'paseo') as Paseo[]

      return { success: true, data: paseos }
    } catch (error) {
      return {
        success: false,
        error: mapFirebaseError(error),
      }
    }
  }

  /**
   * Obtener paseos por estado
   */
  static async obtenerPorEstado(estado: string): Promise<CrudResult<Paseo[]>> {
    try {
      const operaciones = await ServicioOperacion.obtenerPorEstado(estado)
      const paseos = operaciones.filter(op => op.tipo === 'paseo') as Paseo[]

      return { success: true, data: paseos }
    } catch (error) {
      return {
        success: false,
        error: mapFirebaseError(error),
      }
    }
  }

  /**
   * Realiza una transición de estado atómica.
   * Solo Paseo-específico: validar estado actual y actualizar atomicamente.
   */
  static async commitEstadoTransaccional(
    paseoId: string,
    esperado: string,
    nuevo: string,
    fields: Record<string, any> = {}
  ): Promise<CrudResult<void>> {
    const uid = ServicioAuth.obtenerUsuarioActual()?.uid
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    try {
      await runTransaction(db, async transaction => {
        const paseoRef = doc(db, COLLECTION_NAME, paseoId)
        const paseoDoc = await transaction.get(paseoRef)

        if (!paseoDoc.exists()) {
          throw new Error(ERR.COMUN.DOCUMENTO_NO_ENCONTRADO)
        }

        const data = paseoDoc.data() as Operacion

        if (data.estado !== esperado) {
          throw new Error(ERR.PASEOS.ESTADO_NO_ESPERADO)
        }

        // Generar campos de sistema de actualización
        const updateFields = camposSistemaActualizar(uid)

        transaction.update(paseoRef, {
          ...fields,
          estado: nuevo,
          ...updateFields,
        })
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Registra un evento en la subcollection de eventos del paseo.
   * Soporta enriquecimiento territorial automático (H3, contexto).
   *
   * ENRIQUECIMIENTO:
   * - Capa 1 (Hecho): H3 R8/R9, timestamp, duración desde inicio
   * - Capa 2 (Contexto): Hora local, APIs públicas (non-blocking)
   * - Capa 3a (Patrón): Detectado en cliente desde últimos eventos
   */
  static async registrarEvento(
    paseoId: string,
    evento: string,
    payload?: Record<string, any>
  ): Promise<CrudResult<void>> {
    const currentUser = ServicioAuth.obtenerUsuarioActual()
    if (!currentUser) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    try {
      let hechoTerritorial: CapaTerritorialHecho | undefined
      let contextoTerritorial: CapaContextoTerritorial | undefined
      let patronInferido: string | null = null
      let h3_r9: string | undefined
      let h3_r8: string | undefined

      // ENRIQUECIMIENTO TERRITORIAL
      if (
        payload?.ubicacion?.lat !== undefined &&
        payload?.ubicacion?.lng !== undefined
      ) {
        try {
          const paseoRef = doc(db, COLLECTION_NAME, paseoId)
          const paseoSnap = await getDoc(paseoRef)
          const paseoData = paseoSnap.data() as Paseo | undefined

          const timestamp = Date.now()
          let duracionDesdeInicio = 0

          if (paseoData?.fecha_inicio_real) {
            const fechaInicio =
              paseoData.fecha_inicio_real instanceof Timestamp
                ? paseoData.fecha_inicio_real.toDate().getTime()
                : (paseoData.fecha_inicio_real as any).getTime?.() ||
                  new Date(paseoData.fecha_inicio_real).getTime()
            duracionDesdeInicio = Math.max(0, (timestamp - fechaInicio) / 1000)
          }

          h3_r8 = celdaDe(payload.ubicacion.lat, payload.ubicacion.lng, 'cobertura')
          h3_r9 = celdaDe(payload.ubicacion.lat, payload.ubicacion.lng, 'micro')

          // Capa 1: Hecho Territorial
          hechoTerritorial = {
            h3_r8,
            h3_r9,
            timestamp,
            duracion_desde_inicio_paseo_segundos: duracionDesdeInicio,
          }

          // Capa 2: Contexto Territorial
          const horaLocal =
            payload?.horaLocal ||
            new Date(timestamp).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            })

          contextoTerritorial = {
            hora_local: horaLocal,
          }

          // Enriquecimiento con APIs (no bloquea el evento)
          try {
            const enriquecimiento = await enriquecerContextoConAPIs(
              payload.ubicacion.lat,
              payload.ubicacion.lng
            )
            contextoTerritorial = {
              ...contextoTerritorial,
              ...enriquecimiento,
            }
          } catch (apiErr) {
            console.warn(
              '[ServicioPaseo.registrarEvento] Error enriquecimiento con APIs:',
              apiErr
            )
          }
        } catch (enrichErr) {
          console.warn(
            '[ServicioPaseo.registrarEvento] Error enriqueciendo:',
            enrichErr
          )
        }
      }

      // CAPA 3a: Detección de patrones en cliente
      if (evento === 'bitacora') {
        try {
          const eventosCol = collection(db, COLLECTION_NAME, paseoId, 'eventos')
          // El campo persistido es `evento`; se filtra en memoria para no
          // requerir un índice compuesto
          const q = query(eventosCol, orderBy('creado_en', 'desc'), limit(20))
          const snapshot = await getDocs(q)
          const eventosRecientes = snapshot.docs
            .map(doc => doc.data() as any)
            .filter(e => e.evento === 'bitacora')
            .slice(0, 5)
            .map(e => ({ ...e, tipoEvento: e.evento }))
            .reverse()

          const eventoTemporal = {
            tipoEvento: 'bitacora',
            payload,
          } as any

          patronInferido = detectarPatron(eventoTemporal, eventosRecientes)

          if (patronInferido) {
            console.log(
              '[ServicioPaseo.registrarEvento] Patrón detectado:',
              patronInferido
            )
          }
        } catch (patternErr) {
          console.warn(
            '[ServicioPaseo.registrarEvento] Error detectando patrón:',
            patternErr
          )
        }
      }

      // REGISTRO LOCAL (buffer para optimización de UI)
      const localId = `local_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`
      const payloadLimpio = this.limpiarUndefined(payload || {})
      const localEntry: any = {
        id: localId,
        evento,
        payload: payloadLimpio,
        actor: currentUser.uid,
        hechoTerritorial,
        contextoTerritorial,
        patron_inferido: patronInferido,
        creado_en: new Date(),
        _local: true,
      }

      const buf = this.pendingEventos.get(paseoId) || []
      buf.unshift(localEntry)
      this.pendingEventos.set(paseoId, buf)

      // REGISTRO EN FIRESTORE
      const camposSistema = camposSistemaCrear(currentUser.uid)

      const entry: any = {
        evento,
        payload: payloadLimpio,
        actor: currentUser.uid,
        ...(hechoTerritorial && {
          hechoTerritorial: this.limpiarUndefined(hechoTerritorial),
        }),
        ...(contextoTerritorial && {
          contextoTerritorial: this.limpiarUndefined(contextoTerritorial),
        }),
        ...(patronInferido && { patron_inferido: patronInferido }),
        ...camposSistema,
      }

      const eventosCol = collection(db, COLLECTION_NAME, paseoId, 'eventos')
      await addDoc(eventosCol, entry)

      // LIMPIEZA LOCAL
      const remain = (this.pendingEventos.get(paseoId) || []).filter(
        (e: any) => e.id !== localId
      )
      if (remain.length) this.pendingEventos.set(paseoId, remain)
      else this.pendingEventos.delete(paseoId)

      return { success: true }
    } catch (error) {
      const before = this.pendingEventos.get(paseoId) || []
      const after = before.filter((e: any) => !e._local)
      if (after.length) this.pendingEventos.set(paseoId, after)
      else this.pendingEventos.delete(paseoId)
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Obtiene eventos pendientes del buffer local
   * Usado para sincronización de UI en tiempo real
   */
  static obtenerEventosPendientes(paseoId: string) {
    return (this.pendingEventos.get(paseoId) || []).slice()
  }

  /**
   * Valida código de recogida POR TUTOR
   * Operación atómica: verifica código y actualiza contadores de intentos
   */
  static async validarCodigoRecogidaPorTutor(
    paseoId: string,
    tutorId: string,
    codigoIngresado: string
  ): Promise<
    | { success: true; validado: boolean; intentosFallidos: number }
    | { success: false; error: string; intentosFallidos?: number }
  > {
    const uid = ServicioAuth.obtenerUsuarioActual()?.uid
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    // Validar formato del código
    if (!validarFormatoCodigo(codigoIngresado)) {
      return {
        success: false,
        error: ERR.PASEOS.CODIGO_RECOGIDA_FORMATO_INVALIDO,
      }
    }

    const paseoRef = doc(db, COLLECTION_NAME, paseoId)

    try {
      const resultado = await runTransaction(db, async tx => {
        const paseoSnap = await tx.get(paseoRef)

        if (!paseoSnap.exists()) {
          throw new Error(ERR.PASEOS.PASEO_NO_ENCONTRADO)
        }

        const paseoData = paseoSnap.data()
        const codigosRecogidaPorTutor = (paseoData.codigos_recogida_por_tutor ||
          {}) as Record<string, string>
        const intentosFallidos =
          ((paseoData.intentos_fallidos_recogida_por_tutor || {})[tutorId] ||
            0) as number

        // Si el tutor no tiene código en este paseo, error
        if (!codigosRecogidaPorTutor[tutorId]) {
          throw new Error('CODIGO_RECOGIDA_NO_ENCONTRADO')
        }

        // Si ya está bloqueado (3+ intentos), rechazar
        if (intentosFallidos >= 3) {
          throw new Error(ERR.PASEOS.CODIGO_RECOGIDA_BLOQUEADO)
        }

        const codigoAlmacenado = codigosRecogidaPorTutor[tutorId]

        // Comparar código
        if (codigoIngresado === codigoAlmacenado) {
          // ✅ Código correcto
          const camposSistema = camposSistemaActualizar(uid)
          tx.update(paseoRef, {
            codigo_recogida_validado_por_tutor: {
              ...(paseoData.codigo_recogida_validado_por_tutor || {}),
              [tutorId]: true,
            },
            timestamp_validacion_recogida_por_tutor: {
              ...(paseoData.timestamp_validacion_recogida_por_tutor || {}),
              [tutorId]: Timestamp.now(),
            },
            intentos_fallidos_recogida_por_tutor: {
              ...(paseoData.intentos_fallidos_recogida_por_tutor || {}),
              [tutorId]: 0,
            },
            ...camposSistema,
          })

          return {
            success: true as const,
            validado: true,
            intentosFallidos: 0,
          }
        } else {
          // ❌ Código incorrecto
          const nuevoIntento = intentosFallidos + 1
          const camposSistema = camposSistemaActualizar(uid)
          console.log(
            `[ServicioPaseo] Actualizando intentos fallidos para tutor ${tutorId}: ${intentosFallidos} → ${nuevoIntento}`
          )
          tx.update(paseoRef, {
            intentos_fallidos_recogida_por_tutor: {
              ...(paseoData.intentos_fallidos_recogida_por_tutor || {}),
              [tutorId]: nuevoIntento,
            },
            ...camposSistema,
          })

          // Si llegó a 3 intentos, bloquear
          if (nuevoIntento >= 3) {
            return {
              success: false as const,
              error: ERR.PASEOS.CODIGO_RECOGIDA_BLOQUEADO,
              intentosFallidos: nuevoIntento,
            }
          }

          return {
            success: false as const,
            error: ERR.PASEOS.CODIGO_RECOGIDA_INCORRECTO,
            intentosFallidos: nuevoIntento,
          }
        }
      })

      return resultado
    } catch (e: any) {
      const errorMsg = e.message || mapFirebaseError(e)

      // Si es un error conocido de validación, devolverlo directamente
      if (
        errorMsg === ERR.PASEOS.CODIGO_RECOGIDA_BLOQUEADO ||
        errorMsg === ERR.PASEOS.CODIGO_RECOGIDA_INCORRECTO ||
        errorMsg === ERR.PASEOS.PASEO_NO_ENCONTRADO
      ) {
        return { success: false, error: errorMsg }
      }

      return { success: false, error: mapFirebaseError(e) }
    }
  }

  /**
   * Valida código de entrega POR TUTOR (espejo de la recogida con roles
   * invertidos: el cuidador muestra el código y el tutor lo ingresa).
   * Operación atómica: verifica código, actualiza intentos y, cuando todos
   * los tutores del paseo validaron, transiciona FINALIZADO → COMPLETADO.
   */
  static async validarCodigoEntregaPorTutor(
    paseoId: string,
    tutorId: string,
    codigoIngresado: string
  ): Promise<
    | { success: true; completado: boolean }
    | { success: false; error: string; intentosFallidos?: number }
  > {
    const uid = ServicioAuth.obtenerUsuarioActual()?.uid
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    if (!validarFormatoCodigo(codigoIngresado)) {
      return { success: false, error: 'CODIGO_ENTREGA_FORMATO_INVALIDO' }
    }

    const paseoRef = doc(db, COLLECTION_NAME, paseoId)

    try {
      return await runTransaction(db, async tx => {
        const paseoSnap = await tx.get(paseoRef)

        if (!paseoSnap.exists()) {
          throw new Error(ERR.PASEOS.PASEO_NO_ENCONTRADO)
        }

        const paseoData = paseoSnap.data()
        if (paseoData.estado !== ESTADOS_PASEO.FINALIZADO) {
          throw new Error(ERR.PASEOS.ESTADO_NO_ESPERADO)
        }

        const codigosEntregaPorTutor = (paseoData.codigos_entrega_por_tutor ||
          {}) as Record<string, string>
        const intentosFallidos =
          ((paseoData.intentos_fallidos_entrega_por_tutor || {})[tutorId] ||
            0) as number

        if (!codigosEntregaPorTutor[tutorId]) {
          throw new Error('CODIGO_ENTREGA_NO_ENCONTRADO')
        }

        if (intentosFallidos >= 3) {
          throw new Error('CODIGO_ENTREGA_BLOQUEADO')
        }

        const camposSistema = camposSistemaActualizar(uid)

        if (codigoIngresado === codigosEntregaPorTutor[tutorId]) {
          const validados = {
            ...(paseoData.codigo_entrega_validado_por_tutor || {}),
            [tutorId]: true,
          }
          const todosValidados = Object.keys(codigosEntregaPorTutor).every(
            tId => validados[tId] === true
          )

          tx.update(paseoRef, {
            codigo_entrega_validado_por_tutor: validados,
            timestamp_validacion_entrega_por_tutor: {
              ...(paseoData.timestamp_validacion_entrega_por_tutor || {}),
              [tutorId]: Timestamp.now(),
            },
            intentos_fallidos_entrega_por_tutor: {
              ...(paseoData.intentos_fallidos_entrega_por_tutor || {}),
              [tutorId]: 0,
            },
            ...(todosValidados && {
              estado: ESTADOS_PASEO.COMPLETADO,
              timestamp_validacion_tutor: Timestamp.now(),
            }),
            ...camposSistema,
          })

          return { success: true as const, completado: todosValidados }
        }

        const nuevoIntento = intentosFallidos + 1
        tx.update(paseoRef, {
          intentos_fallidos_entrega_por_tutor: {
            ...(paseoData.intentos_fallidos_entrega_por_tutor || {}),
            [tutorId]: nuevoIntento,
          },
          ...camposSistema,
        })

        return {
          success: false as const,
          error:
            nuevoIntento >= 3
              ? 'CODIGO_ENTREGA_BLOQUEADO'
              : 'CODIGO_ENTREGA_INCORRECTO',
          intentosFallidos: nuevoIntento,
        }
      })
    } catch (e: any) {
      const errorMsg = e?.message || ''
      if (
        [
          'CODIGO_ENTREGA_NO_ENCONTRADO',
          'CODIGO_ENTREGA_BLOQUEADO',
          ERR.PASEOS.ESTADO_NO_ESPERADO,
          ERR.PASEOS.PASEO_NO_ENCONTRADO,
        ].includes(errorMsg)
      ) {
        return { success: false, error: errorMsg }
      }
      return { success: false, error: mapFirebaseError(e) }
    }
  }

  /**
   * Busca paseos por filtros arbitrarios
   */
  static async buscarPaseos(
    filtros: { campo: string; op: any; valor: any }[],
    orden?: { campo: string; dir: 'asc' | 'desc' }
  ): Promise<CrudResult<Paseo[]>> {
    try {
      let q = query(
        collection(db, COLLECTION_NAME),
        where('tipo', '==', 'paseo')
      )

      for (const f of filtros) {
        q = query(q, where(f.campo, f.op, f.valor))
      }

      if (orden) {
        q = query(q, orderBy(orden.campo, orden.dir))
      }

      const snap = await getDocs(q)
      const results: Paseo[] = []
      snap.forEach(d => {
        results.push({ id: d.id, ...d.data() } as Paseo)
      })

      return { success: true, data: results }
    } catch (e: any) {
      return { success: false, error: mapFirebaseError(e) }
    }
  }

  /**
   * Clave i18n del mensaje del sistema de un momento del catálogo
   * (`chat:sistema.momentos.<grupo>.<accion>`).
   */
  private static obtenerClaveI18nBitacora(accion: string): string {
    return momentoPorClave(accion)
      ? `chat:sistema.momentos.${accion}`
      : 'chat:sistema.generico'
  }

  /**
   * Registra un evento de bitácora (momento registrado por el cuidador).
   */
  static async registrarBitacora(
    paseoId: string,
    accion: string,
    opciones?: {
      nota?: string
      ubicacion?: {
        lat: number
        lng: number
      }
      horaLocal?: string
      /**
       * Mascotas a las que les pasó el momento. Vacío u omitido = todo el
       * grupo. Con varias mascotas permite saber a cuál se refiere.
       */
      mascotaIds?: string[]
      /** Nombres de esas mascotas, para el mensaje del chat ("Luna y Max") */
      nombresMascotas?: string
      /** Datos del momento: grupo, dominio, causa, qué lo calmó, lugar… */
      extras?: Record<string, unknown>
    }
  ): Promise<CrudResult<void>> {
    try {
      const mascotaIds = Array.from(
        new Set((opciones?.mascotaIds ?? []).filter(Boolean))
      )
      const eventoResult = await this.registrarEvento(paseoId, 'bitacora', {
        ...opciones?.extras,
        accion,
        nota: opciones?.nota,
        ubicacion: opciones?.ubicacion,
        timestamp: Date.now(),
        horaLocal: opciones?.horaLocal,
        ...(mascotaIds.length > 0 && { mascota_ids: mascotaIds }),
      })

      if (!eventoResult.success) {
        return eventoResult
      }

      const claveI18n = this.obtenerClaveI18nBitacora(accion)
      ServicioChat.enviarMensaje(paseoId, claveI18n, 'sistema', {
        accion,
        claveI18n,
        nota: opciones?.nota,
        ...detalleParaElChat(opciones?.extras),
        ...(mascotaIds.length > 0 &&
          opciones?.nombresMascotas && { mascotas: opciones.nombresMascotas }),
      }).catch(err => {
        console.warn(
          '[ServicioPaseo.registrarBitacora] Error enviando msg sistema:',
          err
        )
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Registra un momento del catálogo (`compartido/expediente.ts`): valida el
   * momento y lo enruta. Los del grupo emergencia son incidentes con
   * severidad; el resto va a la bitácora del paseo.
   */
  static async registrarMomento(
    paseoId: string,
    momento: Omit<MomentoRegistrado, 'cuidador_id' | 'paseo_id' | 'fecha_ms'>,
    opciones?: {
      nota?: string
      ubicacion?: { lat: number; lng: number }
      horaLocal?: string
      mascotaIds?: string[]
      nombresMascotas?: string
    }
  ): Promise<CrudResult<void>> {
    const uid = ServicioAuth.obtenerUsuarioActual()?.uid
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    const errores = validarMomento({
      ...momento,
      cuidador_id: uid,
      paseo_id: paseoId,
      fecha_ms: Date.now(),
    })
    const definicion = momentoPorClave(momento.clave)
    if (errores.length > 0 || !definicion) {
      return { success: false, error: 'MOMENTO_INVALIDO' }
    }

    const extras = this.limpiarUndefined({
      clave: definicion.clave,
      grupo: definicion.grupo,
      dominio: definicion.dominio,
      causa: momento.causa,
      calmo_con: momento.calmo_con,
      detalle_del_conflicto: momento.detalle_del_conflicto,
      lugar: momento.lugar,
    })

    if (definicion.gravedad) {
      return this.registrarIncidente(
        paseoId,
        definicion.clave.split('.')[1],
        definicion.gravedad,
        {
          descripcion: opciones?.nota,
          ubicacion: opciones?.ubicacion,
          horaLocal: opciones?.horaLocal,
          mascotaIds: opciones?.mascotaIds,
          nombresMascotas: opciones?.nombresMascotas,
          extras,
        }
      )
    }
    return this.registrarBitacora(paseoId, definicion.clave, {
      ...opciones,
      extras,
    })
  }

  /**
   * Registra un evento de incidente (problema o alerta durante el paseo).
   */
  static async registrarIncidente(
    paseoId: string,
    tipo: string,
    severidad: 'baja' | 'media' | 'critica',
    opciones?: {
      descripcion?: string
      ubicacion?: {
        lat: number
        lng: number
      }
      horaLocal?: string
      /** Mascotas afectadas. Vacío u omitido = todo el grupo. */
      mascotaIds?: string[]
      /** Nombres de esas mascotas, para el mensaje del chat */
      nombresMascotas?: string
      /** Datos del momento: clave del catálogo, dominio, detalle del conflicto… */
      extras?: Record<string, unknown>
    }
  ): Promise<CrudResult<void>> {
    try {
      const mascotaIds = Array.from(
        new Set((opciones?.mascotaIds ?? []).filter(Boolean))
      )
      const eventoResult = await this.registrarEvento(paseoId, 'incidente', {
        ...opciones?.extras,
        tipo,
        severidad,
        descripcion: opciones?.descripcion,
        ubicacion: opciones?.ubicacion,
        timestamp: Date.now(),
        horaLocal: opciones?.horaLocal,
        ...(mascotaIds.length > 0 && { mascota_ids: mascotaIds }),
      })

      if (!eventoResult.success) {
        return eventoResult
      }

      const claveI18n = `chat:sistema.incidentes.${tipo}`

      ServicioChat.enviarMensaje(paseoId, claveI18n, 'sistema', {
        tipo,
        severidad,
        descripcion: opciones?.descripcion,
        ...detalleParaElChat(opciones?.extras),
        ...(mascotaIds.length > 0 &&
          opciones?.nombresMascotas && { mascotas: opciones.nombresMascotas }),
      }).catch(err => {
        console.warn(
          '[ServicioPaseo.registrarIncidente] Error enviando msg sistema:',
          err
        )
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }

  /**
   * Transacción especializada: agregar mascota al paseo
   * Útil para paseos compartidos donde se pueden agregar mascotas después de creado
   */
  static async commitMascotaTransaccional(
    paseoId: string,
    mascotaId: string
  ): Promise<CrudResult<void>> {
    const uid = ServicioAuth.obtenerUsuarioActual()?.uid
    if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    try {
      await runTransaction(db, async transaction => {
        const paseoRef = doc(db, COLLECTION_NAME, paseoId)
        const paseoDoc = await transaction.get(paseoRef)

        if (!paseoDoc.exists()) {
          throw new Error(ERR.COMUN.DOCUMENTO_NO_ENCONTRADO)
        }

        const data = paseoDoc.data() as Paseo
        const mascotaIds = data.mascota_ids || []

        if (mascotaIds.includes(mascotaId)) {
          throw new Error('MASCOTA_YA_EXISTE_EN_PASEO')
        }

        const updateFields = camposSistemaActualizar(uid)

        transaction.update(paseoRef, {
          mascota_ids: [...mascotaIds, mascotaId],
          mascotas_count: (data.mascotas_count || 0) + 1,
          ...updateFields,
        })
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }
}
