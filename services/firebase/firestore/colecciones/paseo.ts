import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import {
  Paseo,
  ESTADOS_PASEO,
  type CapaTerritorialHecho,
  type CapaContextoTerritorial,
} from '@/models/Paseo'
import {
  CrudResult,
  mapFirebaseError,
  camposSistemaActualizar,
  camposSistemaCrear,
} from '@/services/firebase/comun'
import { ServicioAuth } from '@/services/firebase/auth/auth'
import { ServicioChat } from '@/services/firebase/firestore/colecciones/chat'
import { ERR } from '@/constants'
import { validarFormatoCodigo } from '@/logic/paseos/generador'
import { coordsAH3 } from '@/services/geo/h3Utils'
import { enriquecerContextoConAPIs } from '@/services/geo/enriquecimientoTerritorial'
import { detectarPatron } from '@/logic/paseos/detectarPatrones'
import { TerritorialAggregator } from '@/services/firebase/firestore/agregadores/territorial.aggregator'
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
} from 'firebase/firestore'
import { db } from '@/firebase.config'

/**
 * Servicio de persistencia para Paseos.
 * Solo realiza operaciones CRUD y transiciones atómicas.
 */
export class ServicioPaseo {
  private static readonly COLLECTION = 'paseos'
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

  static getQuerySolicitudesPendientes(): Query {
    return query(
      collection(db, this.COLLECTION),
      where('estado', '==', ESTADOS_PASEO.PENDIENTE),
      orderBy('creado_en', 'desc')
    )
  }

  static async crear(
    data: Omit<
      Paseo,
      'id' | 'creado_en' | 'actualizado_en' | 'creado_por' | 'actualizado_por'
    >
  ): Promise<CrudResult<Paseo>> {
    return ServicioCrudBase.crear<Paseo>(this.COLLECTION, data as any)
  }

  static async obtenerPorId(id: string): Promise<CrudResult<Paseo>> {
    return ServicioCrudBase.obtenerPorId<Paseo>(this.COLLECTION, id)
  }

  static async actualizar(
    id: string,
    data: Partial<Omit<Paseo, 'id' | 'creado_en' | 'creado_por'>>
  ): Promise<CrudResult<Paseo>> {
    return ServicioCrudBase.actualizar<Paseo>(this.COLLECTION, id, data)
  }

  static async eliminar(id: string): Promise<CrudResult<boolean>> {
    return ServicioCrudBase.eliminar(this.COLLECTION, id)
  }

  /**
   * Realiza una transición de estado atómica.
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
        const paseoRef = doc(db, this.COLLECTION, paseoId)
        const paseoDoc = await transaction.get(paseoRef)

        if (!paseoDoc.exists()) {
          throw new Error(ERR.COMUN.DOCUMENTO_NO_ENCONTRADO)
        }

        const data = paseoDoc.data() as Paseo

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

      if (
        payload?.ubicacion?.lat !== undefined &&
        payload?.ubicacion?.lng !== undefined
      ) {
        try {
          const paseoRef = doc(db, this.COLLECTION, paseoId)
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

          hechoTerritorial = {
            h3_r8,
            h3_r9,
            timestamp,
            duracion_desde_inicio_paseo_segundos: duracionDesdeInicio,
          }

          // FASE 2+: Contexto Territorial (con APIs públicas gratuitas)
          // Si el cliente envió horaLocal (calculada en zona horaria correcta), usar esa
          // Si no, calcular aquí (puede tener zona horaria incorrecta si se ejecuta en servidor)
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

          console.log(
            '[ServicioPaseo.registrarEvento] Enriquecimiento Territorial:',
            {
              accion: payload.accion,
              h3_r9,
              duracion_seg: duracionDesdeInicio,
              contextoTerritorial,
            }
          )
        } catch (enrichErr) {
          console.warn(
            '[ServicioPaseo.registrarEvento] Error enriqueciendo:',
            enrichErr
          )
        }
      }

      // OPCIÓN A: Detección de patrones en cliente
      // Leer últimos eventos del paseo para detectar patrones
      if (evento === 'bitacora') {
        try {
          const eventosCol = collection(db, this.COLLECTION, paseoId, 'eventos')
          const q = query(
            eventosCol,
            where('tipoEvento', '==', 'bitacora'),
            orderBy('creado_en', 'desc')
          )
          const snapshot = await getDocs(q)
          const eventosRecientes = snapshot.docs
            .slice(0, 5)
            .map(doc => doc.data() as any)
            .reverse()

          // Crear evento temporal para detectar patrón
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

      const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
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

      const camposSistema = camposSistemaCrear(currentUser.uid)

      const entry: any = {
        evento,
        payload: payloadLimpio,
        actor: currentUser.uid,
        ...camposSistema,
      }

      const { addDoc } = await import('firebase/firestore')
      const eventosCol = collection(db, this.COLLECTION, paseoId, 'eventos')
      await addDoc(eventosCol, entry)

      const remain = (this.pendingEventos.get(paseoId) || []).filter(
        (e: any) => e.id !== localId
      )
      if (remain.length) this.pendingEventos.set(paseoId, remain)
      else this.pendingEventos.delete(paseoId)

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

  static obtenerEventosPendientes(paseoId: string) {
    return (this.pendingEventos.get(paseoId) || []).slice()
  }

  /**
   * Valida código de recogida POR TUTOR (no por mascota)
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

    const paseoRef = doc(db, 'paseos', paseoId)

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

  static async buscarPaseos(
    filtros: { campo: string; op: any; valor: any }[],
    orden?: { campo: string; dir: 'asc' | 'desc' }
  ): Promise<CrudResult<Paseo[]>> {
    try {
      let q = query(collection(db, this.COLLECTION))
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
   * Mapea 'accion' → 'paseos.bitacora.sistema.acciones_mascota.accion'
   */
  private static obtenerClaveI18nBitacora(accion: string): string {
    // Mapear acciones a claves i18n en el namespace 'chat' con puntos para objetos anidados
    const mapas: Record<string, string> = {
      // Acciones de mascota
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
      // Lugares
      'lugar:parque': 'chat:sistema.lugares.parque',
      'lugar:sendero': 'chat:sistema.lugares.sendero',
      'lugar:zona_residencial': 'chat:sistema.lugares.zona_residencial',
      'lugar:zona_perros': 'chat:sistema.lugares.zona_perros',
      'lugar:pet_friendly': 'chat:sistema.lugares.pet_friendly',
      'lugar:rio': 'chat:sistema.lugares.rio',
      'lugar:vehiculo': 'chat:sistema.lugares.vehiculo',
      'lugar:otro_lugar': 'chat:sistema.lugares.otro_lugar',
      // Momentos
      'recuerdo:foto': 'chat:sistema.recuerdos.foto',
      'recuerdo:video': 'chat:sistema.recuerdos.video',
      'recuerdo:voz': 'chat:sistema.recuerdos.voz',
      'recuerdo:nota': 'chat:sistema.recuerdos.nota',
      // Novedades
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
   * La bitácora es la narrativa del paseo: qué hizo la mascota, dónde fue, qué pasó.
   *
   * ENRIQUECIMIENTO AUTOMÁTICO:
   * - Fase 1 (Hecho): H3 R8/R9, duración desde inicio del paseo
   * - Fase 2 (Contexto): Hora local, sin APIs externas
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
   * Los incidentes tienen severidad (baja, media, crítica) para filtrado y alertas.
   * TAMBIÉN crea un mensaje del sistema de NOTIFICACIÓN en el chat del paseo.
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
        h3_r8?: string
        h3_r9?: string
      }
      horaLocal?: string
    }
  ): Promise<CrudResult<void>> {
    try {
      // 1. Registrar evento de incidente
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

      // 2. Crear mensaje de NOTIFICACIÓN en el chat (fire-and-forget)
      const claveI18nIncidente = `chat:sistema.novedades.${tipo}`
      const tipoMensaje = severidad === 'critica' ? 'notificacion' : 'sistema'
      ServicioChat.enviarMensaje(paseoId, claveI18nIncidente, tipoMensaje, {
        tipo,
        severidad,
        descripcion: opciones?.descripcion,
        claveI18n: claveI18nIncidente,
      }).catch(err => {
        console.warn(
          '[ServicioPaseo.registrarIncidente] Error enviando msg incidente:',
          err
        )
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }
}
