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
import { coordsAH3 } from '@/services/geo/h3Utils'
import { enriquecerContextoConAPIs } from '@/services/geo/enriquecimientoTerritorial'
import { detectarPatron } from '@/logic/paseos/detectarPatrones'
import { TerritorialAggregator } from '@/services/firebase/firestore/agregadores/territorial.aggregator'
import { ServicioChat } from '@/services/firebase/firestore/colecciones/chat'
import {
  mapFirebaseError,
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
} from 'firebase/firestore'
import { db } from '@/firebase.config'

const COLLECTION_NAME = 'operaciones'

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

          h3_r8 = coordsAH3(payload.ubicacion.lat, payload.ubicacion.lng, 8)
          h3_r9 = coordsAH3(payload.ubicacion.lat, payload.ubicacion.lng, 9)

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

      // PUBLICACIÓN TERRITORIAL
      if (h3_r9 && h3_r8 && evento === 'bitacora') {
        TerritorialAggregator.publishEvento({
          accion: payload?.accion || 'desconocido',
          h3_r9,
          h3_r8,
          duracion_seg:
            hechoTerritorial?.duracion_desde_inicio_paseo_segundos || 0,
          contextoTerritorial: contextoTerritorial || {},
          paseoId,
          cuidadorId: currentUser.uid,
        })
      }

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
   * Traduce una acción de bitácora a una clave i18n para mensaje del sistema.
   */
  private static obtenerClaveI18nBitacora(accion: string): string {
    const mapas: Record<string, string> = {
      necesidades: 'chat:sistema.acciones_mascota.necesidades',
      corrio: 'chat:sistema.acciones_mascota.corrio',
      juego: 'chat:sistema.acciones_mascota.juego',
      agua: 'chat:sistema.acciones_mascota.agua',
      descanso: 'chat:sistema.acciones_mascota.descanso',
      socializacion_perros:
        'chat:sistema.acciones_mascota.socializacion_perros',
      socializacion_personas:
        'chat:sistema.acciones_mascota.socializacion_personas',
      exploró: 'chat:sistema.acciones_mascota.exploró',
      comio: 'chat:sistema.acciones_mascota.comio',
      'lugar:parque': 'chat:sistema.lugares.parque',
      'lugar:sendero': 'chat:sistema.lugares.sendero',
      'lugar:zona_residencial': 'chat:sistema.lugares.zona_residencial',
      'lugar:zona_perros': 'chat:sistema.lugares.zona_perros',
      'lugar:pet_friendly': 'chat:sistema.lugares.pet_friendly',
      'lugar:rio': 'chat:sistema.lugares.rio',
      'lugar:vehiculo': 'chat:sistema.lugares.vehiculo',
      'lugar:otro_lugar': 'chat:sistema.lugares.otro_lugar',
      'recuerdo:foto': 'chat:sistema.recuerdos.foto',
      'recuerdo:video': 'chat:sistema.recuerdos.video',
      'recuerdo:voz': 'chat:sistema.recuerdos.voz',
      'recuerdo:nota': 'chat:sistema.recuerdos.nota',
      'novedad:asustó': 'chat:sistema.novedades.asustó',
      'novedad:lesion': 'chat:sistema.novedades.lesion',
      'novedad:pelea': 'chat:sistema.novedades.pelea',
      'novedad:lluvia': 'chat:sistema.novedades.lluvia',
      'novedad:acceso_cerrado': 'chat:sistema.novedades.acceso_cerrado',
      'novedad:contacto': 'chat:sistema.novedades.contacto',
      'novedad:emergencia': 'chat:sistema.novedades.emergencia',
    }
    return mapas[accion] || 'chat:sistema.generico'
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
    }
  ): Promise<CrudResult<void>> {
    try {
      const eventoResult = await this.registrarEvento(paseoId, 'bitacora', {
        accion,
        nota: opciones?.nota,
        ubicacion: opciones?.ubicacion,
        timestamp: Date.now(),
        horaLocal: opciones?.horaLocal,
      })

      if (!eventoResult.success) {
        return eventoResult
      }

      const claveI18n = this.obtenerClaveI18nBitacora(accion)
      ServicioChat.enviarMensaje(paseoId, claveI18n, 'sistema', {
        accion,
        claveI18n,
        nota: opciones?.nota,
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
    }
  ): Promise<CrudResult<void>> {
    try {
      const eventoResult = await this.registrarEvento(paseoId, 'incidente', {
        tipo,
        severidad,
        descripcion: opciones?.descripcion,
        ubicacion: opciones?.ubicacion,
        timestamp: Date.now(),
        horaLocal: opciones?.horaLocal,
      })

      if (!eventoResult.success) {
        return eventoResult
      }

      const claveI18n = `chat:sistema.incidentes.${tipo}`
      const severidadEmoji =
        severidad === 'critica' ? '🚨' : severidad === 'media' ? '⚠️' : '👁️'

      ServicioChat.enviarMensaje(
        paseoId,
        `${severidadEmoji} ${claveI18n}`,
        'sistema',
        {
          tipo,
          severidad,
          descripcion: opciones?.descripcion,
        }
      ).catch(err => {
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
