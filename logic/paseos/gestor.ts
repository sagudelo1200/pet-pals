import {
  ServicioAuth,
  ServicioPaseo,
  ServicioCrudBase,
  ServicioPaseoMascota,
} from '@/services/firebase'
import { ESTADOS_PASEO, type Paseo } from '@/models/Paseo'
import type { Mascota } from '@/models/Mascota'
import { MAX_MASCOTAS_POR_PASEO, ERR } from '@/constants'
import type { Ubicacion } from '@/models/Ubicacion'
import { crearMaquinaPaseo, EVENTOS } from './maquinaEstados'
import { generarCodigosRecogidaPorTutor } from './generador'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  type Query,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import { coordsAH3 } from '@/services/geo'
import { ServicioZonasH3 } from '@/services/firebase/firestore/colecciones/h3_zonas'

// ---------- Types del gestor de paseo activo ----------
export type CodigoErrorPaseo =
  | 'NO_HAY_PASEO_ACTIVO'
  | 'TRANSICION_INVALIDA'
  | 'ESTADO_INCORRECTO'
  | 'SIN_PERMISOS'
  | 'ERROR_RED'
  | 'ERROR_VALIDACION'
  | 'MOTIVO_REQUERIDO'
  | 'PASEO_YA_ACEPTADO'
  | 'DOBLE_BOOKING_DETECTADO'
  | 'CUIDADOR_OCUPADO'

export interface PaseoActivoTimestamps {
  creado?: Date
  confirmado?: Date
  enCamino?: Date
  iniciado?: Date
  finalizado?: Date
  cancelado?: Date
  completado?: Date
}

export interface PaseoActivo {
  id: string
  estado: ESTADOS_PASEO
  tutor: Partial<any>
  cuidador?: Partial<any>
  mascota_ids?: string[]
  direccion?: string
  timestamps: PaseoActivoTimestamps
  esActivo: boolean
  original?: Partial<Paseo>
}

export type ResultadoAccion =
  { ok: true } | { ok: false; error: CodigoErrorPaseo; detalles?: string }

// ---------- Errores / i18n map ----------
export const CODIGOS_ERROR_PASEO: Record<CodigoErrorPaseo, string> = {
  NO_HAY_PASEO_ACTIVO: 'paseos:errores.NO_HAY_PASEO_ACTIVO',
  TRANSICION_INVALIDA: 'paseos:errores.transicion_invalida',
  ESTADO_INCORRECTO: 'paseos:errores.estado_incorrecto',
  SIN_PERMISOS: 'paseos:errores.sin_permisos',
  ERROR_RED: 'paseos:errores.error_red',
  ERROR_VALIDACION: 'paseos:errores.error_validacion',
  MOTIVO_REQUERIDO: 'paseos:errores.motivo_requerido',
  PASEO_YA_ACEPTADO: 'paseos:errores.paseo_ya_aceptado',
  DOBLE_BOOKING_DETECTADO: 'paseos:errores.doble_booking_detectado',
  CUIDADOR_OCUPADO: 'paseos:errores.cuidador_ocupado',
} as const

export function obtenerClaveI18nError(codigo: CodigoErrorPaseo): string {
  return CODIGOS_ERROR_PASEO[codigo]
}

export const MENSAJES_ERROR_FALLBACK: Record<CodigoErrorPaseo, string> = {
  NO_HAY_PASEO_ACTIVO: 'No hay un paseo activo en este momento',
  TRANSICION_INVALIDA: 'Esta acción no está permitida en el estado actual',
  ESTADO_INCORRECTO: 'El paseo no está en el estado esperado',
  SIN_PERMISOS: 'No tienes permisos para realizar esta acción',
  ERROR_RED: 'Error de conexión. Verifica tu internet',
  ERROR_VALIDACION: 'Los datos proporcionados no son válidos',
  MOTIVO_REQUERIDO: 'Se requiere un motivo para esta acción',
  PASEO_YA_ACEPTADO: 'Este paseo ya fue aceptado por otro cuidador',
  DOBLE_BOOKING_DETECTADO: 'Ya tienes otro paseo en este horario',
  CUIDADOR_OCUPADO: 'No disponible en este horario',
} as const

// ---------- Gestor de Paseo Activo (estado en memoria + transiciones) ----------
type Listener = (_p: PaseoActivo | null) => void

export class GestorPaseoActivo {
  private _paseo: PaseoActivo | null = null
  private listeners = new Set<Listener>()

  getPaseoActivo(): PaseoActivo | null {
    return this._paseo ? { ...(this._paseo as any) } : null
  }

  suscribir(listener: Listener) {
    this.listeners.add(listener)
    listener(this.getPaseoActivo())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notificar() {
    const snapshot = this.getPaseoActivo()
    for (const l of Array.from(this.listeners)) l(snapshot)
  }

  setPaseoActivo(paseo: Paseo): ResultadoAccion {
    const nuevo: PaseoActivo = {
      id: paseo.id,
      estado: paseo.estado,
      tutor: { nombre: (paseo as any).tutor_nombre_visual || '' },
      cuidador: paseo.id_cuidador
        ? { nombre: (paseo as any).cuidador_nombre_visual || '' }
        : undefined,
      mascota_ids: paseo.mascota_ids || [],
      direccion: paseo.ubicacion_inicio_txt || undefined,
      timestamps: {
        creado: paseo.creado_en,
        iniciado: paseo.fecha_inicio_real,
        finalizado: paseo.fecha_fin_real,
        enCamino: undefined,
        cancelado: undefined,
        confirmado: undefined,
        completado: undefined,
      },
      esActivo: [
        ESTADOS_PASEO.PENDIENTE,
        ESTADOS_PASEO.CONFIRMADO,
        ESTADOS_PASEO.EN_CAMINO,
        ESTADOS_PASEO.EN_PROGRESO,
      ].includes(paseo.estado),
      original: paseo,
    }

    this._paseo = nuevo
    this.notificar()
    return { ok: true }
  }

  limpiarPaseoActivo(): ResultadoAccion {
    this._paseo = null
    this.notificar()
    return { ok: true }
  }

  puede(evento: string): boolean {
    if (!this._paseo?.original) return false
    const maquina = crearMaquinaPaseo(this._paseo.original)
    return maquina.puede(evento as any)
  }

  private aplicarTransicion(evento: string, payload?: any): ResultadoAccion {
    if (!this._paseo || !this._paseo.original)
      return { ok: false, error: 'NO_HAY_PASEO_ACTIVO' }

    const maquina = crearMaquinaPaseo(this._paseo.original)

    try {
      if (!maquina.puede(evento as any)) {
        return {
          ok: false,
          error: 'TRANSICION_INVALIDA',
          detalles: `No se puede ${evento} desde ${maquina.estado}`,
        }
      }

      const nuevoEstado = maquina.transicion(evento as any, payload)

      const nuevoPaseo: PaseoActivo = {
        ...this._paseo,
        estado: nuevoEstado,
        original: { ...(this._paseo.original || {}), estado: nuevoEstado },
      }

      const ts = { ...(nuevoPaseo.timestamps || {}) }
      const ahora = new Date()
      switch (evento) {
        case EVENTOS.ACEPTAR:
          ts.confirmado = ahora
          break
        case EVENTOS.INICIAR_RUTA:
          ts.enCamino = ahora
          break
        case EVENTOS.INICIAR_PASEO:
          ts.iniciado = payload?.fecha_inicio_real || ahora
          break
        case EVENTOS.FINALIZAR_PASEO:
          ts.finalizado = payload?.fecha_fin_real || ahora
          break
        case EVENTOS.CANCELAR:
          ts.cancelado = ahora
          break
      }

      nuevoPaseo.timestamps = ts
      nuevoPaseo.esActivo = ![
        ESTADOS_PASEO.FINALIZADO,
        ESTADOS_PASEO.COMPLETADO,
        ESTADOS_PASEO.CANCELADO,
        ESTADOS_PASEO.ERROR,
      ].includes(nuevoEstado)

      this._paseo = nuevoPaseo
      this.notificar()
      return { ok: true }
    } catch (err: any) {
      console.warn('[paseoActivo] Error en transición:', err)
      return {
        ok: false,
        error: 'ERROR_VALIDACION',
        detalles: err?.message || String(err),
      }
    }
  }

  aceptarPaseo(): ResultadoAccion {
    return this.aplicarTransicion(EVENTOS.ACEPTAR)
  }

  iniciarRuta(): ResultadoAccion {
    return this.aplicarTransicion(EVENTOS.INICIAR_RUTA)
  }

  iniciarPaseo(fecha_inicio_real?: Date): ResultadoAccion {
    return this.aplicarTransicion(EVENTOS.INICIAR_PASEO, { fecha_inicio_real })
  }

  finalizarPaseo(fecha_fin_real?: Date): ResultadoAccion {
    return this.aplicarTransicion(EVENTOS.FINALIZAR_PASEO, { fecha_fin_real })
  }

  cancelarPaseo(motivo?: string): ResultadoAccion {
    return this.aplicarTransicion(EVENTOS.CANCELAR, { motivo })
  }

  async aceptarPaseoAsync(): Promise<any> {
    if (!this._paseo) return { success: false, error: 'NO_HAY_PASEO_ACTIVO' }

    if (!this.puede(EVENTOS.ACEPTAR)) {
      return { success: false, error: 'TRANSICION_INVALIDA' }
    }

    const current = ServicioAuth.obtenerUsuarioActual()
    if (!current) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

    const res = await ServicioPaseo.commitEstadoTransaccional(
      this._paseo.id,
      ESTADOS_PASEO.PENDIENTE,
      ESTADOS_PASEO.CONFIRMADO,
      {
        id_cuidador: current.uid,
        cuidador_nombre_visual: current.displayName || 'Cuidador',
        cuidador_foto_visual: current.photoURL || null,
      }
    )

    if (res.success) {
      if (this.puede(EVENTOS.ACEPTAR)) {
        const localRes = this.aplicarTransicion(EVENTOS.ACEPTAR)
        if (localRes.ok === false) {
          console.warn(
            'paseoActivo: Inconsistencia tras aceptarPaseoAsync',
            localRes.error
          )
        }
        try {
          await ServicioPaseo.registrarEvento(this._paseo.id, 'ACEPTAR', {
            estado_anterior: 'PENDIENTE',
            estado_nuevo: 'CONFIRMADO',
            id_cuidador: ServicioAuth.obtenerUsuarioActual()?.uid,
          })
        } catch (e) {
          console.warn('Error registrando evento ACEPTAR (optimista):', e)
        }
      }
    }
    return res
  }

  async iniciarRutaAsync(): Promise<any> {
    if (!this._paseo) return { success: false, error: 'NO_HAY_PASEO_ACTIVO' }

    if (!this.puede(EVENTOS.INICIAR_RUTA)) {
      return { success: false, error: 'TRANSICION_INVALIDA' }
    }

    const res = await ServicioPaseo.commitEstadoTransaccional(
      this._paseo.id,
      ESTADOS_PASEO.CONFIRMADO,
      ESTADOS_PASEO.EN_CAMINO
    )

    if (res.success) {
      if (this.puede(EVENTOS.INICIAR_RUTA)) {
        const localRes = this.aplicarTransicion(EVENTOS.INICIAR_RUTA)
        if (localRes.ok === false) {
          console.warn(
            'paseoActivo: Inconsistencia tras iniciarRutaAsync',
            localRes.error
          )
        }
        try {
          await ServicioPaseo.registrarEvento(this._paseo.id, 'INICIAR_RUTA', {
            estado_anterior: 'CONFIRMADO',
            estado_nuevo: 'EN_CAMINO',
          })
        } catch (e) {
          console.warn('Error registrando evento INICIAR_RUTA (optimista):', e)
        }
      }
    }
    return res
  }

  async llegarPuntoRecogidaAsync(): Promise<any> {
    if (!this._paseo) return { success: false, error: 'NO_HAY_PASEO_ACTIVO' }

    if (!this.puede(EVENTOS.LLEGAR_PUNTO_RECOGIDA)) {
      return { success: false, error: 'TRANSICION_INVALIDA' }
    }

    const res = await ServicioPaseo.commitEstadoTransaccional(
      this._paseo.id,
      ESTADOS_PASEO.EN_CAMINO,
      ESTADOS_PASEO.EN_PUNTO_RECOGIDA
    )

    if (res.success) {
      if (this.puede(EVENTOS.LLEGAR_PUNTO_RECOGIDA)) {
        const localRes = this.aplicarTransicion(EVENTOS.LLEGAR_PUNTO_RECOGIDA)
        if (localRes.ok === false) {
          console.warn(
            'paseoActivo: Inconsistencia tras llegarPuntoRecogidaAsync',
            localRes.error
          )
        }
        try {
          await ServicioPaseo.registrarEvento(
            this._paseo.id,
            'LLEGAR_PUNTO_RECOGIDA',
            {
              estado_anterior: 'EN_CAMINO',
              estado_nuevo: 'EN_PUNTO_RECOGIDA',
            }
          )
        } catch (e) {
          console.warn(
            'Error registrando evento LLEGAR_PUNTO_RECOGIDA (optimista):',
            e
          )
        }
      }
    }
    return res
  }

  async iniciarPaseoAsync(): Promise<any> {
    if (!this._paseo) return { success: false, error: 'NO_HAY_PASEO_ACTIVO' }

    if (!this.puede(EVENTOS.INICIAR_PASEO)) {
      return { success: false, error: 'TRANSICION_INVALIDA' }
    }

    const { serverTimestamp } = await import('firebase/firestore')

    // Detectar estado actual y transicionar correctamente
    const estadoActual = this._paseo.estado
    const estadoDesde = [
      ESTADOS_PASEO.EN_CAMINO,
      ESTADOS_PASEO.EN_PUNTO_RECOGIDA,
    ].includes(estadoActual)
      ? estadoActual
      : ESTADOS_PASEO.EN_CAMINO

    const res = await ServicioPaseo.commitEstadoTransaccional(
      this._paseo.id,
      estadoDesde,
      ESTADOS_PASEO.EN_PROGRESO,
      { fecha_inicio_real: serverTimestamp() }
    )

    if (res.success) {
      // Marcar zona como en operación activa
      const celdaInicio = extraerCeldaH3DePaseo(this._paseo.original)
      if (celdaInicio) {
        ServicioZonasH3.actualizarZona(celdaInicio, {
          paseos_activos: 1,
          marcar_actividad: true,
        }).catch(e => console.warn('[h3] iniciarPaseoAsync:', e))
      }

      if (this.puede(EVENTOS.INICIAR_PASEO)) {
        const fecha = new Date()
        const localRes = this.aplicarTransicion(EVENTOS.INICIAR_PASEO, {
          fecha_inicio_real: fecha,
        })
        if (localRes.ok === false) {
          console.warn(
            'paseoActivo: Inconsistencia tras iniciarPaseoAsync',
            localRes.error
          )
        }
        try {
          await ServicioPaseo.registrarEvento(this._paseo.id, 'INICIAR_PASEO', {
            estado_anterior: 'EN_CAMINO',
            estado_nuevo: 'EN_PROGRESO',
            fecha_inicio_real: fecha,
          })
        } catch (e) {
          console.warn('Error registrando evento INICIAR_PASEO (optimista):', e)
        }
      }
    }
    return res
  }

  async finalizarPaseoAsync(): Promise<any> {
    if (!this._paseo) return { success: false, error: 'NO_HAY_PASEO_ACTIVO' }

    if (!this.puede(EVENTOS.FINALIZAR_PASEO)) {
      return { success: false, error: 'TRANSICION_INVALIDA' }
    }

    const { serverTimestamp } = await import('firebase/firestore')
    const res = await ServicioPaseo.commitEstadoTransaccional(
      this._paseo.id,
      ESTADOS_PASEO.EN_PROGRESO,
      ESTADOS_PASEO.FINALIZADO,
      { fecha_fin_real: serverTimestamp() }
    )

    if (res.success) {
      // Paseo terminado: decrementar activos, sumar al total histórico y bajar demanda
      const celdaFin = extraerCeldaH3DePaseo(this._paseo.original)
      if (celdaFin) {
        ServicioZonasH3.actualizarZona(celdaFin, {
          paseos_activos: -1,
          paseos_total: 1,
          demanda_total: -1,
        }).catch(e => console.warn('[h3] finalizarPaseoAsync:', e))
      }

      if (this.puede(EVENTOS.FINALIZAR_PASEO)) {
        const fecha = new Date()
        const localRes = this.aplicarTransicion(EVENTOS.FINALIZAR_PASEO, {
          fecha_fin_real: fecha,
        })
        if (localRes.ok === false) {
          console.warn(
            'paseoActivo: Inconsistencia tras finalizarPaseoAsync',
            localRes.error
          )
        }
        try {
          await ServicioPaseo.registrarEvento(
            this._paseo.id,
            'FINALIZAR_PASEO',
            {
              estado_anterior: 'EN_PROGRESO',
              estado_nuevo: 'FINALIZADO',
              fecha_fin_real: fecha,
            }
          )
        } catch (e) {
          console.warn(
            'Error registrando evento FINALIZAR_PASEO (optimista):',
            e
          )
        }
      }
    }
    return res
  }

  async cancelarPaseoAsync(motivo?: string): Promise<any> {
    if (!this._paseo) return { success: false, error: 'NO_HAY_PASEO_ACTIVO' }
    if (!motivo) return { success: false, error: 'MOTIVO_REQUERIDO' }

    if (!this.puede(EVENTOS.CANCELAR)) {
      return { success: false, error: 'TRANSICION_INVALIDA' }
    }

    const res = await ServicioPaseo.actualizar(this._paseo.id, {
      estado: 'CANCELADO',
    } as any)

    if (res.success) {
      // Revertir la demanda registrada al crear el paseo
      const celdaCancelado = extraerCeldaH3DePaseo(this._paseo.original)
      if (celdaCancelado) {
        ServicioZonasH3.actualizarZona(celdaCancelado, {
          demanda_total: -1,
        }).catch(e => console.warn('[h3] cancelarPaseoAsync:', e))
      }

      if (this.puede(EVENTOS.CANCELAR)) {
        const localRes = this.aplicarTransicion(EVENTOS.CANCELAR, { motivo })
        if (localRes.ok === false) {
          console.warn(
            'paseoActivo: Inconsistencia tras cancelarPaseoAsync',
            localRes.error
          )
        }
        try {
          await ServicioPaseo.registrarEvento(this._paseo.id, 'CANCELAR', {
            motivo,
            estado_anterior: undefined,
            estado_nuevo: 'CANCELADO',
          })
        } catch (e) {
          console.warn('Error registrando evento CANCELAR (optimista):', e)
        }
      }
    }

    if (res.success) return { success: true }
    return { success: false, error: res.error }
  }
}

export const paseoActivo = new GestorPaseoActivo()

// Extrae la celda H3 de la ubicación de inicio de un paseo activo
function extraerCeldaH3DePaseo(
  original: Partial<Paseo> | null | undefined
): string | null {
  if (!original) return null
  const inicio = original.ubicacion_inicio
  if (!inicio || typeof inicio === 'string') return null
  const coords = (inicio as any)?.coordenadas
  if (!coords?.latitude || !coords?.longitude) return null
  return coordsAH3(coords.latitude, coords.longitude)
}

// ---------- Helpers de denormalización ----------
const MAX_DENORMALIZED_PHOTO_SIZE = 120 * 1024 // 120KB (suficiente para URLs y mini-thumbnails)

function sanitizarFotoDenormalizada(
  foto: string | null | undefined
): string | null {
  if (!foto) return null
  // Si la foto es un base64 muy grande (> 120KB), la omitimos en la denormalización
  // para evitar exceder el límite de 1MB de Firestore en el documento principal.
  if (foto.startsWith('data:') && foto.length > MAX_DENORMALIZED_PHOTO_SIZE) {
    console.warn(
      `[Paseos] Foto base64 demasiado grande (${Math.round(foto.length / 1024)}KB). Omitiendo denormalización.`
    )
    return null
  }
  return foto
}

function prepararDataPaseoMascota(
  paseoId: string,
  mascota: any,
  direccion?: Ubicacion
) {
  return {
    id: mascota.id,
    id_paseo: paseoId,
    id_mascota: mascota.id,
    id_usuario: mascota.creado_por,
    estado_mascota: 'pendiente',
    // Nota: Los códigos de validación ahora están a nivel de PASEO (por tutor)
    // Ver Paseo.codigos_recogida_por_tutor, etc.
    direccion: direccion
      ? {
          id_origen: direccion.id,
          alias: direccion.alias,
          direccion_formateada: direccion.direccion_formateada,
          coordenadas: {
            latitude: Number(direccion.coordenadas.latitude),
            longitude: Number(direccion.coordenadas.longitude),
          },
          instrucciones: direccion.instrucciones || null,
        }
      : null,
  }
}

// ---------- Validaciones de Tier 1 ----------

/**
 * Valida que el cuidador NO tenga otro paseo en la misma franja horaria.
 * Previene "double booking" donde un cuidador acepta 2+ paseos simultáneos.
 * @param uid ID del cuidador
 * @param fechaInicio Fecha/hora de inicio del paseo a aceptar
 * @param duracion Duración en minutos
 * @returns {error: string} si hay overlap, {success: true} si está libre
 */
async function validarNoDoubleBooking(
  uid: string,
  fechaInicio: Date,
  duracion: number
) {
  try {
    // Query: paseos del cuidador en estados activos
    const agendaQuery = query(
      collection(db, 'paseos'),
      where('id_cuidador', '==', uid),
      where('estado', 'in', [
        ESTADOS_PASEO.CONFIRMADO,
        ESTADOS_PASEO.EN_CAMINO,
        ESTADOS_PASEO.EN_PROGRESO,
      ]),
      orderBy('fecha_hora_inicio', 'asc')
    )

    const docs = await getDocs(agendaQuery)
    const fechaFin = new Date(fechaInicio.getTime() + duracion * 60000)

    for (const doc of docs.docs) {
      const paseoExistente = doc.data() as Paseo
      const finExistente = new Date(
        paseoExistente.fecha_hora_inicio.getTime() +
          (paseoExistente.duracion_estimada || 0) * 60000
      )

      // Verificar overlap de horarios (con buffer de 5 min)
      const bufferMs = 5 * 60 * 1000
      const overlapDetectado =
        fechaInicio < new Date(finExistente.getTime() + bufferMs) &&
        fechaFin >
          new Date(paseoExistente.fecha_hora_inicio.getTime() - bufferMs)

      if (overlapDetectado) {
        return {
          success: false,
          error: 'DOBLE_BOOKING_DETECTADO',
          detalles: `Tienes otro paseo de ${paseoExistente.duracion_estimada}min a las ${paseoExistente.fecha_hora_inicio.toLocaleTimeString('es-AR')}`,
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Tier1.2] Error validando double booking:', error)
    return {
      success: false,
      error: 'ERROR_VALIDACION',
      detalles: 'No se pudo verificar disponibilidad',
    }
  }
}

/**
 * Valida que una mascota no tenga otro paseo solapado en la misma franja horaria.
 * Similar a validarNoDoubleBooking pero por `mascotaId`.
 * Solo valida paseos propios (creado_por == uid) para cumplir permisos de Firestore.
 */
async function validarNoSolapamientoPorMascota(
  mascotaId: string,
  fechaInicio: Date,
  duracion: number,
  uid: string
) {
  try {
    const estadosActivos = [
      ESTADOS_PASEO.PENDIENTE,
      ESTADOS_PASEO.CONFIRMADO,
      ESTADOS_PASEO.EN_CAMINO,
      ESTADOS_PASEO.EN_PROGRESO,
    ]

    const q = query(
      collection(db, 'paseos'),
      where('creado_por', '==', uid),
      where('mascota_ids', 'array-contains', mascotaId),
      where('estado', 'in', estadosActivos)
    )

    const docs = await getDocs(q)
    const fechaFin = new Date(fechaInicio.getTime() + duracion * 60000)

    for (const doc of docs.docs) {
      const paseoExistente = doc.data() as Paseo
      const inicioExistente = new Date(paseoExistente.fecha_hora_inicio)
      const finExistente = new Date(
        inicioExistente.getTime() +
          (paseoExistente.duracion_estimada || 0) * 60000
      )

      const bufferMs = 5 * 60 * 1000
      const overlapDetectado =
        fechaInicio < new Date(finExistente.getTime() + bufferMs) &&
        fechaFin > new Date(inicioExistente.getTime() - bufferMs)

      if (overlapDetectado) {
        return {
          success: false,
          error: 'DOBLE_BOOKING_MASCOTA',
          detalles: `Mascota ${mascotaId} tiene otro paseo de ${paseoExistente.duracion_estimada}min a las ${inicioExistente.toLocaleTimeString()}`,
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Tier1.3] Error validando solapamiento por mascota:', error)
    return {
      success: false,
      error: 'ERROR_VALIDACION',
      detalles: 'No se pudo verificar disponibilidad de la mascota',
    }
  }
}

// ---------- Funciones públicas del gestor (crearConMascotas) ----------
export async function crearConMascotas(
  data: Omit<
    Paseo,
    | 'id'
    | 'creado_en'
    | 'actualizado_en'
    | 'creado_por'
    | 'actualizado_por'
    | 'mascotas_count'
  >,
  mascotaIds: string[],
  direccion?: Ubicacion
): Promise<{ success: boolean; data?: Paseo; error?: any }> {
  const current = ServicioAuth.obtenerUsuarioActual()
  const uid = current?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  const unique = Array.from(new Set((mascotaIds || []).filter(Boolean)))
  const maxPaseo =
    typeof (data as any).cupo_maximo_mascotas === 'number'
      ? (data as any).cupo_maximo_mascotas
      : MAX_MASCOTAS_POR_PASEO
  const max = Math.min(MAX_MASCOTAS_POR_PASEO, maxPaseo)
  if (unique.length > max)
    return { success: false, error: ERR.PASEOS.LIMITE_DE_MASCOTAS_SUPERADO }

  const mascotasData: any[] = []
  if (unique.length > 0) {
    const resultados = await Promise.all(
      unique.map(mid => ServicioCrudBase.obtenerPorId<Mascota>('mascotas', mid))
    )

    for (const res of resultados) {
      if (!res.success || !res.data)
        return { success: false, error: ERR.MASCOTAS.MASCOTA_NO_ENCONTRADA }

      const m = res.data as any
      if (m.creado_por !== uid)
        return {
          success: false,
          error: ERR.MASCOTAS.MASCOTA_NO_PERTENECE_AL_USUARIO,
        }
      mascotasData.push(m)
    }
  }

  // Validación adicional: asegurar que ninguna mascota seleccionada tenga
  // otro paseo solapado en la misma franja horaria.
  const fechaInicioRaw = (data as any).fecha_hora_inicio
  const duracionPropuesta = (data as any).duracion_estimada || 60
  if (fechaInicioRaw) {
    const fechaInicio = new Date(fechaInicioRaw)
    for (const mid of unique) {
      const validMasc = await validarNoSolapamientoPorMascota(
        mid,
        fechaInicio,
        duracionPropuesta,
        uid
      )
      if (!validMasc.success) return validMasc
    }
  }

  let locationData: any = {}
  const locObj = (data.ubicacion_inicio as any) || direccion

  if (locObj && typeof locObj === 'object') {
    // Validar que coordenadas existan y sean válidas
    if (
      !locObj.coordenadas ||
      typeof locObj.coordenadas.latitude === 'undefined' ||
      typeof locObj.coordenadas.longitude === 'undefined'
    ) {
      return {
        success: false,
        error: ERR.PASEOS.UBICACION_INVALIDA,
      }
    }

    const lat = Number(locObj.coordenadas.latitude)
    const lng = Number(locObj.coordenadas.longitude)

    // Verificar que las coordenadas convertidas sean números válidos
    if (isNaN(lat) || isNaN(lng)) {
      return {
        success: false,
        error: ERR.PASEOS.COORDENADAS_INVALIDAS,
      }
    }

    const snap = {
      direccion_formateada: locObj.direccion_formateada || '',
      coordenadas: {
        latitude: lat,
        longitude: lng,
      },
      id_origen: locObj.id,
      alias: locObj.alias,
    }
    locationData = {
      ubicacion_inicio: snap,
      ubicacion_inicio_txt:
        locObj.alias || locObj.direccion_formateada || 'Ubicación',
    }
  }

  let visualData: any = {}
  if (mascotasData.length > 0) {
    const fotos: string[] = []
    let primerNombre = ''

    const limit = Math.min(mascotasData.length, 4)
    for (let i = 0; i < limit; i++) {
      const d = mascotasData[i]
      if (i === 0) primerNombre = d.nombre
      const foto = sanitizarFotoDenormalizada(d.foto_url || d.foto)
      if (foto) fotos.push(foto)
    }

    visualData = {
      mascota_nombre_visual: primerNombre,
      mascota_foto_visual: fotos[0] || null,
      mascotas_fotos_visual: fotos,
    }
  }

  // Generar códigos de recogida por tutor
  // En paseos privados: solo el tutor que lo crea (uid)
  // En paseos compartidos: se agregarán cuando otros tutores unan mascotas
  const tutoresIniciales = [uid]
  const codigosRecogidaPorTutor =
    generarCodigosRecogidaPorTutor(tutoresIniciales)

  const paseoRes = await ServicioPaseo.crear({
    ...(data as any),
    ...locationData,
    cupo_maximo_mascotas: max,
    mascotas_count: unique.length,
    mascota_ids: unique,
    codigos_recogida_por_tutor: codigosRecogidaPorTutor,
    codigo_recogida_validado_por_tutor: {},
    intentos_fallidos_recogida_por_tutor: {},
    codigos_entrega_por_tutor: {},
    codigo_entrega_validado_por_tutor: {},
    intentos_fallidos_entrega_por_tutor: {},
    ...visualData,
  } as any)

  if (!paseoRes.success || !paseoRes.data) return paseoRes as any

  if (unique.length > 0) {
    const payloadMascotas = mascotasData.map(m =>
      prepararDataPaseoMascota(paseoRes.data!.id, m, direccion)
    )
    const addRes = await ServicioPaseoMascota.commitMascotasBatch(
      paseoRes.data.id,
      payloadMascotas
    )
    if (!addRes.success) return { success: false, error: (addRes as any).error }
  }

  // Registrar demanda en la zona H3 de inicio (fire-and-forget)
  const lat = (locObj as any)?.coordenadas?.latitude
  const lng = (locObj as any)?.coordenadas?.longitude
  if (lat && lng) {
    ServicioZonasH3.actualizarZona(coordsAH3(lat, lng), {
      demanda_total: 1,
      marcar_demanda: true,
    }).catch(e => console.warn('[h3] crearConMascotas:', e))
  }

  return paseoRes as any
}

// ---------- Orquestadores de estado (migrados desde services) ----------

/**
 * TIER 1: Aceptar solicitud con reintento automático y validación de double booking
 * - Previene doble asignación (2 clientes aceptan < 1seg)
 * - Previene double booking (cuidador con 2 paseos simultáneos)
 * - Reintentos automáticos (máx 2 intentos)
 */
export async function aceptarSolicitud(paseoId: string) {
  const current = ServicioAuth.obtenerUsuarioActual()
  const uid = current?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  const paseoRes = await ServicioPaseo.obtenerPorId(paseoId)
  if (!paseoRes.success || !paseoRes.data)
    return { success: false, error: ERR.COMUN.DOCUMENTO_NO_ENCONTRADO }

  const paseo = paseoRes.data as Paseo
  if (paseo.estado !== ESTADOS_PASEO.PENDIENTE)
    return { success: false, error: 'PASEO_NO_DISPONIBLE' }
  if (paseo.creado_por === uid)
    return { success: false, error: 'NO_PUEDE_ACEPTAR_PROPIO_PASEO' }
  if (paseo.id_cuidador && paseo.id_cuidador !== uid)
    return { success: false, error: 'PASEO_YA_ACEPTADO' }

  // TIER 1.2: Validar que cuidador NO tenga otro paseo en mismo horario
  const validacionDbBooking = await validarNoDoubleBooking(
    uid,
    paseo.fecha_hora_inicio,
    paseo.duracion_estimada || 0
  )
  if (!validacionDbBooking.success) {
    return {
      success: false,
      error: validacionDbBooking.error,
      detalles: (validacionDbBooking as any).detalles,
    }
  }

  const cuidador_nombre_visual = current.displayName || 'Cuidador'
  const cuidador_foto_visual = sanitizarFotoDenormalizada(
    current.photoURL || null
  )

  // TIER 1.1: Reintento automático (máx 2 intentos) en caso de doble asignación
  const MAX_REINTENTOS = 2
  let _ultimoError: any = null

  for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
    const res = await ServicioPaseo.commitEstadoTransaccional(
      paseoId,
      ESTADOS_PASEO.PENDIENTE,
      ESTADOS_PASEO.CONFIRMADO,
      {
        id_cuidador: uid,
        cuidador_nombre_visual,
        cuidador_foto_visual,
      }
    )

    if (res.success) {
      try {
        paseoActivo.aceptarPaseo()
      } catch (e) {
        console.warn('Error actualizando paseoActivo:', e)
      }
      // Registrar evento técnico
      await ServicioPaseo.registrarEvento(paseoId, 'ACEPTAR', {
        estado_anterior: 'PENDIENTE',
        estado_nuevo: 'CONFIRMADO',
        id_cuidador: uid,
        cuidador_nombre_visual,
        cuidador_foto_visual,
        intento,
      })
      return res
    }

    _ultimoError = res.error

    // Si es doble asignación, reintentar (otro cliente ganó, pero podría haber estado en PENDIENTE)
    const esDoubleAsignacion =
      res.error === 'PASEO_YA_ACEPTADO' ||
      res.error?.includes('estado no esperado') ||
      res.error?.includes('ESTADO_NO_ESPERADO')

    if (!esDoubleAsignacion) {
      // Error diferente, no reintentar
      return res
    }

    if (intento < MAX_REINTENTOS) {
      // Wait 100ms before retry
      await new Promise(resolve => setTimeout(resolve, 100))
      // Re-fetch para verificar estado actual
      const paseoActualRes = await ServicioPaseo.obtenerPorId(paseoId)
      if (paseoActualRes.success && paseoActualRes.data) {
        const paseoActual = paseoActualRes.data as Paseo
        if (paseoActual.estado !== ESTADOS_PASEO.PENDIENTE) {
          // Paseo ya no está en PENDIENTE, abortamos
          return {
            success: false,
            error: 'PASEO_YA_ACEPTADO',
            detalles: `Aceptado por ${paseoActual.cuidador_nombre_visual} hace unos segundos`,
          }
        }
      }
    }
  }

  // Si llegamos aquí, fallaron todos los intentos
  return {
    success: false,
    error: 'PASEO_YA_ACEPTADO',
    detalles: 'Este paseo ya fue aceptado por otro cuidador. Intenta con otro.',
  }
}

export async function iniciarRuta(paseoId: string) {
  const current = ServicioAuth.obtenerUsuarioActual()
  const uid = current?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  const paseoRes = await ServicioPaseo.obtenerPorId(paseoId)
  if (!paseoRes.success || !paseoRes.data)
    return { success: false, error: ERR.COMUN.DOCUMENTO_NO_ENCONTRADO }

  const paseo = paseoRes.data as Paseo
  const maquina = crearMaquinaPaseo(paseo)
  if (!maquina.puede('INICIAR_RUTA'))
    return { success: false, error: 'TRANSICION_INVALIDA' }

  const res = await ServicioPaseo.commitEstadoTransaccional(
    paseoId,
    ESTADOS_PASEO.CONFIRMADO,
    ESTADOS_PASEO.EN_CAMINO
  )
  if (res.success) {
    try {
      paseoActivo.iniciarRuta()
    } catch (e) {
      console.warn('Error actualizando paseoActivo:', e)
    }
    await ServicioPaseo.registrarEvento(paseoId, 'INICIAR_RUTA', {
      estado_anterior: 'CONFIRMADO',
      estado_nuevo: 'EN_CAMINO',
    })
  }
  return res
}

export async function iniciarPaseo(paseoId: string) {
  const current = ServicioAuth.obtenerUsuarioActual()
  const uid = current?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  const paseoRes = await ServicioPaseo.obtenerPorId(paseoId)
  if (!paseoRes.success || !paseoRes.data)
    return { success: false, error: ERR.COMUN.DOCUMENTO_NO_ENCONTRADO }

  const paseo = paseoRes.data as Paseo
  const maquina = crearMaquinaPaseo(paseo)
  if (!maquina.puede('INICIAR_PASEO'))
    return { success: false, error: 'TRANSICION_INVALIDA' }

  const { serverTimestamp } = await import('firebase/firestore')
  const res = await ServicioPaseo.commitEstadoTransaccional(
    paseoId,
    ESTADOS_PASEO.EN_CAMINO,
    ESTADOS_PASEO.EN_PROGRESO,
    { fecha_inicio_real: serverTimestamp() }
  )
  if (res.success) {
    try {
      paseoActivo.iniciarPaseo(new Date())
    } catch (e) {
      console.warn('Error actualizando paseoActivo:', e)
    }
    await ServicioPaseo.registrarEvento(paseoId, 'INICIAR_PASEO', {
      estado_anterior: 'EN_CAMINO',
      estado_nuevo: 'EN_PROGRESO',
    })
  }
  return res
}

export async function finalizarPaseo(paseoId: string) {
  const current = ServicioAuth.obtenerUsuarioActual()
  const uid = current?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  const paseoRes = await ServicioPaseo.obtenerPorId(paseoId)
  if (!paseoRes.success || !paseoRes.data)
    return { success: false, error: ERR.COMUN.DOCUMENTO_NO_ENCONTRADO }

  const paseo = paseoRes.data as Paseo
  const maquina = crearMaquinaPaseo(paseo)
  if (!maquina.puede('FINALIZAR_PASEO'))
    return { success: false, error: 'TRANSICION_INVALIDA' }

  const { serverTimestamp } = await import('firebase/firestore')
  const res = await ServicioPaseo.commitEstadoTransaccional(
    paseoId,
    ESTADOS_PASEO.EN_PROGRESO,
    ESTADOS_PASEO.FINALIZADO,
    { fecha_fin_real: serverTimestamp() }
  )
  if (res.success) {
    try {
      paseoActivo.finalizarPaseo(new Date())
    } catch (e) {
      console.warn('Error actualizando paseoActivo:', e)
    }
    await ServicioPaseo.registrarEvento(paseoId, 'FINALIZAR_PASEO', {
      estado_anterior: 'EN_PROGRESO',
      estado_nuevo: 'FINALIZADO',
    })
  }
  return res
}

export async function agregarMascota(paseoId: string, mascotaId: string) {
  const current = ServicioAuth.obtenerUsuarioActual()
  const uid = current?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  if (!mascotaId)
    return { success: false, error: ERR.MASCOTAS.MASCOTA_REQUERIDA }

  const paseoRes = await ServicioPaseo.obtenerPorId(paseoId)
  if (!paseoRes.success || !paseoRes.data)
    return { success: false, error: ERR.PASEOS.PASEO_NO_ENCONTRADO }

  const paseo = paseoRes.data as Paseo

  // Validaciones de negocio en logic
  if (paseo.modalidad !== 'compartido')
    return { success: false, error: ERR.PASEOS.PASEO_NO_ES_COMPARTIDO }
  if (!(
    paseo.estado === ESTADOS_PASEO.PENDIENTE ||
    paseo.estado === ESTADOS_PASEO.CONFIRMADO
  ))
    return {
      success: false,
      error: ERR.PASEOS.ESTADO_DEL_PASEO_NO_ACEPTA_MASCOTAS,
    }

  const maxGlobal = MAX_MASCOTAS_POR_PASEO
  const maxPaseo =
    typeof paseo.cupo_maximo_mascotas === 'number'
      ? paseo.cupo_maximo_mascotas
      : maxGlobal
  const max = Math.min(maxGlobal, maxPaseo)
  const count =
    typeof paseo.mascotas_count === 'number' ? paseo.mascotas_count : 0
  if (count >= max)
    return { success: false, error: ERR.PASEOS.LIMITE_DE_MASCOTAS_SUPERADO }

  // Verificar mascota y propietario
  const m = await ServicioCrudBase.obtenerPorId<Mascota>('mascotas', mascotaId)
  if (!m.success || !m.data)
    return { success: false, error: ERR.MASCOTAS.MASCOTA_NO_ENCONTRADA }
  if ((m.data as any).creado_por !== uid)
    return {
      success: false,
      error: ERR.MASCOTAS.MASCOTA_NO_PERTENECE_AL_USUARIO,
    }

  // Preparar data denormalizada
  const dataMascota = prepararDataPaseoMascota(paseoId, m.data, undefined)

  // Si este tutor (uid) no tiene código en este paseo, generar uno
  const codigosTutoresActuales = paseo.codigos_recogida_por_tutor || {}
  const actualizacionesCodigos: any = {}
  const actualizacionesValidacion: any = {}
  const actualizacionesIntentos: any = {}

  if (!codigosTutoresActuales[uid]) {
    const nuevosCodigos = generarCodigosRecogidaPorTutor([uid])
    actualizacionesCodigos['codigos_recogida_por_tutor'] = {
      ...codigosTutoresActuales,
      ...nuevosCodigos,
    }
    actualizacionesValidacion['codigo_recogida_validado_por_tutor'] = {
      ...(paseo.codigo_recogida_validado_por_tutor || {}),
      [uid]: false,
    }
    actualizacionesIntentos['intentos_fallidos_recogida_por_tutor'] = {
      ...(paseo.intentos_fallidos_recogida_por_tutor || {}),
      [uid]: 0,
    }
  }

  // Llamar al servicio para la actualización atómica y transaccional
  const res = await ServicioPaseoMascota.commitMascotaTransaccional(
    paseoId,
    mascotaId,
    dataMascota,
    {
      ...actualizacionesCodigos,
      ...actualizacionesValidacion,
      ...actualizacionesIntentos,
    }
  )
  if (res.success) {
    await ServicioPaseo.registrarEvento(paseoId, 'AGREGAR_MASCOTA', {
      id_mascota: mascotaId,
      tutor_uid: uid,
      nuevo_codigo_generado: !codigosTutoresActuales[uid],
    })
  }
  return res
}

// ---------- Consultas de dominio ----------

export async function obtenerEstadisticasCuidador(cuidadorId: string) {
  // 1. Solicitudes pendientes globales (sin cuidador)
  const solicitudesRes = await ServicioPaseo.buscarPaseos([
    { campo: 'estado', op: '==', valor: ESTADOS_PASEO.PENDIENTE },
  ])

  // 2. Paseos vinculados al cuidador
  const misPaseosRes = await ServicioPaseo.buscarPaseos([
    { campo: 'id_cuidador', op: '==', valor: cuidadorId },
    {
      campo: 'estado',
      op: 'in',
      valor: [
        ESTADOS_PASEO.CONFIRMADO,
        ESTADOS_PASEO.EN_CAMINO,
        ESTADOS_PASEO.EN_PROGRESO,
        ESTADOS_PASEO.FINALIZADO,
        ESTADOS_PASEO.COMPLETADO,
      ],
    },
  ])

  if (!solicitudesRes.success || !misPaseosRes.success) {
    return {
      success: false,
      error: solicitudesRes.error || misPaseosRes.error,
    }
  }

  const solicitudes = (solicitudesRes.data || []).filter(p => !p.id_cuidador)
  const misPaseos = misPaseosRes.data || []

  const activos = misPaseos.filter(p =>
    [
      ESTADOS_PASEO.CONFIRMADO,
      ESTADOS_PASEO.EN_CAMINO,
      ESTADOS_PASEO.EN_PROGRESO,
    ].includes(p.estado)
  )

  const completados = misPaseos.filter(p =>
    [ESTADOS_PASEO.FINALIZADO, ESTADOS_PASEO.COMPLETADO].includes(p.estado)
  )

  return {
    success: true,
    data: {
      solicitudesPendientes: solicitudes.length,
      paseosActivos: activos.length,
      paseosCompletados: completados.length,
      valoracionPromedio: 0, // TODO: Integrar con logic/valoraciones
    },
  }
}

export async function completarPaseo(paseoId: string) {
  const res = await ServicioPaseo.actualizar(paseoId, {
    estado: ESTADOS_PASEO.COMPLETADO,
  })

  if (res.success) {
    await ServicioPaseo.registrarEvento(paseoId, 'COMPLETAR', {
      estado_anterior: ESTADOS_PASEO.FINALIZADO,
      estado_nuevo: ESTADOS_PASEO.COMPLETADO,
    })
  }

  return res
}

/**
 * Rechaza una solicitud de paseo (solo para solicitudes directas).
 */
export async function rechazarPaseo(
  paseoId: string,
  motivo: string = 'RECHAZADO_POR_CUIDADOR'
) {
  return ServicioPaseo.registrarEvento(paseoId, 'RECHAZAR', {
    motivo,
  })
}

/**
 * FASE 4: Valida el código de recogida (6 dígitos) proporcionado por el cuidador.
 *
 * Operación que:
 * 1. Valida formato del código
 * 2. Ejecuta validación transaccional en Firestore a nivel de PASEO/TUTOR (no mascota individual)
 * 3. Registra evento de validación (exitosa o fallida)
 * 4. Retorna resultado para UI (validado, intentos restantes, etc.)
 *
 * @param paseoId ID del paseo
 * @param tutorId ID del tutor dueño de las mascotas (recogida de sus mascotas)
 * @param codigoIngresado Código de 6 dígitos proporcionado por el cuidador
 * @returns { success, validado, intentosFallidos } o { success: false, error }
 */
export async function validarCodigoRecogida(
  paseoId: string,
  tutorId: string,
  codigoIngresado: string
) {
  const current = ServicioAuth.obtenerUsuarioActual()
  const uid = current?.uid
  if (!uid) return { success: false, error: ERR.COMUN.NO_AUTENTICADO }

  // Delegar a ServicioPaseo la lógica transaccional de validación de códigos
  const res = await ServicioPaseo.validarCodigoRecogidaPorTutor(
    paseoId,
    tutorId,
    codigoIngresado
  )

  if (!res.success) {
    // Registrar evento de fallo
    const errorMsg = 'error' in res ? res.error : 'Error desconocido'
    const esBloqueo = errorMsg === ERR.PASEOS.CODIGO_RECOGIDA_BLOQUEADO
    const esFormatoInvalido =
      errorMsg === ERR.PASEOS.CODIGO_RECOGIDA_FORMATO_INVALIDO

    await ServicioPaseo.registrarEvento(
      paseoId,
      'VALIDAR_CODIGO_RECOGIDA_FALLO',
      {
        tutor_id: tutorId,
        error: errorMsg,
        bloqueado: esBloqueo,
        formato_invalido: esFormatoInvalido,
      }
    ).catch(e =>
      console.warn('Error registrando evento VALIDAR_CODIGO_RECOGIDA_FALLO:', e)
    )

    return res
  }

  // Éxito: registrar evento positivo
  await ServicioPaseo.registrarEvento(paseoId, 'VALIDAR_CODIGO_RECOGIDA', {
    tutor_id: tutorId,
    validado: res.validado,
    timestamp: new Date(),
  }).catch(e =>
    console.warn('Error registrando evento VALIDAR_CODIGO_RECOGIDA:', e)
  )

  return res
}

/**
 * Obtiene la query para los paseos de un tutor.
 */
export function obtenerQueryPaseosTutor(uid: string): Query {
  return query(
    collection(db, 'paseos'),
    where('creado_por', '==', uid),
    orderBy('fecha_hora_inicio', 'desc'),
    limit(30)
  )
}

/**
 * Obtiene la query para las solicitudes pendientes (mercado abierto).
 */
export function obtenerQuerySolicitudesPendientes(): Query {
  return ServicioPaseo.getQuerySolicitudesPendientes()
}

/**
 * Obtiene la query para los paseos próximos de un cuidador.
 */
export function obtenerQueryAgendaCuidador(uid: string): Query {
  return query(
    collection(db, 'paseos'),
    where('id_cuidador', '==', uid),
    where('estado', 'in', [
      ESTADOS_PASEO.CONFIRMADO,
      ESTADOS_PASEO.EN_CAMINO,
      ESTADOS_PASEO.EN_PUNTO_RECOGIDA,
      ESTADOS_PASEO.EN_PROGRESO,
    ]),
    orderBy('fecha_hora_inicio', 'asc')
  )
}

/**
 * Obtiene la query para el historial de paseos de un cuidador.
 */
export function obtenerQueryHistorialCuidador(uid: string): Query {
  return query(
    collection(db, 'paseos'),
    where('id_cuidador', '==', uid),
    where('estado', 'in', [
      ESTADOS_PASEO.COMPLETADO,
      ESTADOS_PASEO.FINALIZADO,
      ESTADOS_PASEO.CANCELADO,
    ]),
    orderBy('fecha_hora_inicio', 'desc'),
    limit(30)
  )
}

/**
 * Obtiene la query para monitorear el paseo activo global de un usuario.
 */
export function obtenerQueryMonitorPaseoGlobal(uid: string): Query {
  return query(
    collection(db, 'paseos'),
    where('creado_por', '==', uid),
    where('estado', 'in', [
      ESTADOS_PASEO.CONFIRMADO,
      ESTADOS_PASEO.EN_CAMINO,
      ESTADOS_PASEO.EN_PROGRESO,
      ESTADOS_PASEO.FINALIZADO,
    ]),
    orderBy('creado_en', 'desc'),
    limit(1)
  )
}

export const GestorPaseos = {
  paseoActivo,
  CODIGOS_ERROR_PASEO,
  MENSAJES_ERROR_FALLBACK,
  obtenerClaveI18nError,
  crearConMascotas,
  aceptarSolicitud,
  iniciarRuta,
  iniciarPaseo,
  finalizarPaseo,
  agregarMascota,
  obtenerEstadisticasCuidador,
  completarPaseo,
  rechazarPaseo,
  validarCodigoRecogida,
  obtenerQueryPaseosTutor,
  obtenerQuerySolicitudesPendientes,
  obtenerQueryAgendaCuidador,
  obtenerQueryHistorialCuidador,
  obtenerQueryMonitorPaseoGlobal,
}
