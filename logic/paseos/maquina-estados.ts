import { PaseoStatus, type Paseo } from '@/models/Paseo'

// ==========================================
// Tipos y Eventos
// ==========================================

export type PaseoEvent =
  | 'SOLICITAR'
  | 'ACEPTAR'
  | 'RECHAZAR'
  | 'INICIAR_RUTA'
  | 'LLEGAR'
  | 'INICIAR_PASEO'
  | 'FINALIZAR_PASEO'
  | 'CONFIRMAR_COMPLETADO'
  | 'CANCELAR'

// Payload opcional para transiciones
export interface TransitionPayload {
  motivo?: string // Para CANCELAR o RECHAZAR
  ubicacion?: string // Para LLEGAR
  id_cuidador?: string // Para ACEPTAR
  fecha_programada?: Date // Para PROGRAMAR
  fecha_inicio_real?: Date // Para INICIAR_PASEO
  fecha_fin_real?: Date // Para FINALIZAR_PASEO
}

// ==========================================
// Configuración de la Máquina
// ==========================================

type Transiciones = {
  [_key in PaseoStatus]?: {
    [_evt in PaseoEvent]?: PaseoStatus
  }
}

const CONFIG_MAQUINA: Transiciones = {
  [PaseoStatus.PENDIENTE]: {
    ACEPTAR: PaseoStatus.CONFIRMADO,
    CANCELAR: PaseoStatus.CANCELADO,
  },
  [PaseoStatus.CONFIRMADO]: {
    INICIAR_RUTA: PaseoStatus.EN_RUTA,
    INICIAR_PASEO: PaseoStatus.EN_PROGRESO,
    CANCELAR: PaseoStatus.CANCELADO,
  },
  [PaseoStatus.EN_RUTA]: {
    LLEGAR: PaseoStatus.EN_PROGRESO,
    INICIAR_PASEO: PaseoStatus.EN_PROGRESO,
    CANCELAR: PaseoStatus.CANCELADO,
  },
  [PaseoStatus.EN_PROGRESO]: {
    FINALIZAR_PASEO: PaseoStatus.FINALIZADO,
  },
  [PaseoStatus.FINALIZADO]: {
    CONFIRMAR_COMPLETADO: PaseoStatus.COMPLETADO,
  },
  [PaseoStatus.COMPLETADO]: {},
  [PaseoStatus.CANCELADO]: {},
  [PaseoStatus.ERROR]: {},
}

// ==========================================
// Clase Máquina de Estados
// ==========================================

export class MaquinaEstadosPaseo {
  private _estado: PaseoStatus
  private _contexto: Partial<Paseo>

  constructor(
    estadoInicial: PaseoStatus = PaseoStatus.PENDIENTE,
    contexto: Partial<Paseo> = {}
  ) {
    this._estado = estadoInicial
    this._contexto = contexto
  }

  get estado(): PaseoStatus {
    return this._estado
  }

  puede(evento: PaseoEvent): boolean {
    const permitidos = CONFIG_MAQUINA[this._estado]
    const NON_TRANSITION_EVENTS: PaseoEvent[] = ['RECHAZAR']
    const ALLOWED_NON_TRANSITION_FROM: PaseoStatus[] = [
      PaseoStatus.PENDIENTE,
      PaseoStatus.CONFIRMADO,
    ]

    if (permitidos && permitidos[evento]) return true

    if (
      NON_TRANSITION_EVENTS.includes(evento) &&
      ALLOWED_NON_TRANSITION_FROM.includes(this._estado)
    ) {
      return true
    }

    return false
  }

  transicion(evento: PaseoEvent, payload?: TransitionPayload): PaseoStatus {
    if (!this.puede(evento)) {
      throw new Error(`Transición inválida: ${this._estado} -> ${evento}`)
    }

    const NON_TRANSITION_EVENTS: PaseoEvent[] = ['RECHAZAR']
    if (NON_TRANSITION_EVENTS.includes(evento)) {
      this.registrarEvento(evento, payload)
      return this._estado
    }

    const nuevoEstado = CONFIG_MAQUINA[this._estado]![evento]!

    this.validarTransicion(this._estado, nuevoEstado, payload)

    this._estado = nuevoEstado
    return this._estado
  }

  private validarTransicion(
    desde: PaseoStatus,
    hacia: PaseoStatus,
    payload?: TransitionPayload
  ) {
    if (hacia === PaseoStatus.CANCELADO) {
      if (!payload?.motivo) {
        throw new Error('Se requiere un motivo para cancelar el paseo.')
      }
    }
  }

  private registrarEvento(evento: PaseoEvent, payload?: TransitionPayload) {
    const registro = {
      evento,
      payload,
      timestamp: new Date(),
    }

    const _key = 'historial_eventos' as keyof Partial<Paseo>
    const actual = (this._contexto as any)[_key] || []
    ;(this._contexto as any)[_key] = [...actual, registro]
  }
}

export function crearMaquinaPaseo(paseo?: Partial<Paseo>): MaquinaEstadosPaseo {
  return new MaquinaEstadosPaseo(
    paseo?.estado || PaseoStatus.PENDIENTE,
    paseo || {}
  )
}
