import { ServicioAuth, ServicioPaseo } from '@/services/firebase'
import { ESTADOS_PASEO, type Paseo } from '@/models/Paseo'
import { ERR } from '@/constants'
import { crearMaquinaPaseo, EVENTOS } from './maquinaEstados'
import { coordsAH3 } from '@/services/geo'
import { H3TerritorialOrchestrator } from '@/services/h3'
import type { CodigoErrorPaseo } from './errores'

// ---------- Types del gestor de paseo activo ----------

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
      // Marcar zona como en operación activa (con retry automático)
      const celdaR8 = extraerCeldaH3DePaseo(this._paseo.original)
      if (celdaR8) {
        const celdaR9 = coordsAH3(
          (this._paseo.original as any)?.ubicacion_inicio?.lat || 0,
          (this._paseo.original as any)?.ubicacion_inicio?.lng || 0,
          9
        )

        if (celdaR9) {
          const exito = await H3TerritorialOrchestrator.procesarEventoPaseo(
            celdaR9,
            'EN_PROGRESO',
            {
              paseo_uid: this._paseo.id,
              cuidador_uid: (this._paseo.original as any)?.id_cuidador,
              tutor_uid: (this._paseo.original as any)?.tutor_uid,
            }
          )

          if (!exito) {
            console.warn('[h3] Fallo registrar inicio paseo:', this._paseo.id)
          }
        }
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
      // Paseo terminado: actualizar zona (con retry automático)
      const celdaR8 = extraerCeldaH3DePaseo(this._paseo.original)
      if (celdaR8) {
        const celdaR9 = coordsAH3(
          (this._paseo.original as any)?.ubicacion_inicio?.lat || 0,
          (this._paseo.original as any)?.ubicacion_inicio?.lng || 0,
          9
        )

        if (celdaR9) {
          const exito = await H3TerritorialOrchestrator.procesarEventoPaseo(
            celdaR9,
            'COMPLETADO',
            {
              paseo_uid: this._paseo.id,
              cuidador_uid: (this._paseo.original as any)?.id_cuidador,
              tutor_uid: (this._paseo.original as any)?.tutor_uid,
            }
          )

          if (!exito) {
            console.warn('[h3] Fallo registrar fin paseo:', this._paseo.id)
          }
        }
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
      // Paseo cancelado: revertir demanda (con retry automático)
      const celdaR8 = extraerCeldaH3DePaseo(this._paseo.original)
      if (celdaR8) {
        const celdaR9 = coordsAH3(
          (this._paseo.original as any)?.ubicacion_inicio?.lat || 0,
          (this._paseo.original as any)?.ubicacion_inicio?.lng || 0,
          9
        )

        if (celdaR9) {
          const exito = await H3TerritorialOrchestrator.procesarEventoPaseo(
            celdaR9,
            'CANCELADO',
            {
              paseo_uid: this._paseo.id,
              cuidador_uid: (this._paseo.original as any)?.id_cuidador,
              tutor_uid: (this._paseo.original as any)?.tutor_uid,
            }
          )

          if (!exito) {
            console.warn(
              '[h3] Fallo registrar cancelación paseo:',
              this._paseo.id
            )
          }
        }
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
