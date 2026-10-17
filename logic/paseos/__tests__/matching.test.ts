/* eslint-env jest */
import { LogicMatching } from '@/logic/paseos/matching'
import type { PerfilPublico } from '@/models/PerfilPublico'

// Lunes 14 de enero de 2030 (getDay() === 1): fecha futura, nunca "hoy"
const LUNES = new Date(2030, 0, 14)

function perfil(horario: Record<string, { inicio: string; fin: string }>): PerfilPublico {
  return { id: 'c1', nombre: 'Cuidador', horario_semanal: horario } as any
}

describe('LogicMatching.esCuidadorDisponible', () => {
  const cuidador = perfil({ '1': { inicio: '08:00', fin: '12:00' } })

  it('disponible si la solicitud cabe en su franja del día', () => {
    expect(
      LogicMatching.esCuidadorDisponible(cuidador, { fecha: LUNES, hora: '09:00', duracion: 60 })
    ).toBe(true)
  })

  it('no disponible si no trabaja ese día', () => {
    const martes = new Date(2030, 0, 15)
    expect(
      LogicMatching.esCuidadorDisponible(cuidador, { fecha: martes, hora: '09:00', duracion: 60 })
    ).toBe(false)
  })

  it('tolera un margen de 12 minutos en los bordes de la franja', () => {
    expect(
      LogicMatching.esCuidadorDisponible(cuidador, { fecha: LUNES, hora: '07:50', duracion: 60 })
    ).toBe(true)
    expect(
      LogicMatching.esCuidadorDisponible(cuidador, { fecha: LUNES, hora: '07:45', duracion: 60 })
    ).toBe(false)
  })

  it('no disponible si la solicitud termina después de la franja (más margen)', () => {
    expect(
      LogicMatching.esCuidadorDisponible(cuidador, { fecha: LUNES, hora: '11:30', duracion: 60 })
    ).toBe(false)
  })

  it('respeta el horario de servicio de la plataforma (05:30 - 22:30)', () => {
    const nocturno = perfil({ '1': { inicio: '04:00', fin: '23:59' } })
    expect(
      LogicMatching.esCuidadorDisponible(nocturno, { fecha: LUNES, hora: '05:00', duracion: 30 })
    ).toBe(false)
    expect(
      LogicMatching.esCuidadorDisponible(nocturno, { fecha: LUNES, hora: '22:15', duracion: 30 })
    ).toBe(false)
  })

  it('una excepción inactiva bloquea el día', () => {
    expect(
      LogicMatching.esCuidadorDisponible(
        cuidador,
        { fecha: LUNES, hora: '09:00', duracion: 60 },
        { overrides: { '1': { activo: false } } } as any
      )
    ).toBe(false)
  })

  it('una excepción puede cambiar el horario del día', () => {
    const excepcion = { overrides: { '1': { activo: true, inicio: '14:00', fin: '18:00' } } } as any
    expect(
      LogicMatching.esCuidadorDisponible(cuidador, { fecha: LUNES, hora: '09:00', duracion: 60 }, excepcion)
    ).toBe(false)
    expect(
      LogicMatching.esCuidadorDisponible(cuidador, { fecha: LUNES, hora: '15:00', duracion: 60 }, excepcion)
    ).toBe(true)
  })

  it('no disponible para hoy si la hora ya pasó (buffer de 15 min)', () => {
    const ahora = new Date()
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
    const todoElDia = perfil({ [hoy.getDay().toString()]: { inicio: '00:00', fin: '23:59' } })
    expect(
      LogicMatching.esCuidadorDisponible(todoElDia, { fecha: hoy, hora: '00:00', duracion: 30 })
    ).toBe(false)
  })
})

describe('LogicMatching.filtrarDisponibles', () => {
  it('devuelve solo los cuidadores disponibles', () => {
    const a = perfil({ '1': { inicio: '08:00', fin: '12:00' } })
    const b = perfil({ '1': { inicio: '14:00', fin: '18:00' } })
    const res = LogicMatching.filtrarDisponibles([a, b], { fecha: LUNES, hora: '09:00', duracion: 60 })
    expect(res).toEqual([a])
  })
})

describe('LogicMatching.esHorarioLaboralValido', () => {
  it.each([
    ['08:00', '12:00', true],
    ['05:30', '22:30', true],
    ['05:00', '12:00', false],
    ['08:00', '23:00', false],
    ['12:00', '08:00', false],
    ['xx', '12:00', false],
  ])('%s - %s → %s', (inicio, fin, esperado) => {
    expect(LogicMatching.esHorarioLaboralValido(inicio, fin)).toBe(esperado)
  })
})

describe('LogicMatching.isoSemana / rangoSemana', () => {
  it('calcula la semana ISO (el 1 de enero de 2021 pertenece a 2020-W53)', () => {
    expect(LogicMatching.isoSemana(new Date(2021, 0, 1))).toBe('2020-W53')
    expect(LogicMatching.isoSemana(new Date(2030, 0, 14))).toBe('2030-W03')
  })

  it('formatea el rango lunes–domingo de una semana', () => {
    expect(LogicMatching.rangoSemana('2030-W03')).toBe('14–20 ene 2030')
  })

  it('formatea rangos que cruzan de mes y de año', () => {
    expect(LogicMatching.rangoSemana('2030-W05')).toBe('28 ene–3 feb 2030')
    expect(LogicMatching.rangoSemana('2020-W53')).toBe('28 dic 2020–3 ene 2021')
  })
})
