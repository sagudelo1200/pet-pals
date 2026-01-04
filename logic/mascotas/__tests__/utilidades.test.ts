/* eslint-env jest */
import { calcularEdadMascota, formatearEdadMascota } from '../utilidades'

describe('Mascotas Utils - Edad', () => {
  const hoy = new Date()

  test('calcularEdadMascota devuelve null si no hay fecha', () => {
    expect(calcularEdadMascota(null)).toBeNull()
    expect(calcularEdadMascota(undefined)).toBeNull()
  })

  test('calcula edad correctamente para cachorro de 2 meses', () => {
    const fecha = new Date(hoy)
    fecha.setMonth(hoy.getMonth() - 2)
    const edad = calcularEdadMascota(fecha)
    expect(edad?.años).toBe(0)
    expect(edad?.meses).toBe(2)
  })

  test('calcula edad correctamente para perro de 3 años', () => {
    const fecha = new Date(hoy)
    fecha.setFullYear(hoy.getFullYear() - 3)
    const edad = calcularEdadMascota(fecha)
    expect(edad?.años).toBe(3)
    expect(edad?.meses).toBe(0)
  })

  test('formatearEdadMascota devuelve string vacío si no hay fecha', () => {
    expect(formatearEdadMascota(null)).toBe('')
  })

  test('formatea correctamente menos de un mes (días)', () => {
    const fecha = new Date(hoy)
    fecha.setDate(hoy.getDate() - 15)
    // Sin i18n mockeado, usa el fallback en español del helper
    expect(formatearEdadMascota(fecha)).toMatch(/15 días|15 día/)
  })

  test('formatea correctamente meses', () => {
    const fecha = new Date(hoy)
    fecha.setMonth(hoy.getMonth() - 5)
    expect(formatearEdadMascota(fecha)).toBe('5 meses')
  })

  test('formatea correctamente años y meses', () => {
    const fecha = new Date(hoy)
    fecha.setFullYear(hoy.getFullYear() - 1)
    fecha.setMonth(hoy.getMonth() - 2)
    expect(formatearEdadMascota(fecha)).toBe('1 año 2 meses')
  })

  test('formatea correctamente solo años (2+)', () => {
    const fecha = new Date(hoy)
    fecha.setFullYear(hoy.getFullYear() - 5)
    expect(formatearEdadMascota(fecha)).toBe('5 años')
  })
})
