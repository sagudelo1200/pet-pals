/**
 * ZonaH3 Unificada: Inteligencia Territorial + Operativa de Cobertura
 *
 * Un único documento por zona hexagonal que contiene:
 * 1. NARRATIVA: Identidad, índices de inteligencia, contadores de eventos
 * 2. OPERATIVA: Cobertura de cuidadores, demanda, estado de la zona
 *
 * Estructura centralizada para evitar duplicación y conflictos de escritura.
 */

import { Timestamp } from 'firebase/firestore'

/**
 * Identidad de una ubicación territorial
 */
export interface Identidad {
  tipo?: 'parque' | 'calle' | 'comercio' | 'conjunto' | 'otro' | 'mixto'
  confianza: number // 0-100: qué tan seguro somos de la clasificación
  fuente?: 'paseo' | 'explorador' | 'inferencia' // de dónde viene la información
}

/**
 * Índices de inteligencia territorial (0-100)
 */
export interface Índices {
  bienestar: number // Qué tan saludable es la zona (agua, juego, descanso)
  seguridad: number // Qué tan segura es (poca gente, conocida)
  actividad: number // Nivel de actividad observable
  socializacion: number // Oportunidad de interacción con otros perros
}

/**
 * Estado calculado de una zona H3
 */
export type EstadoZona =
  'activa' | 'en_operacion' | 'sin_cobertura' | 'saturada'

/**
 * Sección NARRATIVA: Inteligencia y conocimiento acumulado sobre la zona
 */
export interface NarrativaSección {
  identidad: Identidad
  indices: Índices
  total_eventos: number
  eventos_por_tipo: Record<string, number> // { 'juego': 5, 'agua': 3, ... }
  ultima_actualizacion?: number // timestamp en ms
}

/**
 * Sección OPERATIVA: Cobertura de cuidadores y demanda de tutores
 */
export interface OperativaSección {
  cuidadores_count: number
  demanda_total: number
  paseos_activos: number
  paseos_total: number
  estado: EstadoZona
  ratio_cobertura: number // cuidadores / max(demanda, 1)
  ultima_demanda_en?: Timestamp
  ultima_actividad_en?: Timestamp
}

/**
 * Documento completo de una Zona H3: Narrativa + Operativa
 */
export interface ZonaH3 {
  // === IDENTIDAD ===
  id: string
  h3_r8: string // Nivel regional (~5-15km)
  h3_r9: string // Nivel detalle (~1-5km)

  // === SECCIÓN 1: NARRATIVA (inteligencia territorial) ===
  narrativa: NarrativaSección

  // === SECCIÓN 2: OPERATIVA (cobertura y demanda) ===
  operativa: OperativaSección

  // === SISTEMA ===
  actualizado_en: Timestamp
  creado_por?: string
  actualizado_por?: string
}

/**
 * Delta para actualizar la sección NARRATIVA
 */
export interface DeltaNarrativa {
  identidad?: Identidad
  indices?: Partial<Índices>
  total_eventos?: number
  eventos_por_tipo?: Record<string, number>
}

/**
 * Delta para actualizar la sección OPERATIVA
 */
export interface DeltaOperativa {
  cuidadores_count?: number
  demanda_total?: number
  paseos_activos?: number
  paseos_total?: number
  estado?: EstadoZona
  ratio_cobertura?: number
  marcar_demanda?: boolean // Si true, escribe ultima_demanda_en = serverTimestamp()
  marcar_actividad?: boolean // Si true, escribe ultima_actividad_en = serverTimestamp()
}
