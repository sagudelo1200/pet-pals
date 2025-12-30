import { ESTADOS_PASEO, type Paseo } from '../../models/Paseo'

// ==========================================
// Tipos y Eventos
// ==========================================

export type EVENTOS_PASEO =
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
  // eslint-disable-next-line no-unused-vars
  [key in ESTADOS_PASEO]?: {
    // eslint-disable-next-line no-unused-vars
    [key in EVENTOS_PASEO]?: ESTADOS_PASEO
  }
}

const CONFIG_MAQUINA: Transiciones = {
  [ESTADOS_PASEO.PENDIENTE]: {
    ACEPTAR: ESTADOS_PASEO.CONFIRMADO,
    CANCELAR: ESTADOS_PASEO.CANCELADO,
  },
  [ESTADOS_PASEO.CONFIRMADO]: {
    INICIAR_RUTA: ESTADOS_PASEO.EN_CAMINO,
    INICIAR_PASEO: ESTADOS_PASEO.EN_PROGRESO, // Shortcut si ya está ahí
    CANCELAR: ESTADOS_PASEO.CANCELADO,
  },
  [ESTADOS_PASEO.EN_CAMINO]: {
    LLEGAR: ESTADOS_PASEO.EN_PROGRESO, // A veces llegar = iniciar
    INICIAR_PASEO: ESTADOS_PASEO.EN_PROGRESO,
    CANCELAR: ESTADOS_PASEO.CANCELADO,
  },
  [ESTADOS_PASEO.EN_PROGRESO]: {
    FINALIZAR_PASEO: ESTADOS_PASEO.FINALIZADO,
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

  /**
   * Verifica si es posible realizar una transición dado un evento.
   */
  puede(evento: EVENTOS_PASEO): boolean {
    const permitidos = CONFIG_MAQUINA[this._estado]
    const NON_TRANSITION_EVENTS: EVENTOS_PASEO[] = ['RECHAZAR']
    const ALLOWED_NON_TRANSITION_FROM: ESTADOS_PASEO[] = [
      ESTADOS_PASEO.PENDIENTE,
      ESTADOS_PASEO.CONFIRMADO,
    ]

    if (permitidos && permitidos[evento]) return true

    // Permitir eventos no-transicionales (p. ej. RECHAZAR) desde ciertos estados
    if (
      NON_TRANSITION_EVENTS.includes(evento) &&
      ALLOWED_NON_TRANSITION_FROM.includes(this._estado)
    ) {
      return true
    }

    return false
  }

  /**
   * Ejecuta una transición.
   * Retorna el nuevo estado si es exitoso, o lanza error si no es válida.
   */
  transicion(
    evento: EVENTOS_PASEO,
    payload?: TransitionPayload
  ): ESTADOS_PASEO {
    if (!this.puede(evento)) {
      throw new Error(`Transición inválida: ${this._estado} -> ${evento}`)
    }

    // Eventos que no causan cambio de estado (se registran)
    const NON_TRANSITION_EVENTS: EVENTOS_PASEO[] = ['RECHAZAR']
    if (NON_TRANSITION_EVENTS.includes(evento)) {
      this.registrarEvento(evento, payload)
      return this._estado
    }

    const nuevoEstado = CONFIG_MAQUINA[this._estado]![evento]!

    // Validaciones extra (Lógica de Negocio) antes de cambiar
    this.validarTransicion(this._estado, nuevoEstado, payload)

    this._estado = nuevoEstado
    return this._estado
  }

  /**
   * Validaciones de reglas de negocio específicas.
   */
  private validarTransicion(
    desde: ESTADOS_PASEO,
    hacia: ESTADOS_PASEO,
    payload?: TransitionPayload
  ) {
    // Ejemplo: CANCELAR requiere motivo
    if (hacia === ESTADOS_PASEO.CANCELADO) {
      if (!payload?.motivo) {
        throw new Error('Se requiere un motivo para cancelar el paseo.')
      }
    }

    // Ejemplo: ACEPTAR requiere id_cuidador (si no viene en context)
    // if (evento === 'ACEPTAR' && !payload?.id_cuidador && !this._contexto.id_cuidador) ...
  }

  /**
   * Registra eventos que no provocan cambio de estado (historial/auditoría).
   */
  private registrarEvento(evento: EVENTOS_PASEO, payload?: TransitionPayload) {
    const registro = {
      evento,
      payload,
      timestamp: new Date(),
    }

    // Mantener compatibilidad: almacenar en `_contexto.historial_eventos`
    const key = 'historial_eventos' as keyof Partial<Paseo>
    const actual = (this._contexto as any)[key] || []
    ;(this._contexto as any)[key] = [...actual, registro]
  }
}

/**
 * Factory function para crear la máquina fácilmente.
 */
export function crearMaquinaPaseo(paseo?: Partial<Paseo>): MaquinaEstadosPaseo {
  return new MaquinaEstadosPaseo(
    paseo?.estado || ESTADOS_PASEO.PENDIENTE,
    paseo || {}
  )
}
