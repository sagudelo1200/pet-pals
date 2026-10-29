import { PerfilPublico } from '@/models/PerfilPublico'
import type { ExcepcionDisponibilidad } from '@/models/ExcepcionDisponibilidad'
import type { ConfiguracionAreas } from '@/functions/src/compartido/configuracion'

/**
 * Horario de la plataforma y márgenes de tiempo: vienen de la configuración
 * (`configuracion/paseos`, ver `useConfiguracion('paseos')`).
 */
export type HorarioServicio = Pick<
  ConfiguracionAreas['paseos'],
  | 'servicio_desde_min'
  | 'servicio_hasta_min'
  | 'margen_horario_min'
  | 'antelacion_min'
>

/**
 * Parámetros para realizar el matching de cuidadores
 */
export interface ParametrosMatching {
  fecha: Date
  hora: string // Formato "HH:mm"
  duracion: number // En minutos
}

/**
 * Lógica centralizada para el matching y disponibilidad de cuidadores.
 * Extraída para facilitar pruebas y mantenimiento.
 */
export class LogicMatching {
  static readonly MAX_DIAS_ANTICIPACION = 60 // Máximo 2 meses de anticipación

  /**
   * Determina si un cuidador está disponible para una solicitud específica.
   * Si se proporciona `excepcion`, sus overrides tienen prioridad sobre `horario_semanal`.
   */
  static esCuidadorDisponible(
    perfil: PerfilPublico,
    params: ParametrosMatching,
    horario: HorarioServicio,
    excepcion?: ExcepcionDisponibilidad
  ): boolean {
    const { fecha, hora, duracion } = params

    // 0. Validar si la fecha es hoy y la hora ya pasó (considerando margen de 12 min)
    const ahora = new Date()
    const esHoy =
      fecha.getDate() === ahora.getDate() &&
      fecha.getMonth() === ahora.getMonth() &&
      fecha.getFullYear() === ahora.getFullYear()

    const solicitudInicio = this.timeToMinutes(hora)
    const solicitudFin = solicitudInicio + duracion
    const MARGEN = horario.margen_horario_min
    const BUFFER = horario.antelacion_min

    if (esHoy) {
      const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()
      if (solicitudInicio < minutosAhora + BUFFER) return false
    }

    // 1. Validar límites de servicio sistémicos
    if (solicitudInicio < horario.servicio_desde_min) return false
    if (solicitudFin > horario.servicio_hasta_min) return false

    const diaKey = fecha.getDay().toString()

    // 2. Resolver franja horaria: override primero, luego horario_semanal base
    let inicio: string | undefined
    let fin: string | undefined

    if (excepcion?.overrides[diaKey] !== undefined) {
      const override = excepcion.overrides[diaKey]!
      if (!override.activo) return false
      const base = perfil.horario_semanal?.[diaKey]
      inicio = override.inicio ?? base?.inicio
      fin = override.fin ?? base?.fin
    } else {
      const franja = perfil.horario_semanal?.[diaKey]
      if (!franja) return false
      inicio = franja.inicio
      fin = franja.fin
    }

    if (!inicio || !fin) return false

    // 3. Validar rango horario del cuidador con margen de cortesía (12 min)
    try {
      const cuidadorInicio = this.timeToMinutes(inicio)
      const cuidadorFin = this.timeToMinutes(fin)
      return (
        solicitudInicio >= cuidadorInicio - MARGEN &&
        solicitudFin <= cuidadorFin + MARGEN
      )
    } catch (e) {
      console.error('Error calculando matching horario:', e)
      return false
    }
  }

  /**
   * Valida si un horario propuesto por un cuidador cumple con los límites de la plataforma.
   */
  static esHorarioLaboralValido(
    inicioStr: string,
    finStr: string,
    horario: HorarioServicio
  ): boolean {
    try {
      const inicio = this.timeToMinutes(inicioStr)
      const fin = this.timeToMinutes(finStr)
      const plataformaMin = horario.servicio_desde_min
      const plataformaMax = horario.servicio_hasta_min

      // El horario del cuidador debe estar contenido en el horario de la plataforma
      return inicio >= plataformaMin && fin <= plataformaMax && inicio < fin
    } catch (_e) {
      console.warn('[matching.esHorarioLaboralValido] Error manejado:', _e)
      return false
    }
  }

  /** Minutos desde la medianoche como "HH:mm" (330 → "05:30"). */
  static formatoHora(minutos: number): string {
    const dos = (n: number) => String(n).padStart(2, '0')
    return `${dos(Math.floor(minutos / 60))}:${dos(minutos % 60)}`
  }

  /**
   * Convierte un string "HH:mm" en minutos totales del día para comparaciones fáciles.
   */
  private static timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) throw new Error('Formato de tiempo inválido')
    return h * 60 + m
  }

  /**
   * Devuelve la semana ISO de una fecha en formato "YYYY-Www" (ej: "2026-W21").
   */
  static isoSemana(fecha: Date): string {
    const d = new Date(
      Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
    )
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const week = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
    )
    return `${d.getUTCFullYear()}-W${week.toString().padStart(2, '0')}`
  }

  /**
   * Devuelve un rango legible para una semana ISO, ej: "11–17 may 2026".
   * Si lunes y domingo caen en meses distintos: "30 dic–5 ene 2026".
   * Si caen en años distintos: "30 dic 2025–5 ene 2026".
   */
  static rangoSemana(isoSemana: string): string {
    const [yearStr, weekStr] = isoSemana.split('-W')
    const year = parseInt(yearStr, 10)
    const week = parseInt(weekStr, 10)

    const jan4 = new Date(year, 0, 4)
    const jan4Day = (jan4.getDay() + 6) % 7 // 0=Lun..6=Dom
    const monday = new Date(year, 0, 4 - jan4Day + (week - 1) * 7)
    const sunday = new Date(monday.getTime() + 6 * 86_400_000)

    const MESES = [
      'ene',
      'feb',
      'mar',
      'abr',
      'may',
      'jun',
      'jul',
      'ago',
      'sep',
      'oct',
      'nov',
      'dic',
    ]
    const fmtDia = (d: Date) => `${d.getDate()} ${MESES[d.getMonth()]}`

    if (monday.getFullYear() !== sunday.getFullYear()) {
      return `${fmtDia(monday)} ${monday.getFullYear()}–${fmtDia(sunday)} ${sunday.getFullYear()}`
    }
    if (monday.getMonth() !== sunday.getMonth()) {
      return `${fmtDia(monday)}–${fmtDia(sunday)} ${sunday.getFullYear()}`
    }
    return `${monday.getDate()}–${sunday.getDate()} ${MESES[monday.getMonth()]} ${monday.getFullYear()}`
  }

  /**
   * Filtra una lista de perfiles según la disponibilidad.
   */
  static filtrarDisponibles(
    perfiles: PerfilPublico[],
    params: ParametrosMatching,
    horario: HorarioServicio
  ): PerfilPublico[] {
    return perfiles.filter(p =>
      this.esCuidadorDisponible(p, params, horario)
    )
  }
}
