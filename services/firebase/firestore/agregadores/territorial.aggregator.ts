/**
 * Agregador Territorial (Event-Driven)
 *
 * Desacopla el módulo de Paseos del módulo de Territorio.
 * Escucha eventos de paseos y actualiza la inteligencia territorial.
 *
 * Patrón: EventEmitter local (costo cero, desacoplamiento arquitectónico)
 * Puede migrar a Cloud Functions después sin cambiar paseo.ts
 */

import { ServicioTerritorio } from '@/services/firebase/firestore/colecciones/territorio'

export interface EventoTerritorial {
  accion: string
  h3_r9: string
  h3_r8: string
  duracion_seg: number
  contextoTerritorial: Record<string, any>
  paseoId: string
  cuidadorId: string
}

/**
 * EventEmitter minimalista para React Native
 * No depende del módulo 'events' de Node.js
 */
class SimpleEventEmitter {
  private listeners: Map<string, Array<(_data: any) => void>> = new Map()

  on(event: string, callback: (_data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)?.push(callback)
  }

  emit(event: string, data: any) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(cb => cb(data))
    }
  }

  removeAllListeners() {
    this.listeners.clear()
  }
}

export class TerritorialAggregator {
  private static emitter = new SimpleEventEmitter()
  private static initialized = false

  /**
   * Publica un evento territorial (llamado desde paseo.ts)
   * No aguarda respuesta: el agregador procesa asincronamente
   */
  static publishEvento(datos: EventoTerritorial) {
    this.emitter.emit('evento_registrado', datos)
  }

  /**
   * Inicializa el agregador (llamar en App.tsx)
   * Configura listeners para procesar eventos
   */
  static initialize() {
    if (this.initialized) return

    this.emitter.on('evento_registrado', async (datos: EventoTerritorial) => {
      try {
        await ServicioTerritorio.procesarEvento(datos)
      } catch (error) {
        console.error('[TerritorialAggregator] Error procesando evento:', error)
      }
    })

    this.initialized = true
    console.log('[TerritorialAggregator] Inicializado')
  }

  /**
   * Reset para testing
   */
  static reset() {
    this.emitter.removeAllListeners()
    this.initialized = false
  }
}
