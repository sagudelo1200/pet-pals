/**
 * Zonas de negocio: resolución por jerarquía y validación.
 */
import {
  MAX_CELDAS_ZONA,
  candidatasDe,
  estadoDeServicio,
  idDeInteres,
  idDeZona,
  resolverZonaId,
  validarZona,
  type EntradaCeldaZona,
} from '../../src/compartido/zonas';
import {cellToChildren, cellToParent, gridDisk} from 'h3-js';
import {celdaDe} from '../../src/compartido/geografia';

const LAT = 4.6486;
const LNG = -74.0628;
const R7 = celdaDe(LAT, LNG, 'macro');
const R8 = celdaDe(LAT, LNG, 'cobertura');
const R9 = celdaDe(LAT, LNG, 'micro');
// otro R8 dentro del mismo R7
const OTRO_R8 = cellToChildren(R7, 8).find((c) => c !== R8) as string;
const OTRO_R7 = celdaDe(4.80, -74.00, 'macro');

const mapa = (entradas: Record<string, EntradaCeldaZona>) =>
  (c: string) => entradas[c];

describe('candidatasDe', () => {
  test('de un punto fino sube por las escalas de zona, la más específica primero', () => {
    // R9 no define zonas: solo se buscan R8 y R7
    expect(candidatasDe(R9)).toEqual([R8, R7]);
  });

  test('desde cobertura o barrio, solo las escalas iguales o más gruesas', () => {
    expect(candidatasDe(R8)).toEqual([R8, R7]);
    expect(candidatasDe(R7)).toEqual([R7]);
  });
});

describe('resolverZonaId', () => {
  test('un barrio entero pertenece a su zona', () => {
    const buscar = mapa({[R7]: {zona_id: 'chico'}});
    expect(resolverZonaId(R9, buscar)).toBe('chico');
    expect(resolverZonaId(R8, buscar)).toBe('chico');
    expect(resolverZonaId(R7, buscar)).toBe('chico');
  });

  test('gana la celda más específica', () => {
    const buscar = mapa({
      [R7]: {zona_id: 'chico'},
      [R8]: {zona_id: 'chico-norte'},
    });
    expect(resolverZonaId(R9, buscar)).toBe('chico-norte');
    expect(resolverZonaId(OTRO_R8, buscar)).toBe('chico');
  });

  test('una zona más fina puede estar dentro de una ciudad entera', () => {
    const buscar = mapa({
      [R7]: {zona_id: 'bogota'},
      [R8]: {zona_id: 'parque'},
    });
    expect(resolverZonaId(R9, buscar)).toBe('parque');
    expect(resolverZonaId(OTRO_R8, buscar)).toBe('bogota');
  });

  test('un hueco devuelve "ninguna zona" aunque el barrio sí tenga dueña', () => {
    const buscar = mapa({
      [R7]: {zona_id: 'chico'},
      [OTRO_R8]: {zona_id: null, excluida_de: 'chico'},
    });
    expect(resolverZonaId(OTRO_R8, buscar)).toBeNull();
    expect(resolverZonaId(R8, buscar)).toBe('chico');
  });

  test('fuera de toda zona, ninguna', () => {
    expect(resolverZonaId(R9, mapa({[OTRO_R7]: {zona_id: 'otra'}}))).toBeNull();
    expect(resolverZonaId(R9, mapa({}))).toBeNull();
  });
});

describe('idDeZona', () => {
  test('sin tildes, en minúsculas y con guiones', () => {
    expect(idDeZona('Bogotá', 'Chicó Norte')).toBe('bogota-chico-norte');
    expect(idDeZona('Medellín', '  El  Poblado! ')).toBe('medellin-el-poblado');
  });
});

describe('validarZona', () => {
  const buena = {
    nombre: 'Chicó',
    ciudad: 'Bogotá',
    estado: 'piloto',
    celdas: [R7],
  };

  test('una zona correcta queda limpia', () => {
    const {errores, zona} = validarZona({...buena, nombre: '  Chicó  '});
    expect(errores).toEqual([]);
    expect(zona).toEqual({
      nombre: 'Chicó', ciudad: 'Bogotá', estado: 'piloto', celdas: [R7], excluidas: [],
    });
  });

  test('nombre, ciudad y estado son obligatorios y válidos', () => {
    const {errores} = validarZona({celdas: [R7]});
    expect(errores).toHaveLength(3);
    expect(validarZona({...buena, estado: 'abierta'}).errores[0]).toMatch(/estado/);
    expect(validarZona({...buena, nombre: 'ab'}).errores[0]).toMatch(/nombre/i);
  });

  test('una zona piloto o activa necesita celdas; una cerrada puede liberarlas', () => {
    expect(validarZona({...buena, celdas: []}).errores[0]).toMatch(/al menos una celda/);
    expect(validarZona({...buena, estado: 'cerrada', celdas: []}).errores).toEqual([]);
  });

  test('las celdas deben ser válidas y de una escala permitida', () => {
    expect(validarZona({...buena, celdas: ['basura']}).errores[0]).toMatch(/no es una celda válida/);
    const r6 = cellToParent(R7, 6);
    expect(validarZona({...buena, celdas: [r6]}).errores[0]).toMatch(/escala permitida/);
    // las microzonas (R9) son para lo observado, no para definir zonas
    expect(validarZona({...buena, celdas: [R9]}).errores[0]).toMatch(/escala permitida/);
    expect(validarZona({...buena, celdas: 'x'}).errores[0]).toMatch(/lista/);
  });

  test('celdas repetidas se juntan', () => {
    expect(validarZona({...buena, celdas: [R7, R7]}).zona!.celdas).toEqual([R7]);
  });

  test('una celda no puede ser de la zona y excluida a la vez', () => {
    const {errores} = validarZona({...buena, celdas: [R7, R8], excluidas: [R8]});
    expect(errores[0]).toMatch(/a la vez/);
  });

  test('un hueco debe estar dentro de algo que la zona cubre', () => {
    expect(validarZona({...buena, excluidas: [OTRO_R8]}).errores).toEqual([]);
    const fuera = validarZona({...buena, excluidas: [celdaDe(4.80, -74.00, 'cobertura')]});
    expect(fuera.errores[0]).toMatch(/no está dentro/);
  });

  test('hay un tope de celdas por zona', () => {
    const muchas = gridDisk(R8, 12).slice(0, MAX_CELDAS_ZONA + 1);
    expect(validarZona({...buena, celdas: muchas}).errores[0]).toMatch(/hasta 400/);
  });
});

describe('estadoDeServicio', () => {
  const zona = (estado: 'piloto' | 'activa' | 'cerrada') =>
    ({id: 'bogota-chico', nombre: 'Chicó', estado});

  test('con "exigir zona" apagado se atiende en todas partes, sin bloquear a nadie', () => {
    expect(estadoDeServicio(null, false)).toEqual({abierto: true});
    expect(estadoDeServicio(zona('cerrada'), false)).toEqual({
      abierto: true, zona_id: 'bogota-chico', zona: 'Chicó',
    });
  });

  test('encendido, una zona activa o piloto atiende', () => {
    for (const estado of ['activa', 'piloto'] as const) {
      expect(estadoDeServicio(zona(estado), true)).toEqual({
        abierto: true, zona_id: 'bogota-chico', zona: 'Chicó',
      });
    }
  });

  test('encendido, fuera de toda zona no se atiende', () => {
    expect(estadoDeServicio(null, true)).toEqual({abierto: false, motivo: 'sin_zona'});
  });

  test('encendido, una zona cerrada no atiende y dice cuál es', () => {
    expect(estadoDeServicio(zona('cerrada'), true)).toEqual({
      abierto: false, motivo: 'zona_cerrada', zona_id: 'bogota-chico', zona: 'Chicó',
    });
  });
});

describe('idDeInteres', () => {
  test('uno por persona, rol y celda', () => {
    expect(idDeInteres('u1', 'tutor', R8)).toBe(`u1_tutor_${R8}`);
    expect(idDeInteres('u1', 'cuidador', R8)).not.toBe(idDeInteres('u1', 'tutor', R8));
  });
});
