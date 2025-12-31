import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { ServicioAuth } from '@/services/firebase/auth/auth'
import { ServicioPaseo } from '@/services/firebase'
import { ESTADOS_PASEO, type Paseo } from '@/models/Paseo'
import type { Mascota } from '@/models/Mascota'
import { addMascotasAlPaseo } from '@/services/firebase/firestore/colecciones/paseo-mascota'
import { MAX_MASCOTAS_POR_PASEO, ERR } from '@/constants'
import type { Ubicacion } from '@/models/Ubicacion'
import { crearMaquinaPaseo, EVENTOS } from './maquinaEstados'

// ---------- Types del gestor de paseo activo ----------
export type CodigoErrorPaseo =
  | 'NO_HAY_PASEO_ACTIVO'
  | 'TRANSICION_INVALIDA'
  | 'ESTADO_INCORRECTO'
  | 'SIN_PERMISOS'
  | 'ERROR_RED'
  | 'ERROR_VALIDACION'
  | 'MOTIVO_REQUERIDO'

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
  | { ok: true }
  | { ok: false; error: CodigoErrorPaseo; detalles?: string }

// ---------- Errores / i18n map ----------
export const CODIGOS_ERROR_PASEO: Record<CodigoErrorPaseo, string> = {
  NO_HAY_PASEO_ACTIVO: 'paseos:errores.NO_HAY_PASEO_ACTIVO',
  TRANSICION_INVALIDA: 'paseos:errores.transicion_invalida',
  ESTADO_INCORRECTO: 'paseos:errores.estado_incorrecto',
  SIN_PERMISOS: 'paseos:errores.sin_permisos',
  ERROR_RED: 'paseos:errores.error_red',
  ERROR_VALIDACION: 'paseos:errores.error_validacion',
  MOTIVO_REQUERIDO: 'paseos:errores.motivo_requerido',
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

    const res = await ServicioPaseo.aceptarSolicitud(this._paseo.id)

    if (res.success) {
      if (this.puede(EVENTOS.ACEPTAR)) {
        const localRes = this.aplicarTransicion(EVENTOS.ACEPTAR)
        if (localRes.ok === false) {
          console.warn(
            'paseoActivo: Inconsistencia tras aceptarPaseoAsync',
            localRes.error
          )
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

    const res = await ServicioPaseo.iniciarRuta(this._paseo.id)

    if (res.success) {
      if (this.puede(EVENTOS.INICIAR_RUTA)) {
        const localRes = this.aplicarTransicion(EVENTOS.INICIAR_RUTA)
        if (localRes.ok === false) {
          console.warn(
            'paseoActivo: Inconsistencia tras iniciarRutaAsync',
            localRes.error
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

    const res = await ServicioPaseo.iniciarPaseo(this._paseo.id)

    if (res.success) {
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
      }
    }
    return res
  }

  async finalizarPaseoAsync(): Promise<any> {
    if (!this._paseo) return { success: false, error: 'NO_HAY_PASEO_ACTIVO' }

    if (!this.puede(EVENTOS.FINALIZAR_PASEO)) {
      return { success: false, error: 'TRANSICION_INVALIDA' }
    }

    const res = await ServicioPaseo.finalizarPaseo(this._paseo.id)

    if (res.success) {
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
      if (this.puede(EVENTOS.CANCELAR)) {
        const localRes = this.aplicarTransicion(EVENTOS.CANCELAR, { motivo })
        if (localRes.ok === false) {
          console.warn(
            'paseoActivo: Inconsistencia tras cancelarPaseoAsync',
            localRes.error
          )
        }
      }
    }

    if (res.success) return { success: true }
    return { success: false, error: res.error }
  }
}

export const paseoActivo = new GestorPaseoActivo()

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

  let locationData: any = {}
  const locObj = (data.ubicacion_inicio as any) || direccion

  if (locObj && typeof locObj === 'object') {
    const snap = {
      direccion_formateada: locObj.direccion_formateada || '',
      coordenadas: {
        latitude: Number(locObj.coordenadas.latitude),
        longitude: Number(locObj.coordenadas.longitude),
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
      if (d.foto_url || d.foto) fotos.push(d.foto_url || d.foto)
    }

    visualData = {
      mascota_nombre_visual: primerNombre,
      mascota_foto_visual: fotos[0],
      mascotas_fotos_visual: fotos,
    }
  }

  const paseoRes = await ServicioCrudBase.crear<Paseo>('paseos', {
    ...(data as any),
    ...locationData,
    creado_por: uid,
    cupo_maximo_mascotas: max,
    mascotas_count: unique.length,
    mascota_ids: unique,
    ...visualData,
  } as any)

  if (!paseoRes.success || !paseoRes.data) return paseoRes as any

  if (unique.length > 0) {
    const addRes = await addMascotasAlPaseo(paseoRes.data.id, unique, direccion)
    if (!addRes.success) return { success: false, error: (addRes as any).error }
  }

  return paseoRes as any
}

// ---------- Orquestadores de estado (migrados desde services) ----------
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
    return { success: false, error: 'PASEO_TOMADO_POR_OTRO' }

  const cuidador_nombre_visual = current.displayName || 'Cuidador'
  const cuidador_foto_visual = current.photoURL || null

  const res = await ServicioPaseo.aceptarSolicitud(paseoId)

  if (res.success) {
    try {
      paseoActivo.aceptarPaseo()
    } catch (_) {}
    // registrar evento técnico
    await ServicioPaseo.registrarEvento(paseoId, 'ACEPTAR', {
      estado_anterior: 'PENDIENTE',
      estado_nuevo: 'CONFIRMADO',
      id_cuidador: uid,
      cuidador_nombre_visual,
      cuidador_foto_visual,
    })
  }
  return res
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

  const res = await ServicioPaseo.iniciarRuta(paseoId)
  if (res.success) {
    try {
      paseoActivo.iniciarRuta()
    } catch (_) {}
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

  const res = await ServicioPaseo.iniciarPaseo(paseoId)
  if (res.success) {
    try {
      paseoActivo.iniciarPaseo(new Date())
    } catch (_) {}
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

  const res = await ServicioPaseo.finalizarPaseo(paseoId)
  if (res.success) {
    try {
      paseoActivo.finalizarPaseo(new Date())
    } catch (_) {}
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
  if (
    !(
      paseo.estado === ESTADOS_PASEO.PENDIENTE ||
      paseo.estado === ESTADOS_PASEO.CONFIRMADO
    )
  )
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

  // Llamar al servicio para la actualización atómica (el servicio solo hace el write y evita duplicados)
  const res = await addMascotasAlPaseo(paseoId, [mascotaId], undefined)
  if (res.success) {
    await ServicioPaseo.registrarEvento(paseoId, 'AGREGAR_MASCOTA', {
      id_mascota: mascotaId,
    })
  }
  return res
}
