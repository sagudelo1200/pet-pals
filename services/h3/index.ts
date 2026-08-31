/**
 * H3 Unified API
 *
 * Centralización completa de todas operaciones H3.
 * Punto de entrada único para:
 * - Cálculo de contexto territorial (H3Context)
 * - Queries de zonas, cuidadores, exploraciones, paseos (H3TerritorialRepository)
 * - Orquestación de operaciones territoriales (H3TerritorialOrchestrator)
 * - Validación de coordenadas y helpers geoespaciales
 */

export {
  H3Context,
  type ContextoTerritorialEnriquecido,
  type ValidacionGPS,
} from './H3Context'
export {
  H3TerritorialRepository,
  type ResultadoQueriesZona,
} from './H3TerritorialRepository'
export {
  H3TerritorialOrchestrator,
  type RegistroOperacionTerritorial,
} from './H3TerritorialOrchestrator'

// Re-export tipos del servicio territorial base
export type { ContextoTerritorial } from '@/services/territorio/ServicioTerritorio'
