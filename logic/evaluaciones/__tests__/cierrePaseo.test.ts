import { observacionCompleta, planDeCierre, yaRegistrado } from '../cierrePaseo'

const COMPLETA = { ritmo: 'tranquilo', compania: 'confiado', tolerancia: 'neutro' }

describe('planDeCierre', () => {
  test('sin marcar nada no se envía nada: terminar es válido', () => {
    expect(planDeCierre({ observaciones: {}, ratingTutor: 0 }, ['m1'])).toEqual({
      observar: [],
      incompletas: [],
      evaluarTutor: false,
    })
  })

  test('una mascota con los tres ejes se registra; con menos, queda incompleta', () => {
    const plan = planDeCierre(
      { observaciones: { m1: COMPLETA, m2: { ritmo: 'normal' } }, ratingTutor: 0 },
      ['m1', 'm2', 'm3']
    )
    expect(plan.observar).toEqual(['m1'])
    expect(plan.incompletas).toEqual(['m2'])
  })

  test('el tutor se califica con 1 a 5 estrellas', () => {
    const con = (ratingTutor: number) =>
      planDeCierre({ observaciones: {}, ratingTutor }, []).evaluarTutor
    expect(con(0)).toBe(false)
    expect(con(1)).toBe(true)
    expect(con(5)).toBe(true)
    expect(con(6)).toBe(false)
  })

  test('solo cuentan las mascotas del paseo', () => {
    const plan = planDeCierre({ observaciones: { otra: COMPLETA }, ratingTutor: 0 }, ['m1'])
    expect(plan.observar).toEqual([])
  })
})

describe('observacionCompleta', () => {
  test('exige los tres ejes con opciones válidas', () => {
    expect(observacionCompleta(COMPLETA)).toBe(true)
    expect(observacionCompleta({ ...COMPLETA, ritmo: 'inventado' })).toBe(false)
    expect(observacionCompleta({ ritmo: 'normal' })).toBe(false)
    expect(observacionCompleta(undefined)).toBe(false)
  })
})

describe('yaRegistrado', () => {
  test('reconoce el error de registro existente, con o sin prefijo', () => {
    expect(yaRegistrado({ code: 'functions/already-exists' })).toBe(true)
    expect(yaRegistrado({ code: 'already-exists' })).toBe(true)
    expect(yaRegistrado({ code: 'permission-denied' })).toBe(false)
    expect(yaRegistrado(null)).toBe(false)
  })
})
