/**
 * Zonas de negocio (servidor): guardar una zona deja el índice al día; el punto
 * de un paseo se resuelve por la celda más específica.
 */
import {cellToChildren} from 'h3-js';
import * as mockFirestore from '../helpers/mockFirestore';

const mockDb = mockFirestore.crearMockDb();

jest.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
  initializeApp: jest.fn(),
}));
jest.mock('firebase-admin/auth', () => ({getAuth: jest.fn()}));
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
  Timestamp: mockFirestore.MOCK_TIMESTAMP,
  FieldValue: mockFirestore.MOCK_FIELD_VALUE,
}));

import {
  asignarZonaAPaseo,
  guardarZona,
  zonaDeCelda,
  zonaDePunto,
} from '../../src/zonas/zonas';
import {celdaDe} from '../../src/compartido/geografia';

const AHORA = mockFirestore.MOCK_TIMESTAMP.fromMillis(1_700_000_000_000);
const LAT = 4.6486;
const LNG = -74.0628;
const R7 = celdaDe(LAT, LNG, 'macro');
const R8 = celdaDe(LAT, LNG, 'cobertura');
const R9 = celdaDe(LAT, LNG, 'micro');
const HERMANAS_R8 = cellToChildren(R7, 8).filter((c) => c !== R8);
const OTRO_R8 = HERMANAS_R8[0];
const OTRO_R7 = celdaDe(4.80, -74.00, 'macro');

const OPC = {motivo: 'Lanzamiento del piloto', autor: 'admin1', ahora: AHORA};
const guardar = (entrada: Record<string, unknown>, opciones = OPC) =>
  guardarZona(mockDb, entrada, opciones);

const base = {
  nombre: 'Chicó',
  ciudad: 'Bogotá',
  estado: 'piloto',
  celdas: [R7],
};
const zona = (id: string) => mockDb.__docs.get(`zonas/${id}`);
const celdaZona = (c: string) => mockDb.__docs.get(`celdas_zona/${c}`);
const historial = (id: string) =>
  [...mockDb.__docs.entries()].filter(([ruta]) =>
    (ruta as string).startsWith(`zonas/${id}/historial/`)).map(([, v]) => v);

beforeEach(() => {
  mockDb.__reset();
});

describe('guardarZona: crear', () => {
  test('crea la zona con id legible, deja el índice y anota el historial', async () => {
    const r = await guardar(base);

    expect(r).toEqual({id: 'bogota-chico', agregadas: 1, quitadas: 0});
    expect(zona('bogota-chico')).toMatchObject({
      nombre: 'Chicó',
      ciudad: 'Bogotá',
      estado: 'piloto',
      celdas: [R7],
      excluidas: [],
      creado_por: 'admin1',
      actualizado_por: 'admin1',
    });
    expect(celdaZona(R7)).toEqual({zona_id: 'bogota-chico'});
    expect(historial('bogota-chico')).toEqual([expect.objectContaining({
      motivo: 'Lanzamiento del piloto',
      autor: 'admin1',
      celdas: {agregadas: 1, quitadas: 0},
      cambios: expect.objectContaining({estado: {antes: null, despues: 'piloto'}}),
    })]);
  });

  test('dos zonas con el mismo nombre no se pisan: el id se desambigua', async () => {
    await guardar(base);
    const r = await guardar({...base, celdas: [OTRO_R7]});
    expect(r.id).toBe('bogota-chico-2');
  });

  test('exige un motivo', async () => {
    await expect(guardar(base, {...OPC, motivo: ''})).rejects.toMatchObject({
      codigo: 'invalid-argument',
    });
    expect(zona('bogota-chico')).toBeUndefined();
  });

  test('rechaza datos inválidos sin tocar nada', async () => {
    await expect(guardar({...base, nombre: 'x'})).rejects.toMatchObject({
      codigo: 'invalid-argument',
    });
    await expect(guardar({...base, celdas: ['basura']})).rejects.toThrow(/celda válida/);
    expect([...mockDb.__docs.keys()]).toEqual([]);
  });

  test('guarda los huecos como "ninguna zona"', async () => {
    await guardar({...base, excluidas: [OTRO_R8]});
    expect(celdaZona(OTRO_R8)).toEqual({zona_id: null, excluida_de: 'bogota-chico'});
  });
});

describe('guardarZona: editar', () => {
  beforeEach(async () => {
    await guardar(base);
  });

  test('agregar y quitar celdas actualiza el índice', async () => {
    const r = await guardar({
      ...base, id: 'bogota-chico', celdas: [R7, OTRO_R7],
    });
    expect(r).toEqual({id: 'bogota-chico', agregadas: 1, quitadas: 0});
    expect(celdaZona(OTRO_R7)).toEqual({zona_id: 'bogota-chico'});

    const r2 = await guardar({
      ...base, id: 'bogota-chico', celdas: [OTRO_R7],
    });
    expect(r2).toEqual({id: 'bogota-chico', agregadas: 0, quitadas: 1});
    expect(celdaZona(R7)).toBeUndefined();
    expect(zona('bogota-chico')!.celdas).toEqual([OTRO_R7]);
  });

  test('es idempotente: repetir el guardado no cambia nada', async () => {
    const antes = JSON.stringify([...mockDb.__docs.entries()]
      .filter(([k]) => (k as string).startsWith('celdas_zona/')));
    const r = await guardar({...base, id: 'bogota-chico'});
    expect(r).toMatchObject({agregadas: 0, quitadas: 0});
    const despues = JSON.stringify([...mockDb.__docs.entries()]
      .filter(([k]) => (k as string).startsWith('celdas_zona/')));
    expect(despues).toBe(antes);
  });

  test('cambiar el estado queda en el historial', async () => {
    await guardar({...base, id: 'bogota-chico', estado: 'activa'});
    const ultimo = historial('bogota-chico').find(
      (h: any) => h.cambios.estado?.antes === 'piloto');
    expect(ultimo).toBeDefined();
    expect((ultimo as any).cambios.estado.despues).toBe('activa');
    expect(zona('bogota-chico')!.estado).toBe('activa');
  });

  test('cerrar una zona puede liberar todas sus celdas', async () => {
    await guardar({...base, id: 'bogota-chico', estado: 'cerrada', celdas: []});
    expect(celdaZona(R7)).toBeUndefined();
    expect(zona('bogota-chico')).toMatchObject({estado: 'cerrada', celdas: []});
  });

  test('una zona que no existe no se puede editar', async () => {
    await expect(guardar({...base, id: 'fantasma'})).rejects.toMatchObject({
      codigo: 'not-found',
    });
  });

  test('un hueco se puede quitar luego', async () => {
    await guardar({...base, id: 'bogota-chico', excluidas: [OTRO_R8]});
    await guardar({...base, id: 'bogota-chico', excluidas: []});
    expect(celdaZona(OTRO_R8)).toBeUndefined();
  });
});

describe('guardarZona: conflictos', () => {
  beforeEach(async () => {
    await guardar(base);
  });

  test('una celda no puede ser de dos zonas', async () => {
    await expect(guardar({
      nombre: 'Rival', ciudad: 'Bogotá', estado: 'piloto', celdas: [R7],
    })).rejects.toThrow(/ya pertenecen a otra zona.*bogota-chico/);
    expect(zona('bogota-rival')).toBeUndefined();
    expect(celdaZona(R7)).toEqual({zona_id: 'bogota-chico'});
  });

  test('un hueco de otra zona tampoco se puede tomar', async () => {
    await guardar({...base, id: 'bogota-chico', excluidas: [OTRO_R8]});
    await expect(guardar({
      nombre: 'Rival', ciudad: 'Bogotá', estado: 'piloto', celdas: [OTRO_R8],
    })).rejects.toThrow(/otra zona/);
  });

  test('una zona más fina SÍ puede estar dentro de una más gruesa (gana la específica)', async () => {
    const r = await guardar({
      nombre: 'Chicó Norte', ciudad: 'Bogotá', estado: 'activa', celdas: [R8],
    });
    expect(r.id).toBe('bogota-chico-norte');
    expect(await zonaDeCelda(mockDb, R9)).toBe('bogota-chico-norte');
    expect(await zonaDeCelda(mockDb, OTRO_R8)).toBe('bogota-chico');
  });

  test('una zona sí puede volver a tomar sus propias celdas', async () => {
    await expect(guardar({...base, id: 'bogota-chico'})).resolves.toBeDefined();
  });

  test('tras liberar las celdas, otra zona las puede tomar', async () => {
    await guardar({...base, id: 'bogota-chico', estado: 'cerrada', celdas: []});
    await expect(guardar({
      nombre: 'Rival', ciudad: 'Bogotá', estado: 'piloto', celdas: [R7],
    })).resolves.toBeDefined();
  });
});

describe('zonaDeCelda y zonaDePunto', () => {
  test('sin zonas, ninguna', async () => {
    expect(await zonaDeCelda(mockDb, R9)).toBeNull();
    expect(await zonaDePunto(mockDb, LAT, LNG)).toBeNull();
  });

  test('un punto cae en la zona de su barrio', async () => {
    await guardar(base);
    expect(await zonaDePunto(mockDb, LAT, LNG)).toBe('bogota-chico');
  });

  test('un hueco devuelve ninguna zona', async () => {
    await guardar({...base, excluidas: [R8]});
    expect(await zonaDeCelda(mockDb, R9)).toBeNull();
    expect(await zonaDeCelda(mockDb, OTRO_R8)).toBe('bogota-chico');
  });
});

describe('asignarZonaAPaseo', () => {
  const paseo = (extra: Record<string, unknown> = {}) => ({
    tipo: 'paseo',
    estado: 'PENDIENTE',
    ubicacion_inicio: {coordenadas: {latitude: LAT, longitude: LNG}},
    ...extra,
  });

  test('el paseo guarda la zona de su recogida', async () => {
    await guardar(base);
    mockDb.__seed('operaciones/p1', paseo());

    await expect(asignarZonaAPaseo(mockDb, 'p1', paseo())).resolves
      .toBe('bogota-chico');

    expect(mockDb.__docs.get('operaciones/p1').zona_id).toBe('bogota-chico');
  });

  test('si cambia la zona después, el paseo conserva la que tenía', async () => {
    await guardar(base);
    mockDb.__seed('operaciones/p1', paseo());
    await asignarZonaAPaseo(mockDb, 'p1', paseo());

    await guardar({...base, id: 'bogota-chico', estado: 'cerrada', celdas: []});

    expect(mockDb.__docs.get('operaciones/p1').zona_id).toBe('bogota-chico');
  });

  test('fuera de toda zona no se escribe nada', async () => {
    mockDb.__seed('operaciones/p1', paseo());
    await expect(asignarZonaAPaseo(mockDb, 'p1', paseo())).resolves.toBeNull();
    expect(mockDb.__docs.get('operaciones/p1')).not.toHaveProperty('zona_id');
  });

  test('no toca lo que no es un paseo, un paseo sin ubicación o uno que ya tiene zona', async () => {
    await guardar(base);
    mockDb.__seed('operaciones/x', {tipo: 'cobro'});
    mockDb.__seed('operaciones/y', {tipo: 'paseo'});
    expect(await asignarZonaAPaseo(mockDb, 'x', {tipo: 'cobro'})).toBeNull();
    expect(await asignarZonaAPaseo(mockDb, 'y', {tipo: 'paseo'})).toBeNull();
    expect(await asignarZonaAPaseo(mockDb, 'p1', paseo({zona_id: 'otra'}))).toBeNull();
    expect(await asignarZonaAPaseo(mockDb, 'p1', undefined)).toBeNull();
  });
});
