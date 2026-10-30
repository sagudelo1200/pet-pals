/**
 * Territorio: estado de una celda, operativa e índices de inteligencia.
 */
import {
  MOMENTOS_CON_CATEGORIA,
  MOMENTOS_DE_LUGAR,
  NARRATIVA_VACIA,
  armarOperativa,
  calcularIndices,
  conteoPorCategoria,
  esSeveridad,
  estadoDeCelda,
  identidadDe,
  sumarEvento,
  sumarIncidente,
} from '../../src/compartido/territorio';
import {momentoPorClave} from '../../src/compartido/expediente';

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

describe('claves reales de los momentos', () => {
  test('todas las claves que cuentan existen en el catálogo de momentos', () => {
    for (const clave of [...MOMENTOS_CON_CATEGORIA, ...MOMENTOS_DE_LUGAR]) {
      expect(momentoPorClave(clave)).toBeDefined();
    }
  });

  test('un paseo con juego, agua, descanso y saludos sube bienestar y socialización', () => {
    const real = calcularIndices({
      'como_esta.jugo': 5,
      'necesidades.tomo_agua': 3,
      'como_esta.descanso': 2,
      'como_esta.saludo_a_otros_perros': 4,
    }, 'parque');
    expect(real.bienestar).toBeGreaterThan(50);
    expect(real.socializacion).toBeGreaterThan(20);
    // los mismos momentos con las claves de categoría dan el mismo resultado
    expect(real).toEqual(calcularIndices(
      {juego: 5, agua: 3, descanso: 2, socializacion: 4}, 'parque'));
  });

  test('los momentos que no son de ninguna categoría cuentan en el total, no suben nada', () => {
    const solo = calcularIndices({'como_esta.se_ve_contento': 4});
    expect(solo.bienestar).toBe(0);
    expect(solo.socializacion).toBe(0);
  });

  test('conteoPorCategoria agrupa varios momentos en una categoría', () => {
    expect(conteoPorCategoria({
      'como_esta.jugo': 2, 'como_esta.corrio': 3, 'necesidades.tomo_agua': 1,
      'como_esta.saludo_a_personas': 1, 'como_esta.saludo_a_otros_perros': 1,
    })).toEqual({juego: 5, agua: 1, descanso: 0, socializacion: 2});
  });
});

describe('identidadDe (qué lugar es)', () => {
  const vacia = NARRATIVA_VACIA.identidad;

  test('sin momentos de lugar queda la identidad que tenía', () => {
    expect(identidadDe({'como_esta.jugo': 3}, vacia)).toBe(vacia);
  });

  test('el lugar que domina clasifica la celda y gana confianza con más registros', () => {
    const uno = identidadDe({'lugar_y_ambiente.lugar_parque': 1}, vacia);
    const tres = identidadDe({'lugar_y_ambiente.lugar_parque': 3}, vacia);
    expect(uno).toMatchObject({tipo: 'parque', fuente: 'paseo'});
    expect(tres.confianza).toBeGreaterThan(uno.confianza);
    expect(identidadDe({'lugar_y_ambiente.lugar_zona_residencial': 2}, vacia).tipo)
      .toBe('conjunto');
  });

  test('varios parques distintos siguen siendo un parque', () => {
    expect(identidadDe({
      'lugar_y_ambiente.lugar_parque': 1, 'lugar_y_ambiente.lugar_sendero': 1,
    }, vacia).tipo).toBe('parque');
  });

  test('si ningún lugar domina, es mixto', () => {
    expect(identidadDe({
      'lugar_y_ambiente.lugar_parque': 1,
      'lugar_y_ambiente.lugar_zona_residencial': 1,
    }, vacia).tipo).toBe('mixto');
  });

  test('sumarEvento actualiza la identidad y con ella la seguridad', () => {
    const n = sumarEvento(undefined, 'lugar_y_ambiente.lugar_parque');
    expect(n.identidad.tipo).toBe('parque');
    expect(n.indices.seguridad).toBe(calcularIndices(n.eventos_por_tipo, 'parque').seguridad);
  });
});

describe('incidentes', () => {
  test('bajan la seguridad según su gravedad, sin pasar de 0', () => {
    const base = calcularIndices({}, 'parque').seguridad;
    expect(calcularIndices({}, 'parque', {baja: 1}).seguridad).toBe(base - 5);
    expect(calcularIndices({}, 'parque', {media: 1}).seguridad).toBe(base - 15);
    expect(calcularIndices({}, 'parque', {critica: 1}).seguridad).toBe(base - 30);
    expect(calcularIndices({}, 'parque', {critica: 9}).seguridad).toBe(0);
  });

  test('sumarIncidente los cuenta por gravedad y recalcula la seguridad', () => {
    let n = sumarIncidente(undefined, 'media');
    n = sumarIncidente(n, 'media');
    n = sumarIncidente(n, 'critica');
    expect(n.incidentes).toEqual({media: 2, critica: 1});
    expect(n.total_eventos).toBe(0);
    expect(n.indices.seguridad).toBe(calcularIndices({}, 'otro', {media: 2, critica: 1}).seguridad);
  });

  test('un momento posterior no borra los incidentes ni su efecto', () => {
    const n = sumarEvento(sumarIncidente(undefined, 'critica'), 'como_esta.jugo');
    expect(n.incidentes).toEqual({critica: 1});
    expect(n.indices.seguridad).toBe(
      calcularIndices({'como_esta.jugo': 1}, 'otro', {critica: 1}).seguridad);
  });

  test('esSeveridad reconoce solo las tres gravedades', () => {
    expect(['baja', 'media', 'critica'].every(esSeveridad)).toBe(true);
    expect(esSeveridad('grave')).toBe(false);
    expect(esSeveridad(undefined)).toBe(false);
  });
});
