import { ESTADOS_PASEO, type Paseo } from '@/models/Paseo'

// ==========================================
// Tipos y Eventos
// ==========================================

export type EVENTOS_PASEO =
  | 'SOLICITAR'
  | 'ACEPTAR'
  | 'RECHAZAR'
  | 'INICIAR_RUTA'
  | 'LLEGAR_PUNTO_RECOGIDA'
  | 'LLEGAR'
  | 'INICIAR_PASEO'
  | 'FINALIZAR_PASEO'
  | 'CONFIRMAR_COMPLETADO'
  | 'CANCELAR'

export const EVENTOS = {
  SOLICITAR: 'SOLICITAR',
  ACEPTAR: 'ACEPTAR',
  RECHAZAR: 'RECHAZAR',
  INICIAR_RUTA: 'INICIAR_RUTA',
  LLEGAR_PUNTO_RECOGIDA: 'LLEGAR_PUNTO_RECOGIDA',
  LLEGAR: 'LLEGAR',
  INICIAR_PASEO: 'INICIAR_PASEO',
  FINALIZAR_PASEO: 'FINALIZAR_PASEO',
  CONFIRMAR_COMPLETADO: 'CONFIRMAR_COMPLETADO',
  CANCELAR: 'CANCELAR',
} as const

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
  [_key in ESTADOS_PASEO]?: {
    [_evt in EVENTOS_PASEO]?: ESTADOS_PASEO
  }
}

const CONFIG_MAQUINA: Transiciones = {
  [ESTADOS_PASEO.PENDIENTE]: {
    ACEPTAR: ESTADOS_PASEO.CONFIRMADO,
    CANCELAR: ESTADOS_PASEO.CANCELADO,
  },
  [ESTADOS_PASEO.CONFIRMADO]: {
    INICIAR_RUTA: ESTADOS_PASEO.EN_CAMINO,
    INICIAR_PASEO: ESTADOS_PASEO.EN_PROGRESO,
    CANCELAR: ESTADOS_PASEO.CANCELADO,
  },
  [ESTADOS_PASEO.EN_CAMINO]: {
    LLEGAR_PUNTO_RECOGIDA: ESTADOS_PASEO.EN_PUNTO_RECOGIDA,
    LLEGAR: ESTADOS_PASEO.EN_PROGRESO,
    INICIAR_PASEO: ESTADOS_PASEO.EN_PROGRESO,
    CANCELAR: ESTADOS_PASEO.CANCELADO,
  },
  [ESTADOS_PASEO.EN_PUNTO_RECOGIDA]: {
    INICIAR_PASEO: ESTADOS_PASEO.EN_PROGRESO,
    CANCELAR: ESTADOS_PASEO.CANCELADO,
  },
  [ESTADOS_PASEO.EN_PROGRESO]: {
    FINALIZAR_PASEO: ESTADOS_PASEO.FINALIZADO,
    CANCELAR: ESTADOS_PASEO.CANCELADO,
  },
  [ESTADOS_PASEO.FINALIZADO]: {
    CONFIRMAR_COMPLETADO: ESTADOS_PASEO.COMPLETADO,
  },
  [ESTADOS_PASEO.COMPLETADO]: {},
  [ESTADOS_PASEO.CANCELADO]: {},
  [ESTADOS_PASEO.ERROR]: {},
}

// ==========================================
// Clase Máquina de Estados
// ==========================================

export class MaquinaEstadosPaseo {
  private _estado: ESTADOS_PASEO
  private _contexto: Partial<Paseo>

  constructor(
    estadoInicial: ESTADOS_PASEO = ESTADOS_PASEO.PENDIENTE,
    contexto: Partial<Paseo> = {}
  ) {
    this._estado = estadoInicial
    this._contexto = contexto
  }

  get estado(): ESTADOS_PASEO {
    return this._estado
  }

  puede(evento: EVENTOS_PASEO): boolean {
    const permitidos = CONFIG_MAQUINA[this._estado]
    const NON_TRANSITION_EVENTS: EVENTOS_PASEO[] = ['RECHAZAR']
    const ALLOWED_NON_TRANSITION_FROM: ESTADOS_PASEO[] = [
      ESTADOS_PASEO.PENDIENTE,
      ESTADOS_PASEO.CONFIRMADO,
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

  transicion(
    evento: EVENTOS_PASEO,
    payload?: TransitionPayload
  ): ESTADOS_PASEO {
    if (!this.puede(evento)) {
      throw new Error(`Transición inválida: ${this._estado} -> ${evento}`)
    }

    const NON_TRANSITION_EVENTS: EVENTOS_PASEO[] = ['RECHAZAR']
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
    desde: ESTADOS_PASEO,
    hacia: ESTADOS_PASEO,
    payload?: TransitionPayload
  ) {
    if (hacia === ESTADOS_PASEO.CANCELADO) {
      if (!payload?.motivo) {
        throw new Error('Se requiere un motivo para cancelar el paseo.')
      }
    }
  }

  private registrarEvento(evento: EVENTOS_PASEO, payload?: TransitionPayload) {
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
    paseo?.estado || ESTADOS_PASEO.PENDIENTE,
    paseo || {}
  )
}
