/**
 * Lógica de detección de patrones simples en cliente
 * Analiza últimos N eventos para encontrar secuencias recurrentes
 *
 * Ejemplo: [juego, descanso] = patrón "juego_descanso"
 */

import type { EventoPaseo } from '@/models/Paseo'

const VENTANA_EVENTOS = 5 // Mirar últimos 5 eventos

/**
 * Patrones conocidos (puede expandirse)
 * Formato: ["accion1", "accion2"] -> "nombre_patron"
 */
const PATRONES_CONOCIDOS: Array<{
  secuencia: string[]
  nombre: string
}> = [
  { secuencia: ['tomo_agua', 'descanso'], nombre: 'agua_descanso' },
  { secuencia: ['juego', 'descanso'], nombre: 'juego_descanso' },
  { secuencia: ['corrio', 'descanso'], nombre: 'actividad_descanso' },
  { secuencia: ['tomo_agua', 'juego'], nombre: 'rehidratacion_actividad' },
  { secuencia: ['descanso', 'juego'], nombre: 'recuperacion_actividad' },
  { secuencia: ['juego', 'juego', 'descanso'], nombre: 'juego_intenso' },
]

/**
 * Detecta patrón en la última acción versus histórico reciente
 * @param eventoNuevo — Evento que se acaba de registrar
 * @param eventosRecientes — Últimos eventos del paseo (en orden cronológico)
 * @returns Nombre del patrón detectado, o null
 */
export function detectarPatron(
  eventoNuevo: EventoPaseo,
  eventosRecientes: EventoPaseo[]
): string | null {
  if (!eventoNuevo.payload?.accion) return null
  if (eventosRecientes.length === 0) return null

  const accionNueva = eventoNuevo.payload.accion

  // Filtrar solo eventos de tipo bitácora con acción
  const acciones = eventosRecientes
    .filter(e => e.tipoEvento === 'bitacora' && e.payload?.accion)
    .map(e => e.payload.accion)
    .slice(-(VENTANA_EVENTOS - 1)) // Últimos N-1 eventos

  // Agregar la acción nueva al final
  acciones.push(accionNueva)

  // Buscar coincidencias con patrones conocidos
  for (const patron of PATRONES_CONOCIDOS) {
    // Buscar si la secuencia del patrón aparece en los últimos eventos
    for (let i = 0; i <= acciones.length - patron.secuencia.length; i++) {
      const ventana = acciones.slice(i, i + patron.secuencia.length)
      if (ventana.join(',') === patron.secuencia.join(',')) {
        return patron.nombre
      }
    }
  }

  return null
}

/**
 * Extrae la acción del evento (normaliza campo)
 */
export function extraerAccion(evento: EventoPaseo): string | null {
  return evento.payload?.accion || null
}

/**
 * Agrega patrón nuevo a lista conocida (útil para ML futuro)
 */
export function agregarPatronConocido(secuencia: string[], nombre: string) {
  PATRONES_CONOCIDOS.push({ secuencia, nombre })
}
