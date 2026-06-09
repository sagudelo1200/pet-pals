import type { Mascota } from '@/models/Mascota'

/**
 * Interfaz que representa el estado de completitud de una mascota
 */
export interface CompletitudMascota {
  /** Nivel actual de completitud (1-4) */
  nivel: 1 | 2 | 3 | 4
  /** Porcentaje de completitud (0-100) */
  porcentaje: number
  /** Estado de preparación para solicitar paseos */
  readiness: 'incompleto' | 'basico' | 'completo'
  /** Desglose de campos completados por sección */
  campos: {
    basico: Record<string, boolean>
    fisico: Record<string, boolean>
    comportamiento: Record<string, boolean>
    salud: Record<string, boolean>
  }
}

/**
 * Calcula el nivel de completitud del perfil de una mascota
 *
 * @param mascota - Mascota a evaluar
 * @returns Objeto con nivel, porcentaje, readiness y desglose de campos
 *
 * @example
 * const completitud = calcularCompletitud(miMascota)
 * console.log(completitud.porcentaje) // 50
 * console.log(completitud.readiness) // 'basico'
 */
export function calcularCompletitud(mascota: Mascota): CompletitudMascota {
  // Sección 1: PERFIL BÁSICO (25%)
  const campos_basico = {
    nombre: !!mascota.nombre && mascota.nombre.trim().length > 0,
    foto: !!mascota.foto,
    raza: !!mascota.raza && mascota.raza.trim().length > 0,
    fecha_nacimiento: !!mascota.fecha_nacimiento,
  }

  // Sección 2: PERFIL FÍSICO (50%)
  const campos_fisico = {
    genero: !!mascota.genero,
    tamano: !!mascota.tamano,
    peso: !!mascota.peso && mascota.peso > 0,
  }

  // Sección 3: PERFIL DE COMPORTAMIENTO (75%)
  const campos_comportamiento = {
    nivel_energia: !!mascota.nivel_energia,
    condiciones_comportamiento:
      !!mascota.condiciones_comportamiento &&
      mascota.condiciones_comportamiento.length > 0,
    descripcion: !!mascota.descripcion && mascota.descripcion.trim().length > 0,
  }

  // Sección 4: PERFIL DE SALUD (100%)
  const campos_salud = {
    esterilizado: mascota.esterilizado !== undefined,
    vacunas: !!mascota.vacunas && mascota.vacunas.length > 0,
    condiciones_salud:
      !!mascota.condiciones_salud && mascota.condiciones_salud.length > 0,
  }

  // Verificar completitud por nivel
  const basico_completo = Object.values(campos_basico).every(v => v)
  const fisico_completo = Object.values(campos_fisico).every(v => v)
  const comportamiento_completo = Object.values(campos_comportamiento).every(
    v => v
  )
  const salud_completo = Object.values(campos_salud).every(v => v)

  // Determinar nivel y porcentaje
  let nivel: 1 | 2 | 3 | 4 = 1
  let porcentaje = 0

  // Nivel 1: Básico
  if (basico_completo) {
    nivel = 1
    porcentaje = 25
  }

  // Nivel 2: Básico + Físico
  if (basico_completo && fisico_completo) {
    nivel = 2
    porcentaje = 50
  }

  // Nivel 3: Básico + Físico + Comportamiento
  if (basico_completo && fisico_completo && comportamiento_completo) {
    nivel = 3
    porcentaje = 75
  }

  // Nivel 4: Todos completos
  if (basico_completo && fisico_completo && comportamiento_completo && salud_completo) {
    nivel = 4
    porcentaje = 100
  }

  // Determinar estado de preparación para paseos
  const readiness: 'incompleto' | 'basico' | 'completo' =
    nivel < 2 ? 'incompleto' : nivel < 4 ? 'basico' : 'completo'

  return {
    nivel,
    porcentaje,
    readiness,
    campos: {
      basico: campos_basico,
      fisico: campos_fisico,
      comportamiento: campos_comportamiento,
      salud: campos_salud,
    },
  }
}

/**
 * Retorna la clave i18n para el mensaje sobre campos faltantes
 *
 * @param nivel - Nivel de completitud (1-4)
 * @returns Clave de traducción i18n
 */
export function obtenerClaveNivelMensaje(nivel: 1 | 2 | 3 | 4): string {
  const claves: Record<number, string> = {
    1: 'mascotas:completitud.mensaje_nivel_1',
    2: 'mascotas:completitud.mensaje_nivel_2',
    3: 'mascotas:completitud.mensaje_nivel_3',
    4: 'mascotas:completitud.mensaje_nivel_4',
  }
  return claves[nivel] || 'mascotas:completitud.mensaje_nivel_1'
}

/**
 * Retorna la clave i18n del nivel de completitud
 *
 * @param nivel - Nivel de completitud (1-4)
 * @returns Clave de traducción i18n
 */
export function obtenerClaveNivel(nivel: 1 | 2 | 3 | 4): string {
  const claves: Record<number, string> = {
    1: 'mascotas:completitud.nivel_1',
    2: 'mascotas:completitud.nivel_2',
    3: 'mascotas:completitud.nivel_3',
    4: 'mascotas:completitud.nivel_4',
  }
  return claves[nivel] || ''
}
