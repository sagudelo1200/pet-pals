/**
 * H3TerritorialRepository: API unificada para queries H3
 *
 * Consolidar TODAS las queries relacionadas con H3 en un único lugar.
 * Evita duplicación de lógica, garantiza consistencia.
 *
 * RESPONSABILIDADES:
 * - Queries en h3_zonas (narrativa + operativa)
 * - Queries en exploraciones por zona
 * - Queries en perfiles públicos (cuidadores) por zona
 * - Queries en paseos activos por zona
 *
 * GARANTÍAS:
 * - ✅ Manejo uniforme de errores
 * - ✅ Tipado seguro
 * - ✅ No duplica lógica de servicios subyacentes
 * - ✅ Interfaz consistente para todo territorio
 */

import type { ZonaH3 } from '@/models/ZonaH3'
import type { ExploracionTerritorial } from '@/models/ExploracionTerritorial'
import type { PerfilPublico } from '@/models/PerfilPublico'
import type { Paseo } from '@/models/Paseo'
import { ServicioZonasH3 } from '@/services/firebase/firestore/colecciones/h3_zonas'
import { ServicioPerfilPublico } from '@/services/firebase/firestore/colecciones/perfiles_publicos'
import { db } from '@/firebase.config'
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore'

export interface ResultadoQueriesZona {
  zona: ZonaH3 | null
  cuidadores: PerfilPublico[]
  exploraciones: ExploracionTerritorial[]
  paseosActivos: Paseo[]
  error?: string
}

/**
 * H3TerritorialRepository: Repository Pattern para territorio H3
 *
 * Acceso centralizado a datos territoriales.
 */
export class H3TerritorialRepository {
  private static readonly COLLECTION_ZONAS = 'h3_zonas'
  private static readonly COLLECTION_EXPLORACIONES = 'exploraciones'
  private static readonly COLLECTION_PASEOS = 'paseos'

  /**
   * Obtiene una zona completa (narrativa + operativa + estadísticas).
   *
   * @param h3_r9 - Celda H3 resolución 9
   * @returns Zona con todos los datos
   */
  static async obtenerZona(h3_r9: string): Promise<ZonaH3 | null> {
    try {
      return await ServicioZonasH3.obtenerZona(h3_r9)
    } catch (error) {
      console.error(
        `[H3TerritorialRepository] Error obteniendo zona ${h3_r9}:`,
        error
      )
      return null
    }
  }

  /**
   * Obtiene todas las zonas sin cobertura (estado='sin_cobertura').
   * Useful para admin dashboard, priorización.
   *
   * @returns Array de zonas sin cobertura
   */
  static async obtenerZonasSinCobertura(): Promise<ZonaH3[]> {
    try {
      const resultado = await ServicioZonasH3.obtenerZonasSinCobertura()
      return resultado.success ? resultado.data : []
    } catch (error) {
      console.error(
        '[H3TerritorialRepository] Error obteniendo zonas sin cobertura:',
        error
      )
      return []
    }
  }

  /**
   * Obtiene todas las zonas activas (estado='activa' o 'en_operacion').
   *
   * @returns Array de zonas activas
   */
  static async obtenerZonasActivas(): Promise<ZonaH3[]> {
    try {
      const resultado = await ServicioZonasH3.obtenerZonasActivas()
      return resultado.success ? resultado.data : []
    } catch (error) {
      console.error(
        '[H3TerritorialRepository] Error obteniendo zonas activas:',
        error
      )
      return []
    }
  }

  /**
   * Suscripción realtime a todas las zonas.
   * Usado por admin dashboard para monitoreo en vivo.
   *
   * @param callback - Función llamada cuando zonas cambian
   * @param onError - Manejador de errores
   * @returns Función para cancelar suscripción
   */
  static suscribirAZonas(
    callback: (_zonas: ZonaH3[]) => void,
    onError?: (_err: Error) => void
  ): () => void {
    // Forward a servicio subyacente (los _ en parámetros son para ESLint)
    return ServicioZonasH3.suscribirATodas(callback, onError)
  }

  /**
   * Obtiene cuidadores disponibles en una zona (h3_r8).
   *
   * @param h3_r8 - Celda H3 resolución 8
   * @returns Array de perfiles públicos de cuidadores
   */
  static async obtenerCuidadoresEnZona(
    h3_r8: string
  ): Promise<PerfilPublico[]> {
    try {
      // Buscar todos los cuidadores cuya zona (h3_r8) coincida
      const resultado = await ServicioPerfilPublico.buscarPerfiles([
        { campo: 'h3_r8', op: '==', valor: h3_r8 },
      ])
      return resultado.success ? resultado.data : []
    } catch (error) {
      console.error(
        `[H3TerritorialRepository] Error obteniendo cuidadores en zona ${h3_r8}:`,
        error
      )
      return []
    }
  }

  /**
   * Obtiene exploraciones en una zona específica.
   *
   * @param h3_r9 - Celda H3 resolución 9
   * @param estado - Filtrar por estado (opcional: 'pendiente', 'validada', 'rechazada')
   * @returns Array de exploraciones
   */
  static async obtenerExploracionesEnZona(
    h3_r9: string,
    estado?: 'pendiente' | 'validada' | 'rechazada'
  ): Promise<ExploracionTerritorial[]> {
    try {
      let q: any

      if (estado) {
        q = query(
          collection(db, this.COLLECTION_EXPLORACIONES),
          where('h3_r9', '==', h3_r9),
          where('estado', '==', estado)
        )
      } else {
        q = query(
          collection(db, this.COLLECTION_EXPLORACIONES),
          where('h3_r9', '==', h3_r9)
        )
      }

      const snaps = await getDocs(q)
      return snaps.docs.map(doc => doc.data() as ExploracionTerritorial)
    } catch (error) {
      console.error(
        `[H3TerritorialRepository] Error obteniendo exploraciones en ${h3_r9}:`,
        error
      )
      return []
    }
  }

  /**
   * Obtiene paseos activos en una zona.
   *
   * @param h3_r9 - Celda H3 resolución 9
   * @returns Array de paseos activos
   */
  static async obtenerPaseosActivosEnZona(h3_r9: string): Promise<Paseo[]> {
    try {
      // Paseos activos: estado EN_PROGRESO o EN_PUNTO_RECOGIDA
      const q = query(
        collection(db, this.COLLECTION_PASEOS),
        where('h3_r9', '==', h3_r9),
        where('estado', 'in', ['EN_PROGRESO', 'EN_PUNTO_RECOGIDA', 'EN_CAMINO'])
      )

      const snaps = await getDocs(q)
      return snaps.docs.map(doc => doc.data() as Paseo)
    } catch (error) {
      console.error(
        `[H3TerritorialRepository] Error obteniendo paseos activos en ${h3_r9}:`,
        error
      )
      return []
    }
  }

  /**
   * Obtiene contexto completo de una zona: zona + cuidadores + exploraciones + paseos.
   * OPERACIÓN CARA: usa 4 queries. Cachear si es posible.
   *
   * @param h3_r8 - Celda H3 resolución 8
   * @param h3_r9 - Celda H3 resolución 9
   * @returns Objeto con todos los datos territoriales
   */
  static async obtenerContextoCompletoZona(
    h3_r8: string,
    h3_r9: string
  ): Promise<ResultadoQueriesZona> {
    try {
      const [zona, cuidadores, exploraciones, paseosActivos] =
        await Promise.all([
          this.obtenerZona(h3_r9),
          this.obtenerCuidadoresEnZona(h3_r8),
          this.obtenerExploracionesEnZona(h3_r9),
          this.obtenerPaseosActivosEnZona(h3_r9),
        ])

      return {
        zona,
        cuidadores,
        exploraciones,
        paseosActivos,
      }
    } catch (error) {
      console.error(
        `[H3TerritorialRepository] Error obteniendo contexto completo (${h3_r8}, ${h3_r9}):`,
        error
      )
      return {
        zona: null,
        cuidadores: [],
        exploraciones: [],
        paseosActivos: [],
        error: String(error),
      }
    }
  }

  /**
   * Cuenta estadísticas rápidas de una zona.
   *
   * @param h3_r9 - Celda H3 resolución 9
   * @returns Objeto con estadísticas
   */
  static async obtenerEstadisticasZona(h3_r9: string): Promise<{
    cuidadores: number
    exploracionesPendientes: number
    paseosActivos: number
  }> {
    try {
      const zona = await this.obtenerZona(h3_r9)
      const exploracionesPendientes = await this.obtenerExploracionesEnZona(
        h3_r9,
        'pendiente'
      )
      const paseosActivos = await this.obtenerPaseosActivosEnZona(h3_r9)

      return {
        cuidadores: zona?.operativa?.cuidadores_count ?? 0,
        exploracionesPendientes: exploracionesPendientes.length,
        paseosActivos: paseosActivos.length,
      }
    } catch (error) {
      console.error(
        '[H3TerritorialRepository] Error obteniendo estad\u00edsticas:',
        error
      )
      return {
        cuidadores: 0,
        exploracionesPendientes: 0,
        paseosActivos: 0,
      }
    }
  }

  /**
   * Suscripción realtime a una zona específica.
   *
   * @param h3_r9 - Celda H3 resolución 9
   * @param callback - Función llamada cuando zona cambia
   * @returns Función para cancelar suscripción
   */
  static suscribirAZona(
    h3_r9: string,
    callback: (_zona: ZonaH3 | null) => void
  ): (() => void) | null {
    try {
      const ref = collection(db, this.COLLECTION_ZONAS)
      const q = query(ref, where('h3_r9', '==', h3_r9))

      return onSnapshot(q, snap => {
        const zona =
          snap.docs.length > 0 ? (snap.docs[0].data() as ZonaH3) : null
        callback(zona)
      })
    } catch (error) {
      console.error(
        `[H3TerritorialRepository] Error suscribiendo a zona ${h3_r9}:`,
        error
      )
      return null
    }
  }
}
