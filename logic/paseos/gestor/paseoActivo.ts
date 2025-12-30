import { crearMaquinaPaseo } from '../maquinaEstados'
import type { Paseo } from '@/models/Paseo'
import type {
  PaseoActivo as PaseoActivoType,
  ResultadoAccion,
} from './paseoActivo.types'
import { useEffect, useState } from 'react'
import { ServicioPaseo } from '@/services/firebase'
import type { CrudResult } from '@/services/firebase/comun/types'

type Listener = (_p: PaseoActivoType | null) => void

class PaseoActivoGestor {
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
      },
      esActivo: ['PENDIENTE', 'CONFIRMADO', 'EN_RUTA', 'EN_PROGRESO'].includes(
        paseo.estado as any
      ),
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

  private aplicarTransicion(evento: string, payload?: any): ResultadoAccion {
    if (!this._paseo || !this._paseo.original)
      return { ok: false, error: 'No hay paseo activo' }

    const maquina = crearMaquinaPaseo(this._paseo.original)

    try {
      if (!maquina.puede(evento as any)) {
        return {
          ok: false,
          error: `Transición no permitida desde ${maquina.estado} con evento ${evento}`,
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
        case 'ACEPTAR':
          ts.confirmado = ahora
          break
        case 'INICIAR_PASEO':
          ts.iniciado = payload?.fecha_inicio_real || ahora
          break
        case 'FINALIZAR_PASEO':
          ts.finalizado = payload?.fecha_fin_real || ahora
          break
        case 'CANCELAR':
          ts.cancelado = ahora
          break
      }

      nuevoPaseo.timestamps = ts
      nuevoPaseo.esActivo = ![
        'FINALIZADO',
        'COMPLETADO',
        'CANCELADO',
        'ERROR',
      ].includes(nuevoEstado as any)

      this._paseo = nuevoPaseo
      this.notificar()
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) }
    }
  }

  aceptarPaseo(): ResultadoAccion {
    return this.aplicarTransicion('ACEPTAR')
  }

  iniciarRuta(): ResultadoAccion {
    return this.aplicarTransicion('INICIAR_RUTA')
  }

  iniciarPaseo(fecha_inicio_real?: Date): ResultadoAccion {
    return this.aplicarTransicion('INICIAR_PASEO', { fecha_inicio_real })
  }

  finalizarPaseo(fecha_fin_real?: Date): ResultadoAccion {
    return this.aplicarTransicion('FINALIZAR_PASEO', { fecha_fin_real })
  }

  cancelarPaseo(motivo?: string): ResultadoAccion {
    return this.aplicarTransicion('CANCELAR', { motivo })
  }

  // Métodos asíncronos que llaman al servicio y aplican la transición local si la operación en backend tuvo éxito.
  async aceptarPaseoAsync(): Promise<CrudResult<void>> {
    if (!this._paseo) return { success: false, error: 'No hay paseo activo' }
    const res = await ServicioPaseo.aceptarSolicitud(this._paseo.id)
    if (res.success) {
      try {
        this.aplicarTransicion('ACEPTAR')
      } catch (_err) {
        console.warn(
          'paseoActivo: error aplicando transición local ACEPTAR',
          _err
        )
      }
    }
    return res
  }

  async iniciarRutaAsync(): Promise<CrudResult<void>> {
    if (!this._paseo) return { success: false, error: 'No hay paseo activo' }
    const res = await ServicioPaseo.iniciarRuta(this._paseo.id)
    if (res.success) {
      try {
        this.aplicarTransicion('INICIAR_RUTA')
      } catch (_err) {
        console.warn(
          'paseoActivo: error aplicando transición local INICIAR_RUTA',
          _err
        )
      }
    }
    return res
  }

  async iniciarPaseoAsync(): Promise<CrudResult<void>> {
    if (!this._paseo) return { success: false, error: 'No hay paseo activo' }
    const res = await ServicioPaseo.iniciarPaseo(this._paseo.id)
    if (res.success) {
      try {
        this.aplicarTransicion('INICIAR_PASEO', {
          fecha_inicio_real: new Date(),
        })
      } catch (_err) {
        console.warn(
          'paseoActivo: error aplicando transición local INICIAR_PASEO',
          _err
        )
      }
    }
    return res
  }

  async finalizarPaseoAsync(): Promise<CrudResult<void>> {
    if (!this._paseo) return { success: false, error: 'No hay paseo activo' }
    const res = await ServicioPaseo.finalizarPaseo(this._paseo.id)
    if (res.success) {
      try {
        this.aplicarTransicion('FINALIZAR_PASEO', {
          fecha_fin_real: new Date(),
        })
      } catch (_err) {
        console.warn(
          'paseoActivo: error aplicando transición local FINALIZAR_PASEO',
          _err
        )
      }
    }
    return res
  }

  async cancelarPaseoAsync(motivo?: string): Promise<CrudResult<any>> {
    if (!this._paseo) return { success: false, error: 'No hay paseo activo' }
    const res = await ServicioPaseo.actualizar(this._paseo.id, {
      estado: 'CANCELADO',
    } as any)
    if (res.success) {
      try {
        this.aplicarTransicion('CANCELAR', { motivo })
      } catch (_err) {
        console.warn(
          'paseoActivo: error aplicando transición local CANCELAR',
          _err
        )
      }
    }
    return res
  }
}

export const paseoActivo = new PaseoActivoGestor()

export function usePaseoActivo() {
  const [state, setState] = useState<PaseoActivoType | null>(
    paseoActivo.getPaseoActivo()
  )

  useEffect(() => {
    const unsub = paseoActivo.suscribir(setState)
    return unsub
  }, [])

  return {
    paseoActivo: state,
    acciones: {
      setPaseoActivo: (p: Paseo) => paseoActivo.setPaseoActivo(p),
      aceptarPaseo: () => paseoActivo.aceptarPaseo(),
      iniciarRuta: () => paseoActivo.iniciarRuta(),
      iniciarPaseo: (d?: Date) => paseoActivo.iniciarPaseo(d),
      finalizarPaseo: (d?: Date) => paseoActivo.finalizarPaseo(d),
      cancelarPaseo: (m?: string) => paseoActivo.cancelarPaseo(m),
      limpiarPaseoActivo: () => paseoActivo.limpiarPaseoActivo(),
    },
  }
}
