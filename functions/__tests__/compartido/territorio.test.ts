/**
 * Territorio: estado de una celda, operativa e índices de inteligencia.
 */
import {
  NARRATIVA_VACIA,
  armarOperativa,
  calcularIndices,
  estadoDeCelda,
  sumarEvento,
} from '../../src/compartido/territorio';

describe('estadoDeCelda', () => {
  const c = (cuidadores_count: number, demanda_total: number, paseos_activos = 0) =>
    estadoDeCelda({cuidadores_count, demanda_total, paseos_activos});

  test('un paseo en curso manda sobre todo', () => {
    expect(c(0, 0, 1)).toBe('en_operacion');
    expect(c(5, 3, 2)).toBe('en_operacion');
  });

  test('sin cuidadores ni pedidos: sin actividad', () => {
    expect(c(0, 0)).toBe('sin_actividad');
  });

  test('pedidos sin cuidadores: sin cobertura', () => {
    expect(c(0, 4)).toBe('sin_cobertura');
  });

  test('cuidadores sin pedidos: disponible', () => {
    expect(c(3, 0)).toBe('disponible');
  });

  test('cuidadores y pedidos: activa', () => {
    expect(c(3, 2)).toBe('activa');
  });
});

describe('armarOperativa', () => {
  test('agrega estado y ratio de cobertura', () => {
    expect(armarOperativa({
      cuidadores_count: 4, demanda_total: 2, paseos_activos: 0, paseos_total: 10,
    })).toEqual({
      cuidadores_count: 4,
      demanda_total: 2,
      paseos_activos: 0,
      paseos_total: 10,
      estado: 'activa',
      ratio_cobertura: 2,
    });
  });

  test('con demanda 0 el ratio no divide por cero', () => {
    expect(armarOperativa({
      cuidadores_count: 3, demanda_total: 0, paseos_activos: 0, paseos_total: 0,
    }).ratio_cobertura).toBe(3);
  });
});

describe('calcularIndices', () => {
  test('juego, agua y descanso suben el bienestar; el juego pesa más', () => {
    const alto = calcularIndices({juego: 6, agua: 3, descanso: 1});
    const bajo = calcularIndices({otro: 10});
    expect(alto.bienestar).toBeGreaterThan(80);
    expect(bajo.bienestar).toBe(0);
    expect(calcularIndices({juego: 1}).bienestar).toBe(100);
    expect(calcularIndices({agua: 1}).bienestar).toBe(75);
  });

  test('un parque o conjunto es más seguro que un lugar desconocido', () => {
    const parque = calcularIndices({juego: 2}, 'parque');
    const otro = calcularIndices({juego: 2}, 'otro');
    expect(parque.seguridad).toBeGreaterThan(otro.seguridad);
  });

  test('sin eventos no divide por cero', () => {
    expect(calcularIndices({})).toEqual({
      bienestar: 0, seguridad: 70, actividad: 1, socializacion: 0,
    });
  });

  test('los índices siempre quedan entre 0 y 100', () => {
    for (const eventos of [{juego: 500, socializacion: 500}, {socializacion: 20}, {}]) {
      for (const valor of Object.values(calcularIndices(eventos, 'parque'))) {
        expect(valor).toBeGreaterThanOrEqual(0);
        expect(valor).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('sumarEvento', () => {
  test('el primer evento parte de la narrativa vacía', () => {
    const n = sumarEvento(undefined, 'juego');
    expect(n.total_eventos).toBe(1);
    expect(n.eventos_por_tipo).toEqual({juego: 1});
    expect(n.identidad).toEqual(NARRATIVA_VACIA.identidad);
    expect(n.indices.bienestar).toBe(100); // todo juego
  });

  test('suma por tipo y recalcula los índices', () => {
    let n = sumarEvento(undefined, 'juego');
    n = sumarEvento(n, 'juego');
    n = sumarEvento(n, 'agua');
    expect(n.total_eventos).toBe(3);
    expect(n.eventos_por_tipo).toEqual({juego: 2, agua: 1});
    expect(n.indices).toEqual(calcularIndices({juego: 2, agua: 1}, 'otro'));
  });

  test('no modifica la narrativa recibida', () => {
    const antes = sumarEvento(undefined, 'juego');
    const copia = JSON.stringify(antes);
    sumarEvento(antes, 'agua');
    expect(JSON.stringify(antes)).toBe(copia);
    expect(NARRATIVA_VACIA.total_eventos).toBe(0);
  });
});
