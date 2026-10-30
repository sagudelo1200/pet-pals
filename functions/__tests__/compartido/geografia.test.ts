/**
 * Geografía: roles de resolución y utilidades de celdas.
 */
import {
  MAX_CELDAS_COBERTURA,
  RADIOS_COBERTURA,
  RADIO_COBERTURA,
  RESOLUCIONES,
  celdaDe,
  celdasAlrededor,
  celdasDeCoberturaDe,
  distanciaKmEntreCeldas,
  distanciaMetros,
  errorDeCobertura,
  esCeldaValida,
  padreDe,
  radioDeCobertura,
  resolucionDe,
} from '../../src/compartido/geografia';

const LAT = 4.6486;
const LNG = -74.0628;

describe('roles de resolución', () => {
  test('cada rol tiene su escala', () => {
    expect(RESOLUCIONES).toEqual({macro: 7, cobertura: 8, micro: 9});
  });

  test('por defecto la celda es la de cobertura', () => {
    expect(resolucionDe(celdaDe(LAT, LNG))).toBe(8);
    expect(resolucionDe(celdaDe(LAT, LNG, 'cobertura'))).toBe(8);
    expect(resolucionDe(celdaDe(LAT, LNG, 'micro'))).toBe(9);
    expect(resolucionDe(celdaDe(LAT, LNG, 'macro'))).toBe(7);
  });

  test('la misma celda no se confunde entre escalas: el id lleva la resolución', () => {
    const ids = new Set([
      celdaDe(LAT, LNG, 'macro'),
      celdaDe(LAT, LNG, 'cobertura'),
      celdaDe(LAT, LNG, 'micro'),
    ]);
    expect(ids.size).toBe(3);
  });
});

describe('padreDe', () => {
  const micro = celdaDe(LAT, LNG, 'micro');

  test('sube por la jerarquía hasta la escala del rol', () => {
    expect(padreDe(micro, 'cobertura')).toBe(celdaDe(LAT, LNG, 'cobertura'));
    expect(padreDe(micro, 'macro')).toBe(celdaDe(LAT, LNG, 'macro'));
  });

  test('si ya está en esa escala devuelve la misma', () => {
    expect(padreDe(micro, 'micro')).toBe(micro);
  });

  test('no se puede "subir" a una escala más fina', () => {
    expect(() => padreDe(celdaDe(LAT, LNG, 'macro'), 'micro')).toThrow(/más gruesa/);
  });
});

describe('cobertura de un cuidador', () => {
  const origen = celdaDe(LAT, LNG);

  test('sin celdas manuales, el vecindario de su origen', () => {
    const celdas = celdasDeCoberturaDe({h3_r8: origen});
    expect(celdas).toHaveLength(19); // k=2
    expect(celdas).toContain(origen);
    expect(new Set(celdas)).toEqual(new Set(celdasAlrededor(origen, RADIO_COBERTURA)));
  });

  test('las celdas elegidas a mano reemplazan al vecindario', () => {
    const [a, b] = celdasAlrededor(origen, 1).filter((c) => c !== origen);
    expect(celdasDeCoberturaDe({h3_r8: origen, celdas_cobertura: [a, b]}, true))
      .toEqual([a, b]);
  });

  test('con el modo manual apagado (por defecto) las celdas a mano no cuentan', () => {
    const [a] = celdasAlrededor(origen, 1).filter((c) => c !== origen);
    const perfil = {h3_r8: origen, celdas_cobertura: [a]};
    expect(celdasDeCoberturaDe(perfil)).toHaveLength(19);
    expect(celdasDeCoberturaDe(perfil, false)).toHaveLength(19);
  });

  test('el radio elegido define el vecindario: 1 → 7 celdas, 2 → 19', () => {
    expect(celdasDeCoberturaDe({h3_r8: origen, radio_cobertura: 1})).toHaveLength(7);
    expect(celdasDeCoberturaDe({h3_r8: origen, radio_cobertura: 2})).toHaveLength(19);
    expect(new Set(celdasDeCoberturaDe({h3_r8: origen, radio_cobertura: 1})))
      .toEqual(new Set(celdasAlrededor(origen, 1)));
  });

  test('un radio que no existe vale como el normal', () => {
    for (const radio of [0, 3, 1.5, '2', null, undefined]) {
      expect(celdasDeCoberturaDe({h3_r8: origen, radio_cobertura: radio}))
        .toHaveLength(19);
    }
    expect(radioDeCobertura(1)).toBe(1);
    expect(radioDeCobertura(7)).toBe(RADIO_COBERTURA);
  });

  test('ningún radio ofrecido pasa del máximo de una consulta', () => {
    for (const r of RADIOS_COBERTURA) {
      expect(celdasAlrededor(origen, r).length).toBeLessThanOrEqual(MAX_CELDAS_COBERTURA);
    }
  });

  test('de las manuales solo sirven las válidas de escala cobertura, sin repetir', () => {
    const vecina = celdasAlrededor(origen, 1).find((c) => c !== origen) as string;
    const micro = celdaDe(LAT, LNG, 'micro');
    expect(celdasDeCoberturaDe({
      h3_r8: origen, celdas_cobertura: [vecina, vecina, 'a', micro, 7],
    }, true)).toEqual([vecina]);
    // si ninguna sirve, vuelve al vecindario
    expect(celdasDeCoberturaDe({h3_r8: origen, celdas_cobertura: ['a', 'b']}, true))
      .toHaveLength(19);
  });

  test('nunca pasa del máximo de celdas manuales', () => {
    const muchas = celdasAlrededor(origen, 4);
    expect(muchas.length).toBeGreaterThan(MAX_CELDAS_COBERTURA);
    expect(celdasDeCoberturaDe({h3_r8: origen, celdas_cobertura: muchas}, true))
      .toHaveLength(MAX_CELDAS_COBERTURA);
  });

  test('errorDeCobertura: vacía, demasiadas o inválida', () => {
    const vecinas = celdasAlrededor(origen, 1);
    expect(errorDeCobertura(vecinas)).toBeNull();
    expect(errorDeCobertura([])).toBe('vacia');
    expect(errorDeCobertura('x')).toBe('vacia');
    expect(errorDeCobertura(celdasAlrededor(origen, 4))).toBe('demasiadas');
    expect(errorDeCobertura([origen, 'a'])).toBe('invalida');
    expect(errorDeCobertura([origen, origen])).toBe('invalida');
    expect(errorDeCobertura([celdaDe(LAT, LNG, 'micro')])).toBe('invalida');
  });

  test('lista manual vacía o con basura: vuelve al vecindario', () => {
    expect(celdasDeCoberturaDe({h3_r8: origen, celdas_cobertura: []})).toHaveLength(19);
    expect(celdasDeCoberturaDe({h3_r8: origen, celdas_cobertura: [1, null]}))
      .toHaveLength(19);
  });

  test('sin ubicación no hay cobertura', () => {
    expect(celdasDeCoberturaDe({})).toEqual([]);
    expect(celdasDeCoberturaDe({h3_r8: 'no-es-una-celda'})).toEqual([]);
  });
});

describe('distancias', () => {
  test('entre celdas: 0 con ella misma y creciente con los anillos', () => {
    const origen = celdaDe(LAT, LNG);
    const vecina = celdasAlrededor(origen, 1).find((c) => c !== origen) as string;
    const lejana = celdasAlrededor(origen, 3)
      .find((c) => !celdasAlrededor(origen, 2).includes(c)) as string;
    expect(distanciaKmEntreCeldas(origen, origen)).toBe(0);
    expect(distanciaKmEntreCeldas(origen, vecina)).toBeGreaterThan(0.5);
    expect(distanciaKmEntreCeldas(origen, lejana))
      .toBeGreaterThan(distanciaKmEntreCeldas(origen, vecina));
  });

  test('en metros (Haversine): un grado de latitud ≈ 111 km', () => {
    const m = distanciaMetros({latitude: 0, longitude: 0}, {latitude: 1, longitude: 0});
    expect(m).toBeGreaterThan(111000);
    expect(m).toBeLessThan(111400);
    expect(distanciaMetros({latitude: LAT, longitude: LNG}, {latitude: LAT, longitude: LNG}))
      .toBe(0);
  });
});

describe('esCeldaValida', () => {
  test('acepta celdas reales y rechaza el resto', () => {
    expect(esCeldaValida(celdaDe(LAT, LNG))).toBe(true);
    expect(esCeldaValida('abc')).toBe(false);
    expect(esCeldaValida(undefined)).toBe(false);
    expect(esCeldaValida(8)).toBe(false);
  });
});
