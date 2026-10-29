import {
  ESTADOS_COLA,
  ETIQUETA_ESTADO,
  ETIQUETA_REQUISITO,
  VARIANTE_ESTADO,
  VARIANTE_REQUISITO,
  decisionExigeMotivo,
  describirMovimiento,
  etiquetaDecision,
  fechaCorta,
  fechaHoraCorta,
  ordenarCola,
  porRevisar,
} from '../presentacion'
import {
  ESTADOS_HABILITACION,
  ESTADOS_REQUISITO,
} from '@/functions/src/compartido/habilitacion'
import type { Habilitacion } from '@/models/Habilitacion'

const hab = (id: string, extra: Partial<Habilitacion> = {}): Habilitacion => ({
  id,
  usuario_id: id,
  servicio: 'paseo',
  estado: 'EN_REVISION',
  motivo: null,
  requisitos: {},
  ...extra,
})

describe('textos y colores', () => {
  test('cada estado de habilitación y de requisito tiene etiqueta y color', () => {
    for (const e of ESTADOS_HABILITACION) {
      expect(ETIQUETA_ESTADO[e]).toBeTruthy()
      expect(VARIANTE_ESTADO[e]).toBeTruthy()
    }
    for (const e of ESTADOS_REQUISITO) {
      expect(ETIQUETA_REQUISITO[e]).toBeTruthy()
      expect(VARIANTE_REQUISITO[e]).toBeTruthy()
    }
  })

  test('la cola ofrece todos los estados, empezando por lo que espera revisión', () => {
    expect(ESTADOS_COLA[0]).toBe('EN_REVISION')
    expect([...ESTADOS_COLA].sort()).toEqual([...ESTADOS_HABILITACION].sort())
  })
})

describe('decisiones del equipo', () => {
  test('reabrir desde la revisión se llama devolver', () => {
    expect(etiquetaDecision('EN_REVISION', 'REABRIR')).toBe('Devolver para corregir')
    expect(etiquetaDecision('RECHAZADA', 'REABRIR')).toBe('Reabrir')
    expect(etiquetaDecision('APROBADA', 'SUSPENDER')).toBe('Suspender')
    expect(etiquetaDecision('SUSPENDIDA', 'REACTIVAR')).toBe('Reactivar')
    expect(etiquetaDecision('EN_REVISION', 'RECHAZAR')).toBe('Rechazar')
  })

  test('devolver, rechazar y suspender piden motivo; reactivar y reabrir no', () => {
    expect(decisionExigeMotivo('EN_REVISION', 'REABRIR')).toBe(true)
    expect(decisionExigeMotivo('EN_REVISION', 'RECHAZAR')).toBe(true)
    expect(decisionExigeMotivo('APROBADA', 'SUSPENDER')).toBe(true)
    expect(decisionExigeMotivo('SUSPENDIDA', 'REACTIVAR')).toBe(false)
    expect(decisionExigeMotivo('RECHAZADA', 'REABRIR')).toBe(false)
  })
})

describe('porRevisar', () => {
  test('solo los requisitos en revisión', () => {
    expect(
      porRevisar(
        hab('a', {
          requisitos: {
            email: { estado: 'VERIFICADO' },
            identidad: { estado: 'EN_REVISION' },
            antecedentes: { estado: 'EN_REVISION' },
            otro: { estado: 'RECHAZADO' },
          },
        })
      )
    ).toEqual(['identidad', 'antecedentes'])
    expect(porRevisar(hab('b'))).toEqual([])
  })
})

describe('ordenarCola', () => {
  const a = hab('a', { actualizado_en: new Date(2026, 0, 1) })
  const b = hab('b', { actualizado_en: new Date(2026, 0, 3) })
  const c = hab('c', { actualizado_en: new Date(2026, 0, 2) })
  const sinFecha = hab('d')

  test('lo que espera revisión: la más antigua primero', () => {
    expect(ordenarCola([b, a, c], 'EN_REVISION').map(h => h.id)).toEqual([
      'a',
      'c',
      'b',
    ])
  })

  test('el resto: lo más reciente primero', () => {
    expect(ordenarCola([a, b, c], 'APROBADA').map(h => h.id)).toEqual([
      'b',
      'c',
      'a',
    ])
  })

  test('no modifica la lista recibida y tolera fechas ausentes', () => {
    const lista = [b, sinFecha, a]
    ordenarCola(lista, 'EN_REVISION')
    expect(lista.map(h => h.id)).toEqual(['b', 'd', 'a'])
    expect(ordenarCola(lista, 'EN_REVISION')[0].id).toBe('d')
  })
})

describe('fechaCorta', () => {
  test('dd/mm/aaaa', () => {
    expect(fechaCorta(new Date(2027, 9, 5))).toBe('05/10/2027')
    expect(fechaCorta(null)).toBe('')
    expect(fechaCorta(undefined)).toBe('')
  })
})

describe('historial legible', () => {
  const entrada = (extra: Record<string, unknown>) => ({
    id: 'h1',
    de: 'PENDIENTE',
    a: 'EN_REVISION',
    autor: 'ana',
    ...extra,
  })

  test('un requisito cuenta lo que le pasó y quién lo hizo', () => {
    expect(describirMovimiento(entrada({ requisito: 'identidad' }), 'ana')).toEqual({
      clave: 'requisito_en_revision', conRequisito: true, tono: 'alerta', quien: 'persona',
    })
    expect(
      describirMovimiento(entrada({ requisito: 'identidad', a: 'VERIFICADO', autor: 'admin1' }), 'ana')
    ).toMatchObject({ clave: 'requisito_verificado', tono: 'exito', quien: 'equipo' })
    expect(
      describirMovimiento(entrada({ requisito: 'email', a: 'VERIFICADO', autor: 'sistema' }), 'ana')
    ).toMatchObject({ quien: 'sistema' })
    expect(
      describirMovimiento(entrada({ requisito: 'antecedentes', a: 'RECHAZADO', autor: 'admin1' }), 'ana')
    ).toMatchObject({ clave: 'requisito_rechazado', tono: 'error' })
  })

  test('la habilitación distingue enviar, aprobar, devolver, renovar y reactivar', () => {
    const clave = (de: string, a: string, autor = 'admin1') =>
      describirMovimiento(entrada({ de, a, autor }), 'ana').clave
    expect(clave('BORRADOR', 'EN_REVISION', 'ana')).toBe('enviada')
    expect(clave('EN_REVISION', 'APROBADA')).toBe('aprobada')
    expect(clave('SUSPENDIDA', 'APROBADA')).toBe('reactivada')
    expect(clave('EN_REVISION', 'BORRADOR')).toBe('devuelta')
    expect(clave('APROBADA', 'BORRADOR', 'sistema')).toBe('renovacion')
    expect(clave('RECHAZADA', 'BORRADOR')).toBe('reabierta')
    expect(clave('EN_REVISION', 'RECHAZADA')).toBe('rechazada')
    expect(clave('APROBADA', 'SUSPENDIDA')).toBe('suspendida')
  })

  test('un estado desconocido no rompe la lista', () => {
    expect(describirMovimiento(entrada({ a: 'RARO' }), 'ana').clave).toBe('otro')
    expect(describirMovimiento(entrada({ requisito: 'x', a: 'RARO' }), 'ana').clave).toBe('requisito_otro')
  })

  test('fechaHoraCorta suma la hora en 24 h', () => {
    expect(fechaHoraCorta(new Date(2026, 9, 29, 13, 5))).toBe('29/10/2026 · 13:05')
    expect(fechaHoraCorta(undefined)).toBe('')
  })
})
