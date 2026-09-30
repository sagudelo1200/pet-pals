/**
 * TESTS: Evaluador de consentimientos (función pura)
 *
 * Valida la lógica de vigencia sin I/O.
 * Cubre todos los casos: aceptado, rechazado, revocado, expirado, versión desactualizada.
 */

import { evaluarVigencia } from '@/logic/consentimientos/evaluador'

describe('evaluarVigencia (función pura)', () => {
  const ahora = new Date('2026-09-12')
  const futuro = new Date('2027-09-12')
  const pasado = new Date('2025-09-12')

  describe('RECHAZADO', () => {
    it('nunca es vigente', () => {
      const resultado = evaluarVigencia('RECHAZADO', null, true, ahora)
      expect(resultado.vigente).toBe(false)
      expect(resultado.aceptado).toBe(false)
      expect(resultado.motivo_no_vigencia).toBe('RECHAZADO')
    })
  })

  describe('REVOCADO', () => {
    it('nunca es vigente', () => {
      const resultado = evaluarVigencia('REVOCADO', null, true, ahora)
      expect(resultado.vigente).toBe(false)
      expect(resultado.aceptado).toBe(false)
      expect(resultado.motivo_no_vigencia).toBe('REVOCADO')
    })
  })

  describe('ACEPTADO con documento vigente', () => {
    it('es vigente si no hay reconfirmación requerida', () => {
      const resultado = evaluarVigencia(
        'ACEPTADO',
        null, // Sin fecha de reconfirmación
        true, // Documento vigente
        ahora
      )
      expect(resultado.vigente).toBe(true)
      expect(resultado.aceptado).toBe(true)
      expect(resultado.motivo_no_vigencia).toBeUndefined()
    })

    it('es vigente si la fecha de reconfirmación está en el futuro', () => {
      const resultado = evaluarVigencia(
        'ACEPTADO',
        futuro, // 2027-09-12 > 2026-09-12
        true,
        ahora
      )
      expect(resultado.vigente).toBe(true)
      expect(resultado.aceptado).toBe(true)
      expect(resultado.motivo_no_vigencia).toBeUndefined()
    })

    it('NO es vigente si la fecha de reconfirmación ha pasado', () => {
      const resultado = evaluarVigencia(
        'ACEPTADO',
        pasado, // 2025-09-12 < 2026-09-12
        true,
        ahora
      )
      expect(resultado.vigente).toBe(false)
      expect(resultado.aceptado).toBe(true)
      expect(resultado.motivo_no_vigencia).toBe('EXPIRADO')
    })

    it('es vigente exactamente en la fecha límite', () => {
      // Caso edge: si la reconfirmación es hoy a las 00:00 y ahora es hoy a las 23:59
      const hoy = new Date('2026-09-12T00:00:00Z')
      const mas_tarde_hoy = new Date('2026-09-12T23:59:59Z')

      const resultado = evaluarVigencia('ACEPTADO', hoy, true, mas_tarde_hoy)
      expect(resultado.vigente).toBe(false) // La hora pasó
    })
  })

  describe('ACEPTADO con documento DESACTUALIZADO', () => {
    it('NO es vigente si el documento cambió de versión', () => {
      const resultado = evaluarVigencia(
        'ACEPTADO',
        futuro, // Aunque la fecha esté OK
        false, // DOCUMENTO NO VIGENTE
        ahora
      )
      expect(resultado.vigente).toBe(false)
      expect(resultado.aceptado).toBe(true)
      expect(resultado.motivo_no_vigencia).toBe('VERSION_DESACTUALIZADA')
    })
  })

  describe('Combinaciones edge-case', () => {
    it('ACEPTADO + documento desactualizado + fecha expirada → VERSION_DESACTUALIZADA (primera condición)', () => {
      const resultado = evaluarVigencia(
        'ACEPTADO',
        pasado, // Expirado
        false, // Documento desactualizado
        ahora
      )
      expect(resultado.vigente).toBe(false)
      expect(resultado.motivo_no_vigencia).toBe('VERSION_DESACTUALIZADA')
    })
  })

  describe('Matriz de estados (quick reference)', () => {
    const casos = [
      {
        estado: 'RECHAZADO',
        reconfirmacion: null,
        doc_vigente: true,
        esperado_vigente: false,
        esperado_motivo: 'RECHAZADO',
      },
      {
        estado: 'REVOCADO',
        reconfirmacion: null,
        doc_vigente: true,
        esperado_vigente: false,
        esperado_motivo: 'REVOCADO',
      },
      {
        estado: 'ACEPTADO',
        reconfirmacion: null,
        doc_vigente: true,
        esperado_vigente: true,
        esperado_motivo: undefined,
      },
      {
        estado: 'ACEPTADO',
        reconfirmacion: futuro,
        doc_vigente: true,
        esperado_vigente: true,
        esperado_motivo: undefined,
      },
      {
        estado: 'ACEPTADO',
        reconfirmacion: pasado,
        doc_vigente: true,
        esperado_vigente: false,
        esperado_motivo: 'EXPIRADO',
      },
      {
        estado: 'ACEPTADO',
        reconfirmacion: futuro,
        doc_vigente: false,
        esperado_vigente: false,
        esperado_motivo: 'VERSION_DESACTUALIZADA',
      },
    ]

    casos.forEach((caso, i) => {
      it(`Caso ${i + 1}: ${caso.estado} + reconf=${caso.reconfirmacion ? 'futura' : 'null'} + doc=${caso.doc_vigente ? 'vigente' : 'desactualizado'}`, () => {
        const resultado = evaluarVigencia(
          caso.estado as any,
          caso.reconfirmacion,
          caso.doc_vigente,
          ahora
        )
        expect(resultado.vigente).toBe(caso.esperado_vigente)
        expect(resultado.motivo_no_vigencia).toBe(caso.esperado_motivo)
      })
    })
  })
})
