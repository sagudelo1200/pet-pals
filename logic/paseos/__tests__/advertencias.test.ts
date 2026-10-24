/* eslint-env jest */
import { textoDeAdvertencia, textoDeAdvertencias } from '../advertencias'
import type { Advertencia } from '@/functions/src/compartido/emparejamiento'

// t de prueba: devuelve la clave y los parámetros para ver qué se pidió
const t = ((clave: string, params?: Record<string, unknown>) =>
  params ? `${clave}|${JSON.stringify(params)}` : clave) as any

describe('textoDeAdvertencia', () => {
  it('tamaño: nombra las mascotas y cambia según quién lee', () => {
    const aviso: Advertencia = { tipo: 'tamano', mascotas: ['Rocky', 'Luna'] }
    expect(textoDeAdvertencia(aviso, t, 'tutor')).toBe(
      'paseos:advertencias.tutor.tamano|{"mascotas":"Rocky, Luna"}'
    )
    expect(textoDeAdvertencia(aviso, t, 'cuidador')).toBe(
      'paseos:advertencias.cuidador.tamano|{"mascotas":"Rocky, Luna"}'
    )
  })

  it('cupo: singular con 1 perro, plural con más', () => {
    expect(textoDeAdvertencia({ tipo: 'cupo', cupo: 1 }, t, 'tutor')).toBe(
      'paseos:advertencias.tutor.cupo_uno'
    )
    expect(textoDeAdvertencia({ tipo: 'cupo', cupo: 3 }, t, 'cuidador')).toBe(
      'paseos:advertencias.cuidador.cupo_otros|{"cupo":3}'
    )
  })

  it('varias se unen en un solo texto', () => {
    const texto = textoDeAdvertencias(
      [
        { tipo: 'tamano', mascotas: ['Rocky'] },
        { tipo: 'cupo', cupo: 2 },
      ],
      t,
      'tutor'
    )
    expect(texto).toBe(
      'paseos:advertencias.tutor.tamano|{"mascotas":"Rocky"}. ' +
        'paseos:advertencias.tutor.cupo_otros|{"cupo":2}'
    )
  })

  it('sin advertencias, texto vacío', () => {
    expect(textoDeAdvertencias([], t, 'tutor')).toBe('')
  })
})
