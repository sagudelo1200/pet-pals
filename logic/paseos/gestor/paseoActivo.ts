import { crearMaquinaPaseo, EVENTOS } from '../maquinaEstados'
import { Paseo, ESTADOS_PASEO } from '@/models/Paseo'
import type {
  PaseoActivo as PaseoActivoType,
  ResultadoAccion,
} from './paseoActivo.types'
import { ServicioPaseo } from '@/services/firebase'
import type { CrudResult } from '@/services/firebase/comun/types'

type Listener = (_p: PaseoActivoType | null) => void

export class PaseoActivoGestor {
  private _paseo: PaseoActivoType | null = null
  private listeners = new Set<Listener>()

  getPaseoActivo(): PaseoActivoType | null {
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
    const nuevo: PaseoActivoType = {
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
        enCamino: undefined, // Se llenará si el estado lo indica o al transicionar
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

  /**
   * Verifica si una transición es posible desde el estado actual
   * @param evento Evento a validar
   * @returns true si la transición es válida, false en caso contrario
   */
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

      const nuevoPaseo: PaseoActivoType = {
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
      return { ok: true } // Corrigiendo cierre de bloque que parece cortado en el diff mental, pero replace_file_content con TargetContent lo manejará.
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

  // Métodos asíncronos robustos
  async aceptarPaseoAsync(): Promise<CrudResult<void>> {
    if (!this._paseo) return { success: false, error: 'NO_HAY_PASEO_ACTIVO' }
    
    // Validación optimista local
    if (!this.puede(EVENTOS.ACEPTAR)) {
      return { success: false, error: 'TRANSICION_INVALIDA' }
    }

    const res = await ServicioPaseo.aceptarSolicitud(this._paseo.id)
    
    if (res.success) {
      // Aplicar transición local para feedback inmediato
      const localRes = this.aplicarTransicion(EVENTOS.ACEPTAR)
      if (localRes.ok === false) {
        console.warn('paseoActivo: Inconsistencia tras aceptarPaseoAsync', localRes.error)
      }
    }
    return res
  }

  async iniciarRutaAsync(): Promise<CrudResult<void>> {
    if (!this._paseo) return { success: false, error: 'NO_HAY_PASEO_ACTIVO' }

    if (!this.puede(EVENTOS.INICIAR_RUTA)) {
      return { success: false, error: 'TRANSICION_INVALIDA' }
    }

    const res = await ServicioPaseo.iniciarRuta(this._paseo.id)
    
    if (res.success) {
      const localRes = this.aplicarTransicion(EVENTOS.INICIAR_RUTA)
      if (localRes.ok === false) {
         console.warn('paseoActivo: Inconsistencia tras iniciarRutaAsync', localRes.error)
      }
    }
    return res
  }

  async iniciarPaseoAsync(): Promise<CrudResult<void>> {
    if (!this._paseo) return { success: false, error: 'NO_HAY_PASEO_ACTIVO' }

    if (!this.puede(EVENTOS.INICIAR_PASEO)) {
      return { success: false, error: 'TRANSICION_INVALIDA' }
    }

    const res = await ServicioPaseo.iniciarPaseo(this._paseo.id)
    
    if (res.success) {
      const fecha = new Date() // Usamos hora local para feedback inmediato
      const localRes = this.aplicarTransicion(EVENTOS.INICIAR_PASEO, {
        fecha_inicio_real: fecha,
      })
      if (localRes.ok === false) {
        console.warn('paseoActivo: Inconsistencia tras iniciarPaseoAsync', localRes.error)
      }
    }
    return res
  }

  async finalizarPaseoAsync(): Promise<CrudResult<void>> {
    if (!this._paseo) return { success: false, error: 'NO_HAY_PASEO_ACTIVO' }

    if (!this.puede(EVENTOS.FINALIZAR_PASEO)) {
      return { success: false, error: 'TRANSICION_INVALIDA' }
    }

    const res = await ServicioPaseo.finalizarPaseo(this._paseo.id)
    
    if (res.success) {
      const fecha = new Date()
      const localRes = this.aplicarTransicion(EVENTOS.FINALIZAR_PASEO, {
        fecha_fin_real: fecha,
      })
       if (localRes.ok === false) {
        console.warn('paseoActivo: Inconsistencia tras finalizarPaseoAsync', localRes.error)
      }
    }
    return res
  }

  async cancelarPaseoAsync(motivo?: string): Promise<CrudResult<void>> {
    if (!this._paseo) return { success: false, error: 'NO_HAY_PASEO_ACTIVO' }
    if (!motivo) return { success: false, error: 'MOTIVO_REQUERIDO' }

    if (!this.puede(EVENTOS.CANCELAR)) {
      return { success: false, error: 'TRANSICION_INVALIDA' }
    }

    const res = await ServicioPaseo.actualizar(this._paseo.id, {
      estado: 'CANCELADO',
    } as any)

    if (res.success) {
      const localRes = this.aplicarTransicion(EVENTOS.CANCELAR, { motivo })
       if (localRes.ok === false) {
         console.warn('paseoActivo: Inconsistencia tras cancelarPaseoAsync', localRes.error)
      }
    }
    
    // Transformamos el resultado para coincidir con la firma void
    if (res.success) return { success: true }
    return { success: false, error: res.error }
  }

}

export const paseoActivo = new PaseoActivoGestor()

// Fin de métodos públicos
