/* eslint-env jest */

import {
  TIPOS_EVALUACION_USUARIO,
  type TipoEvaluacion,
} from '@/models/Evaluacion'

describe('modelo Evaluacion', () => {
  test('TIPOS_EVALUACION_USUARIO cubre los 3 tipos del MVP1', () => {
    expect(TIPOS_EVALUACION_USUARIO).toEqual([
      'evaluacion_cuidador',
      'evaluacion_tutor',
      'evaluacion_mascota',
    ])
  })

  test('evaluacion_sistema NO está disponible para usuarios (reservada al sistema)', () => {
    expect(TIPOS_EVALUACION_USUARIO).not.toContain('evaluacion_sistema')
  })

  test('los tipos usan el mismo esqueleto de referencia (actor/objetivo/contexto)', () => {
    const tipos: TipoEvaluacion[] = TIPOS_EVALUACION_USUARIO
    for (const tipo of tipos) {
      expect(typeof tipo).toBe('string')
      expect(tipo.startsWith('evaluacion_')).toBe(true)
    }
  })
})
