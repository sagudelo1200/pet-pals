import { TFunction } from 'i18next'

/**
 * Representa la edad calculada de una mascota
 */
export interface EdadMascota {
  años: number
  meses: number
  dias: number
  totalMeses: number
  totalDias: number
}

/**
 * Calcula la edad exacta de una mascota desde su fecha de nacimiento
 * 
 * @param fechaNacimiento - Fecha de nacimiento de la mascota (Date, Timestamp de Firebase, o string ISO)
 * @returns Objeto con la edad desglosada o null si no hay fecha
 * 
 * @example
 * const edad = calcularEdadMascota(new Date('2023-01-15'))
 * // { años: 1, meses: 11, dias: 20, totalMeses: 23, totalDias: 690 }
 */
export const calcularEdadMascota = (
  fechaNacimiento?: Date | any
): EdadMascota | null => {
  if (!fechaNacimiento) return null

  // Normalizar diferentes formatos de fecha
  const nacimiento =
    fechaNacimiento instanceof Date
      ? fechaNacimiento
      : fechaNacimiento.toDate
        ? fechaNacimiento.toDate()
        : new Date(fechaNacimiento)

  const hoy = new Date()

  let años = hoy.getFullYear() - nacimiento.getFullYear()
  let meses = hoy.getMonth() - nacimiento.getMonth()
  let dias = hoy.getDate() - nacimiento.getDate()

  // Ajustar si los días son negativos
  if (dias < 0) {
    meses--
    const ultimoDiaMesAnterior = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      0
    ).getDate()
    dias += ultimoDiaMesAnterior
  }

  // Ajustar si los meses son negativos
  if (meses < 0) {
    años--
    meses += 12
  }

  const totalMeses = años * 12 + meses
  const totalDias = Math.floor(
    (hoy.getTime() - nacimiento.getTime()) / (1000 * 60 * 60 * 24)
  )

  return { años, meses, dias, totalMeses, totalDias }
}

/**
 * Formatea la edad de una mascota de forma legible y apropiada según su edad
 * 
 * Formato según edad:
 * - < 1 mes: "X días"
 * - < 12 meses: "X meses"
 * - 1 año con meses: "1 año X meses"
 * - ≥ 2 años: "X años"
 * 
 * @param fechaNacimiento - Fecha de nacimiento de la mascota
 * @param t - Función de traducción de i18next (opcional)
 * @returns String formateado con la edad o string vacío si no hay fecha
 * 
 * @example
 * formatearEdadMascota(new Date('2024-11-01'), t) // "1 mes"
 * formatearEdadMascota(new Date('2023-06-15'), t) // "1 año 6 meses"
 * formatearEdadMascota(new Date('2020-01-01'), t) // "4 años"
 */
export const formatearEdadMascota = (
  fechaNacimiento?: Date | any,
  t?: TFunction
): string => {
  const edad = calcularEdadMascota(fechaNacimiento)
  if (!edad) return ''

  const { años, meses, dias, totalDias } = edad

  // Menos de 1 mes: mostrar días
  if (totalDias < 30) {
    const unidad = t
      ? t('mascotas:edad.dias', { count: dias })
      : dias === 1
        ? 'día'
        : 'días'
    return `${dias} ${unidad}`
  }

  // Menos de 12 meses: mostrar meses
  if (años === 0) {
    const unidad = t
      ? t('mascotas:edad.meses', { count: meses })
      : meses === 1
        ? 'mes'
        : 'meses'
    return `${meses} ${unidad}`
  }

  // 1 año con meses adicionales: mostrar ambos
  if (años === 1 && meses > 0) {
    const añoStr = t ? t('mascotas:edad.años', { count: 1 }) : 'año'
    const mesStr = t
      ? t('mascotas:edad.meses', { count: meses })
      : meses === 1
        ? 'mes'
        : 'meses'
    return `${años} ${añoStr} ${meses} ${mesStr}`
  }

  // 2+ años: solo mostrar años
  const unidad = t
    ? t('mascotas:edad.años', { count: años })
    : años === 1
      ? 'año'
      : 'años'
  return `${años} ${unidad}`
}
