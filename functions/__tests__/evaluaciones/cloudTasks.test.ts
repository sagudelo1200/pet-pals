/**
 * Tests del plazo ALEATORIO de revelación (Cloud Task, sin polling).
 */

jest.mock('@google-cloud/tasks', () => ({
  CloudTasksClient: jest.fn(),
}));

import {
  DIAS_POSIBLES_REVELACION,
  elegirDelayRevelacion,
} from '../../src/evaluaciones/cloudTasks';

describe('cloudTasks (plazo aleatorio de revelación)', () => {
  test('los plazos posibles son 6, 9 y 12 días', () => {
    expect(DIAS_POSIBLES_REVELACION).toEqual([6, 9, 12]);
  });

  test('elegirDelayRevelacion siempre devuelve 6, 9 o 12 días', () => {
    const diasValidos = DIAS_POSIBLES_REVELACION.map((d) => d * 24 * 60 * 60 * 1000);
    for (let i = 0; i < 100; i++) {
      const delay = elegirDelayRevelacion();
      expect(diasValidos).toContain(delay);
    }
  });

  test('el aleatorio usa los tres plazos (no siempre el mismo)', () => {
    const obtenidos = new Set<number>();
    for (let i = 0; i < 60; i++) {
      obtenidos.add(elegirDelayRevelacion() / (24 * 60 * 60 * 1000));
    }
    // Con 60 muestras la probabilidad de no ver los 3 es despreciable
    expect(obtenidos.size).toBe(3);
  });
});
