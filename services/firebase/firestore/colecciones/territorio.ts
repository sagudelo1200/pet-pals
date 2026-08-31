/**
 * Servicio de territorios: Agregación de eventos por H3 R9
 *
 * Responsabilidades:
 * 1. Procesar eventos territoriales mediante orquestador centralizado
 * 2. Coordinar narrativa + operativa de zonas
 *
 * Filosofía:
 * - Delega lógica de eventos a H3TerritorialOrchestrator
 * - Mantiene calcularIndices para lectura de datos
 * - No interfiere con sección `operativa` (gestión de cuidadores)
 */

import { CrudResult, mapFirebaseError } from '@/services/firebase/comun'
import { db } from '@/firebase.config'
import type { EventoTerritorial } from '@/services/firebase/firestore/agregadores/territorial.aggregator'
import type { ZonaH3, Identidad, Índices } from '@/models/ZonaH3'
import { H3TerritorialOrchestrator } from '@/services/h3'

export class ServicioTerritorio {
  private static readonly COLLECTION = 'h3_zonas'

  /**
   * Calcula índices de inteligencia basados en distribución de eventos
   * y tipo de ubicación (identidad)
   */
  private static calcularIndices(
    eventos_por_tipo: Record<string, number>,
    tipo?: string
  ): Índices {
    const total =
      Object.values(eventos_por_tipo).reduce((a, b) => a + b, 0) || 1

    // Proporciones
    const juego_ratio = (eventos_por_tipo['juego'] || 0) / total
    const agua_ratio = (eventos_por_tipo['agua'] || 0) / total
    const descanso_ratio = (eventos_por_tipo['descanso'] || 0) / total
    const socializacion_ratio = (eventos_por_tipo['socializacion'] || 0) / total

    return {
      // Bienestar: alta actividad de juego, acceso a agua, descanso
      bienestar: Math.round(
        (juego_ratio * 40 + agua_ratio * 30 + descanso_ratio * 30) * 100
      ),

      // Seguridad: baja densidad de eventos (< 10 por semana), tipo conocido
      seguridad: Math.round(
        (tipo && ['parque', 'conjunto'].includes(tipo) ? 60 : 40) +
          (total < 10 ? 30 : total > 50 ? -10 : 10)
      ),

      // Actividad: frecuencia total de eventos + ratio de juego
      actividad: Math.round(
        Math.min(100, (total / 50) * 100 * 0.5 + juego_ratio * 50)
      ),

      // Socialización: eventos donde aparecen otros perros
      socializacion: Math.round(
        socializacion_ratio * 100 + (total > 15 ? 20 : 0)
      ),
    }
  }

  /**
   * Procesa evento territorial desde el agregador
   * Delega al orquestador centralizado con retry automático
   */
  static async procesarEvento(
    evento: EventoTerritorial
  ): Promise<CrudResult<void>> {
    try {
      const exito = await H3TerritorialOrchestrator.procesarEventoExploracion(
        evento.h3_r9,
        evento.accion
      )

      if (!exito) {
        console.warn(
          `[territorio] Fallo procesar evento ${evento.accion} en zona ${evento.h3_r9}`
        )
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }
}
