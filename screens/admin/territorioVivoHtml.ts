import type { ZonaH3 } from '@/models/ZonaH3'
import { injectTerritorioData } from './territorioVivoHelper'

/** Textos visibles dentro del WebView (se pasan ya traducidos) */
export interface TextosTerritorio {
  lang: string
  miUbicacion: string
  cambiarTema: string
  cambiarR9: string
  cambiarR8: string
  verInteligencia: string
  verEstado: string
  bienestar: string
  seguridad: string
  actividad: string
  socializacion: string
  sinDatos: string
  estado: string
  inteligencia: string
  tipo: string
  eventos: string
  cuidadores: string
  demanda: string
  activos: string
  paseos: string
  interesados: string
  tutoresMin: string
  cuidadoresMin: string
  /** Etiqueta de cada estado (clave de COLORES_ESTADO) */
  estados: Record<string, string>
}

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
  interes: { fill: '#A855F7', opacity: 0.6, label: 'Interés sin servicio' },
}

/**
 * Estado con el que se pinta una celda. Si hay interesados y nada más
 * (todavía no se atiende ahí), es "interés sin servicio": dónde abrir.
 */
export function estadoParaMapa(z: ZonaH3): string | undefined {
  const interes = (z.interes?.tutores ?? 0) + (z.interes?.cuidadores ?? 0)
  const estado = z.operativa?.estado
  return interes > 0 && (!estado || estado === 'sin_actividad')
    ? 'interes'
    : estado
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
  opciones?: {
    ciudad?: string
    totalZonas?: number
    textos?: TextosTerritorio
  }
): string {
  const ciudad = opciones?.ciudad || 'desconocida'
  const totalZonas = opciones?.totalZonas || zonas.length

  // Preparar datos para inyectar en plantilla
  const zonasJSON = JSON.stringify(
    zonas.map(z => ({
      nivel: z.nivel,
      id_r8: z.h3_r8,
      id_r9: z.h3_r9,
      estado: estadoParaMapa(z),
      interesTutores: z.interes?.tutores || 0,
      interesCuidadores: z.interes?.cuidadores || 0,
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

  const textos = opciones?.textos
  const colores = textos
    ? Object.fromEntries(
        Object.entries(COLORES_ESTADO).map(([clave, c]) => [
          clave,
          { ...c, label: textos.estados[clave] ?? c.label },
        ])
      )
    : COLORES_ESTADO
  const coloresJSON = JSON.stringify(colores)
  const textosJSON = JSON.stringify(textos ?? {}).replace(/</g, '\\u003c')

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
    coloresJSON,
    textosJSON,
    textos?.lang ?? 'es'
  )
}
