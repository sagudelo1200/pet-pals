import type { ZonaH3 } from '@/services/firebase/firestore/colecciones/h3_zonas'
import { injectTerritorioData } from './territorioVivoHelper'

// ─── Paleta de colores por estado ────────────────────────────────────────────
export const COLORES_ESTADO: Record<
  string,
  { fill: string; opacity: number; label: string }
> = {
  sin_actividad: { fill: '#6B7280', opacity: 0.25, label: 'Sin actividad' },
  disponible: { fill: '#1D8F73', opacity: 0.5, label: 'Disponible' },
  sin_cobertura: { fill: '#C96B67', opacity: 0.6, label: 'Sin cobertura' },
  activa: { fill: '#3B82F6', opacity: 0.55, label: 'Activa' },
  en_operacion: { fill: '#F59E0B', opacity: 0.7, label: 'En operación' },
}

/**
 * Constructor del HTML de Leaflet
 * Prepara los datos y delega la construcción HTML al helper
 * La plantilla está en templates/territorio-vivo.html
 */
export function construirHTML(
  zonas: ZonaH3[],
  topInset: number = 0,
  bottomInset: number = 0,
  opciones?: { ciudad?: string; totalZonas?: number }
): string {
  const ciudad = opciones?.ciudad || 'desconocida'
  const totalZonas = opciones?.totalZonas || zonas.length

  // Preparar datos para inyectar en plantilla
  const zonasJSON = JSON.stringify(
    zonas.map(z => ({
      id_r8: z.h3_r8,
      id_r9: z.h3_r9,
      estado: z.operativa?.estado,
      cuidadores: z.operativa?.cuidadores_count || 0,
      demanda: z.operativa?.demanda_total || 0,
      activos: z.operativa?.paseos_activos || 0,
      total: z.operativa?.paseos_total || 0,
      // Inteligencia territorial
      bienestar: z.narrativa?.indices?.bienestar,
      seguridad: z.narrativa?.indices?.seguridad,
      actividad: z.narrativa?.indices?.actividad,
      socializacion: z.narrativa?.indices?.socializacion,
      tipo: z.narrativa?.identidad?.tipo,
      eventos: z.narrativa?.total_eventos || 0,
    }))
  )

  const coloresJSON = JSON.stringify(COLORES_ESTADO)

  // Debug logs
  console.log('[construirHTML] Zonas:', zonas.length)
  console.log('[construirHTML] Ciudad:', ciudad)
  console.log('[construirHTML] Total Firestore:', totalZonas)

  // Inyectar datos en plantilla HTML
  return injectTerritorioData(
    topInset,
    bottomInset,
    ciudad,
    totalZonas,
    zonasJSON,
    coloresJSON
  )
}
