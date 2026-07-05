/**
 * Funciones helper para el Dashboard del Tutor.
 * Contiene lógica de filtrado, ordenamiento y formateo de datos.
 */

import { Paseo, ESTADOS_PASEO } from '@/models/Paseo'

/**
 * Obtiene el próximo paseo activo del usuario.
 * Filtra paseos en estados activos y ordena por fecha más cercana.
 * @param paseos Array de paseos del usuario
 * @returns El próximo paseo o null si no existe
 */
export function obtenerProximoPaseo(paseos: Paseo[]): Paseo | null {
  if (!paseos || paseos.length === 0) return null

  const estadosActivos = [
    ESTADOS_PASEO.PENDIENTE,
    ESTADOS_PASEO.CONFIRMADO,
    ESTADOS_PASEO.EN_CAMINO,
    ESTADOS_PASEO.EN_PUNTO_RECOGIDA,
    ESTADOS_PASEO.EN_PROGRESO,
  ]

  const proximos = paseos
    .filter(p => estadosActivos.includes(p.estado as ESTADOS_PASEO))
    .sort(
      (a, b) =>
        new Date(a.fecha_hora_inicio).getTime() -
        new Date(b.fecha_hora_inicio).getTime()
    )

  return proximos.length > 0 ? proximos[0] : null
}

/**
 * Obtiene el historial de paseos completados/cancelados.
 * Limita a los últimos N eventos ordenados por fecha descendente.
 * @param paseos Array de paseos del usuario
 * @param limit Número máximo de eventos (default: 5)
 * @returns Array de paseos históricos
 */
export function obtenerActividadReciente(
  paseos: Paseo[],
  limit: number = 5
): Paseo[] {
  if (!paseos || paseos.length === 0) return []

  const estadosHistoricos = [
    ESTADOS_PASEO.FINALIZADO,
    ESTADOS_PASEO.COMPLETADO,
    ESTADOS_PASEO.CANCELADO,
  ]

  return paseos
    .filter(p => estadosHistoricos.includes(p.estado as ESTADOS_PASEO))
    .sort(
      (a, b) =>
        new Date(b.actualizado_en).getTime() -
        new Date(a.actualizado_en).getTime()
    )
    .slice(0, limit)
}

/**
 * Formatea una fecha para visualización en dashboard.
 * Retorna: "Hoy", "Mañana", "Ayer", "Hace Xd", "15 Jul"
 * @param fecha Fecha a formatear
 * @returns String formateado
 */
export function formatFechaDashboard(fecha: Date | string): string {
  const hoy = new Date()
  const manana = new Date(hoy)
  manana.setDate(manana.getDate() + 1)
  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 1)

  const fechaObj = new Date(fecha)

  // Comparar solo fecha (sin hora)
  const esFechaHoy = fechaObj.toDateString() === hoy.toDateString()
  const esFechaManana = fechaObj.toDateString() === manana.toDateString()
  const esFechaAyer = fechaObj.toDateString() === ayer.toDateString()

  if (esFechaHoy) return 'Hoy'
  if (esFechaManana) return 'Mañana'
  if (esFechaAyer) return 'Ayer'

  // Para fechas más lejanas, mostrar "Hace X días"
  const diffDias = Math.floor(
    (hoy.getTime() - fechaObj.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (diffDias > 0 && diffDias < 30) return `Hace ${diffDias}d`

  // Por defecto, formato corto
  return fechaObj.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  })
}

/**
 * Formatea hora para visualización (HH:MM).
 * @param fecha Fecha con hora a formatear
 * @returns String formateado "HH:MM"
 */
export function formatHora(fecha: Date | string): string {
  const fechaObj = new Date(fecha)
  return fechaObj.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Calcula texto descriptivo para una actividad reciente.
 * @param paseo Paseo a describir
 * @returns String descriptivo del evento
 */
export function construirDescripcionActividad(paseo: Paseo): string {
  const mascotaNombre = paseo.mascota_nombre_visual || 'Mascota'
  const cuidadorNombre = paseo.cuidador_nombre_visual || 'Cuidador'

  switch (paseo.estado) {
    case ESTADOS_PASEO.COMPLETADO:
      return `Paseo completado: ${mascotaNombre} con ${cuidadorNombre}`
    case ESTADOS_PASEO.FINALIZADO:
      return `Paseo finalizado: ${mascotaNombre} con ${cuidadorNombre}`
    case ESTADOS_PASEO.CANCELADO:
      return `Paseo cancelado: ${mascotaNombre}`
    default:
      return `Paseo: ${mascotaNombre}`
  }
}

/**
 * Obtiene el emoji correspondiente al estado del paseo.
 * @param estado Estado del paseo
 * @returns Emoji representativo
 */
export function getEmojiEstadoPaseo(estado: ESTADOS_PASEO): string {
  switch (estado) {
    case ESTADOS_PASEO.PENDIENTE:
      return '⏳'
    case ESTADOS_PASEO.CONFIRMADO:
      return '✅'
    case ESTADOS_PASEO.EN_CAMINO:
      return '🚶'
    case ESTADOS_PASEO.EN_PUNTO_RECOGIDA:
      return '📍'
    case ESTADOS_PASEO.EN_PROGRESO:
      return '🐾'
    case ESTADOS_PASEO.FINALIZADO:
      return '🏁'
    case ESTADOS_PASEO.COMPLETADO:
      return '✨'
    case ESTADOS_PASEO.CANCELADO:
      return '❌'
    case ESTADOS_PASEO.ERROR:
      return '⚠️'
    default:
      return '❓'
  }
}
