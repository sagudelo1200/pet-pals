/* eslint-env jest */
import {
  calcularCompletitud,
  listaParaPaseo,
} from '@/logic/mascotas/calcularCompletitud'
import type { Mascota } from '@/models/Mascota'

const mascota = (extra: Partial<Mascota> = {}) =>
  ({ nombre: 'Luna', especie: 'perro', activo: true, ...extra }) as Mascota

describe('listaParaPaseo (lo mínimo para pedir un paseo)', () => {
  it('con nombre y tamaño está lista, sin importar lo demás', () => {
    expect(listaParaPaseo(mascota({ tamano: 'mediano' }))).toBe(true)
  })

  it('sin tamaño no está lista', () => {
    expect(listaParaPaseo(mascota())).toBe(false)
  })

  it('sin nombre (o con nombre en blanco) no está lista', () => {
    expect(listaParaPaseo(mascota({ nombre: '', tamano: 'grande' }))).toBe(false)
    expect(listaParaPaseo(mascota({ nombre: '   ', tamano: 'grande' }))).toBe(false)
  })
})

describe('calcularCompletitud y la mascota lista para pasear', () => {
  it('recién creada con nombre y tamaño ya puede pedir paseos', () => {
    const c = calcularCompletitud(mascota({ tamano: 'pequeño' }))
    expect(c.listaParaPaseo).toBe(true)
    expect(c.nivel).toBeGreaterThanOrEqual(2)
    expect(c.readiness).not.toBe('incompleto')
  })

  it('saltarse foto, raza y edad ya no la deja bloqueada', () => {
    const c = calcularCompletitud(
      mascota({ tamano: 'gigante', foto: undefined, raza: undefined })
    )
    expect(c.nivel).toBeGreaterThanOrEqual(2)
  })

  it('sin tamaño sigue bloqueada aunque el porcentaje pase de 25 %', () => {
    const c = calcularCompletitud(
      mascota({
        foto: 'f',
        raza: 'criollo',
        fecha_nacimiento: new Date(2020, 1, 1),
        genero: 'hembra',
        peso: 10,
        nivel_energia: 'medio',
        socializacion: 'alto',
        ansiedad: 'bajo',
        reactividad: 'bajo',
      } as Partial<Mascota>)
    )
    expect(c.porcentaje).toBeGreaterThanOrEqual(25)
    expect(c.listaParaPaseo).toBe(false)
    expect(c.nivel).toBe(1)
    expect(c.readiness).toBe('incompleto')
  })

  it('el porcentaje sigue sumando campos: más datos, más nivel', () => {
    const base = calcularCompletitud(mascota({ tamano: 'mediano' }))
    const mas = calcularCompletitud(
      mascota({
        tamano: 'mediano',
        foto: 'f',
        raza: 'criollo',
        fecha_nacimiento: new Date(2020, 1, 1),
        genero: 'macho',
        peso: 12,
        nivel_energia: 'alto',
        socializacion: 'alto',
        ansiedad: 'bajo',
        reactividad: 'bajo',
        esterilizado: true,
        vacunas: [{ nombre: 'Rabia', fecha: new Date() }],
        condiciones_salud: ['ninguna'],
        alergias: ['ninguna'],
        medicamentos: ['ninguno'],
      } as Partial<Mascota>)
    )
    expect(mas.porcentaje).toBeGreaterThan(base.porcentaje)
    expect(mas.nivel).toBe(4)
    expect(mas.readiness).toBe('completo')
  })
})
