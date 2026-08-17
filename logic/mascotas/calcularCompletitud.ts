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
    compatibilidad: Record<string, boolean>
    notas: Record<string, boolean>
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
    socializacion: !!mascota.socializacion,
    ansiedad: !!mascota.ansiedad,
    reactividad: !!mascota.reactividad,
  }

  // Sección 4: PERFIL DE SALUD (100%)
  const campos_salud = {
    esterilizado: mascota.esterilizado !== undefined,
    vacunas: !!mascota.vacunas && mascota.vacunas.length > 0,
    condiciones_salud:
      !!mascota.condiciones_salud && mascota.condiciones_salud.length > 0,
    alergias: !!mascota.alergias && mascota.alergias.length > 0,
    medicamentos: !!mascota.medicamentos && mascota.medicamentos.length > 0,
  }

  // Sección 5: COMPATIBILIDAD DE PASEO (adicional)
  const campos_compatibilidad = {
    ritmo: !!mascota.compatibilidad_paseo?.tutor?.ritmo,
    compania: !!mascota.compatibilidad_paseo?.tutor?.compania,
    tolerancia: !!mascota.compatibilidad_paseo?.tutor?.tolerancia,
    tamano_compatible: !!mascota.compatibilidad_paseo?.tutor?.tamano_compatible,
  }

  // Sección 6: NOTAS (adicional)
  const campos_notas = {
    descripcion: !!mascota.descripcion && mascota.descripcion.trim().length > 0,
  }

  /**
   * Calcula porcentaje ponderado de una sección
   * Cada campo tiene peso igual dentro de su sección
   */
  const calcularPorcentajeSeccion = (campos: Record<string, boolean>) => {
    const totalCampos = Object.keys(campos).length
    if (totalCampos === 0) return 0
    const completados = Object.values(campos).filter(Boolean).length
    return Math.round((completados / totalCampos) * 100)
  }

  // Calcular porcentajes por sección
  const porcentaje_basico = calcularPorcentajeSeccion(campos_basico)
  const porcentaje_fisico = calcularPorcentajeSeccion(campos_fisico)
  const porcentaje_comportamiento = calcularPorcentajeSeccion(
    campos_comportamiento
  )
  const porcentaje_salud = calcularPorcentajeSeccion(campos_salud)
  const _porcentaje_compatibilidad = calcularPorcentajeSeccion(
    campos_compatibilidad
  )
  const _porcentaje_notas = calcularPorcentajeSeccion(campos_notas)

  // Pesos por sección para el cálculo ponderado
  // Las primeras 4 secciones son críticas (nivel básico/completo)
  // Compatibilidad y notas son complementarias
  const pesos = {
    basico: 0.25,
    fisico: 0.25,
    comportamiento: 0.25,
    salud: 0.25,
    compatibilidad: 0.0, // Optativa
    notas: 0.0, // Optativa
  }

  // Calcular porcentaje general PONDERADO (0-100)
  // Ahora es continuo, no binario
  const porcentajeGeneral = Math.round(
    porcentaje_basico * pesos.basico +
      porcentaje_fisico * pesos.fisico +
      porcentaje_comportamiento * pesos.comportamiento +
      porcentaje_salud * pesos.salud
  )

  // Determinar nivel basado en porcentaje continuo
  let nivel: 1 | 2 | 3 | 4 = 1
  if (porcentajeGeneral >= 75) {
    nivel = 4
  } else if (porcentajeGeneral >= 50) {
    nivel = 3
  } else if (porcentajeGeneral >= 25) {
    nivel = 2
  } else {
    nivel = 1
  }

  // Determinar estado de preparación para paseos
  const readiness: 'incompleto' | 'basico' | 'completo' =
    nivel < 2 ? 'incompleto' : nivel < 4 ? 'basico' : 'completo'

  // Verificar completitud por sección (solo para referencia)
  const _basico_completo = Object.values(campos_basico).every(v => v)
  const _fisico_completo = Object.values(campos_fisico).every(v => v)
  const _comportamiento_completo = Object.values(campos_comportamiento).every(
    v => v
  )
  const _salud_completo = Object.values(campos_salud).every(v => v)

  return {
    nivel,
    porcentaje: porcentajeGeneral,
    readiness,
    campos: {
      basico: campos_basico,
      fisico: campos_fisico,
      comportamiento: campos_comportamiento,
      salud: campos_salud,
      compatibilidad: campos_compatibilidad,
      notas: campos_notas,
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
