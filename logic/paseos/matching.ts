import { PerfilPublico } from '@/models/PerfilPublico'

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
  /** Límites globales de operación del servicio */
  static readonly HORA_MINIMA_SERVICIO = '05:30' // 5:30 AM
  static readonly HORA_MAXIMA_SERVICIO = '22:30' // 10:30 PM

  /**
   * Determina si un cuidador está disponible para una solicitud específica.
   */
  static esCuidadorDisponible(
    perfil: PerfilPublico,
    params: ParametrosMatching
  ): boolean {
    const { fecha, hora, duracion } = params

    // 0. Validar límites de servicio sistémicos
    const solicitudInicio = this.timeToMinutes(hora)
    const solicitudFin = solicitudInicio + duracion

    if (solicitudInicio < this.timeToMinutes(this.HORA_MINIMA_SERVICIO))
      return false
    if (solicitudFin > this.timeToMinutes(this.HORA_MAXIMA_SERVICIO))
      return false

    // 1. Validar que tenga horario configurado
    if (!perfil.horario_laboral) return false

    // 2. Validar día de la semana
    const diaSemana = fecha.getDay() // 0 = Domingo
    const diasConfigurados = this.normalizarDias(perfil.horario_laboral.dias)

    if (!diasConfigurados.includes(diaSemana)) return false

    // 3. Validar rango horario con margen de cortesía (12 min)
    try {
      const MARGEN = 12 // minutos de flexibilidad
      const cuidadorInicio = this.timeToMinutes(
        perfil.horario_laboral.hora_inicio
      )
      const cuidadorFin = this.timeToMinutes(perfil.horario_laboral.hora_fin)

      // El cuidador es apto si la solicitud cae dentro de su horario,
      // permitiendo que el paseo empiece/termine con un margen de 12 min
      // respecto a los límites estrictos del cuidador.
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
  static esHorarioLaboralValido(inicioStr: string, finStr: string): boolean {
    try {
      const inicio = this.timeToMinutes(inicioStr)
      const fin = this.timeToMinutes(finStr)
      const plataformaMin = this.timeToMinutes(this.HORA_MINIMA_SERVICIO)
      const plataformaMax = this.timeToMinutes(this.HORA_MAXIMA_SERVICIO)

      // El horario del cuidador debe estar contenido en el horario de la plataforma
      return inicio >= plataformaMin && fin <= plataformaMax && inicio < fin
    } catch (_e) {
      return false
    }
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
   * Normaliza los días laborables ya que Firestore puede devolverlos de formas variadas
   * (arreglos de números, arreglos de strings, u objetos mapa).
   */
  private static normalizarDias(diasRaw: any): number[] {
    if (!diasRaw) return []

    // Caso: Arreglo [0, 1, 2] o ["0", "1"]
    if (Array.isArray(diasRaw)) {
      return diasRaw.map(d => Number(d)).filter(n => !isNaN(n))
    }

    // Caso: Objeto { "0": true, "1": true } o { "day1": 0 }
    if (typeof diasRaw === 'object') {
      // Intentamos extraer valores si parece un mapa de booleanos/flags
      // o llaves si parece un mapa indexado
      const entries = Object.entries(diasRaw)
      const numericKeys = entries
        .map(([k, _v]) => Number(k))
        .filter(n => !isNaN(n))

      if (numericKeys.length > 0) return numericKeys

      const numericValues = Object.values(diasRaw)
        .map(v => Number(v))
        .filter(n => !isNaN(n))

      return numericValues
    }

    return []
  }

  /**
   * Filtra una lista de perfiles según la disponibilidad.
   */
  static filtrarDisponibles(
    perfiles: PerfilPublico[],
    params: ParametrosMatching
  ): PerfilPublico[] {
    return perfiles.filter(p => this.esCuidadorDisponible(p, params))
  }
}
