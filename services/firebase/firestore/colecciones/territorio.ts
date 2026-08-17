/**
 * Servicio de territorios: Agregación de eventos por H3 R9
 *
 * Responsabilidades:
 * 1. Incrementar contadores de eventos en sección NARRATIVA
 * 2. Inferir identidad de ubicación (tipo + confianza) desde exploración
 * 3. Calcular índices de inteligencia (bienestar, seguridad, actividad, socialización)
 *
 * Filosofía:
 * - Escribe en sección `narrativa` de ZonaH3 unificada
 * - Identidad se infiere del primer evento/exploración
 * - Índices se calculan por lectura (no en almacenamiento)
 * - Procesar eventos, NO guardarlos
 * - No interfiere con sección `operativa` (gestión de cuidadores)
 */

import { CrudResult, mapFirebaseError } from '@/services/firebase/comun'
import { db } from '@/firebase.config'
import type { EventoTerritorial } from '@/services/firebase/firestore/agregadores/territorial.aggregator'
import type { ZonaH3, Identidad, Índices } from '@/models/ZonaH3'

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
   * Actualiza sección NARRATIVA en h3_zonas/{h3_r9}
   * El evento se procesa y descarta (no se persiste)
   */
  static async procesarEvento(
    evento: EventoTerritorial
  ): Promise<CrudResult<void>> {
    try {
      const { doc: docFn, getDoc, setDoc } = await import('firebase/firestore')
      const { camposSistemaCrear, camposSistemaActualizar } =
        await import('@/services/firebase/comun/camposSistema')
      const { ServicioAuth } = await import('@/services/firebase/auth/auth')

      const currentUser = ServicioAuth.obtenerUsuarioActual()
      if (!currentUser) return { success: false, error: 'No autenticado' }

      const zonaRef = docFn(db, this.COLLECTION, evento.h3_r9)
      const zonaSnap = await getDoc(zonaRef)

      let zonaData: Partial<ZonaH3>

      if (!zonaSnap.exists()) {
        // Nuevo documento: inicializar estructura unificada
        // NOTA: No almacenamos h3_r8 redundantemente
        // Se calcula siempre desde h3_r9 en lectura si es necesario
        // Esto garantiza que R8 y R9 siempre sean consistentes
        const identidad: Identidad = {
          tipo: evento.contextoTerritorial?.tipo_ubicacion || 'otro',
          confianza: evento.contextoTerritorial ? 75 : 30,
          fuente: 'paseo', // Siempre 'paseo' porque viene de un evento de paseo
        }

        const indices = ServicioTerritorio.calcularIndices(
          { [evento.accion]: 1 },
          identidad.tipo
        )

        // Derivamos h3_r8 desde h3_r9 (no lo almacenamos redundantemente)
        const { cellToParent } = await import('h3-js')
        const h3_r8 = cellToParent(evento.h3_r9, 8)

        zonaData = {
          id: evento.h3_r9,
          h3_r9: evento.h3_r9,
          h3_r8: h3_r8, // Calculado, NO redundante
          narrativa: {
            identidad,
            indices,
            total_eventos: 1,
            eventos_por_tipo: { [evento.accion]: 1 },
            ultima_actualizacion: Date.now(),
          },
          // Inicializar sección operativa vacía (será llenada por ServicioZonasH3)
          operativa: {
            cuidadores_count: 0,
            demanda_total: 0,
            paseos_activos: 0,
            paseos_total: 0,
            estado: 'sin_cobertura' as const,
            ratio_cobertura: 0,
          },
          ...camposSistemaCrear(currentUser.uid),
        }
      } else {
        // Documento existente: actualizar sección narrativa
        zonaData = zonaSnap.data() as ZonaH3

        if (!zonaData.narrativa) {
          zonaData.narrativa = {
            identidad: { tipo: 'otro', confianza: 30 },
            indices: {
              bienestar: 50,
              seguridad: 50,
              actividad: 50,
              socializacion: 50,
            },
            total_eventos: 0,
            eventos_por_tipo: {},
          }
        }

        zonaData.narrativa.total_eventos += 1

        if (!zonaData.narrativa.eventos_por_tipo[evento.accion]) {
          zonaData.narrativa.eventos_por_tipo[evento.accion] = 0
        }
        zonaData.narrativa.eventos_por_tipo[evento.accion] += 1

        // Actualizar identidad si hay nuevo contexto y confianza es baja
        if (
          evento.contextoTerritorial &&
          zonaData.narrativa.identidad.confianza < 70
        ) {
          zonaData.narrativa.identidad = {
            tipo:
              evento.contextoTerritorial.tipo_ubicacion ||
              zonaData.narrativa.identidad.tipo,
            confianza: Math.min(
              100,
              zonaData.narrativa.identidad.confianza + 5
            ),
            fuente: 'paseo', // Mantiene 'paseo' porque el enriquecimiento viene de APIs del paseo
          }
        }

        // Recalcular índices
        zonaData.narrativa.indices = ServicioTerritorio.calcularIndices(
          zonaData.narrativa.eventos_por_tipo,
          zonaData.narrativa.identidad.tipo
        )

        zonaData.narrativa.ultima_actualizacion = Date.now()
        Object.assign(zonaData, camposSistemaActualizar(currentUser.uid))
      }

      // Escribir documento unificado
      await setDoc(zonaRef, zonaData, { merge: true })

      return { success: true }
    } catch (error) {
      return { success: false, error: mapFirebaseError(error) }
    }
  }
}
