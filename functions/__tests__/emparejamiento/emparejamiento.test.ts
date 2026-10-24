/**
 * Emparejamiento (lado servidor): lee mascota, perfil, agenda y expediente, y
 * devuelve los cuidadores ordenados.
 */
import {latLngToCell} from 'h3-js';
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
  buscarCuidadores,
  validarPeticion,
} from '../../src/emparejamiento/emparejamiento';
import {instanteDe} from '../../src/compartido/emparejamiento';
import {limpiarCacheConfiguracion} from '../../src/comun/configuracion';

const CELDA = latLngToCell(4.6486, -74.0628, 8);
const CELDA_VECINA = latLngToCell(4.6560, -74.0628, 8);
const FECHA = '2030-03-12'; // martes
const AHORA = instanteDe('2030-03-01', '08:00');
const PEDIDO = {
  fecha: FECHA, hora: '10:00', duracion: 60, celda: CELDA, mascotaIds: ['m1'],
};
const HORARIO = {'2': {inicio: '08:00', fin: '18:00'}};

function sembrarCuidador(
  id: string,
  perfil: Record<string, unknown> = {},
  enIndice = true
) {
  mockDb.__seed(`perfiles_publicos/${id}`, {
    nombre: id.toUpperCase(),
    insignias_verificacion: ['EMAIL', 'IDENTIDAD'],
    horario_semanal: HORARIO,
    h3_r8: CELDA,
    rating_promedio: 4.5,
    cantidad_paseos_realizados: 20,
    ...perfil,
  });
  if (enIndice) mockDb.__seed(`indice_cobertura/${CELDA}/cuidadores/${id}`, {uid: id});
}

const buscar = (datos: unknown = PEDIDO, uid = 't1') =>
  buscarCuidadores(mockDb, uid, datos, AHORA);
const ids = async (datos: unknown = PEDIDO) =>
  (await buscar(datos)).cuidadores.map((c) => c.id);

beforeEach(() => {
  mockDb.__reset();
  limpiarCacheConfiguracion();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  mockDb.__seed('mascotas/m1', {
    creado_por: 't1', ids_tutores: ['t2'], nombre: 'Max', tamano: 'mediano',
  });
});

describe('validarPeticion', () => {
  test('acepta una petición completa', () => {
    expect(validarPeticion(PEDIDO)).toEqual(PEDIDO);
  });

  test.each([
    ['fecha mal escrita', {...PEDIDO, fecha: '12/03/2030'}],
    ['hora mal escrita', {...PEDIDO, hora: '10h'}],
    ['duración fuera de rango', {...PEDIDO, duracion: 5}],
    ['duración no entera', {...PEDIDO, duracion: 45.5}],
    ['celda inválida', {...PEDIDO, celda: 'abc'}],
    ['sin mascotas', {...PEDIDO, mascotaIds: []}],
    ['demasiadas mascotas', {
      ...PEDIDO, mascotaIds: Array.from({length: 11}, (_, i) => `m${i}`),
    }],
    ['sin cuerpo', undefined],
  ])('rechaza %s', (_caso, datos) => {
    expect(() => validarPeticion(datos)).toThrow(/no es válido/);
  });

  test('quita mascotas repetidas', () => {
    expect(validarPeticion({...PEDIDO, mascotaIds: ['m1', 'm1']}).mascotaIds)
      .toEqual(['m1']);
  });
});

describe('buscarCuidadores', () => {
  test('devuelve al cuidador disponible con sus datos', async () => {
    sembrarCuidador('c1', {foto: 'f.jpg'});

    const {cuidadores} = await buscar();

    expect(cuidadores).toHaveLength(1);
    expect(cuidadores[0]).toMatchObject({
      id: 'c1',
      nombre: 'C1',
      foto: 'f.jpg',
      calificacion: 4.5,
      estado: 'disponible',
      distanciaKm: 0,
    });
    expect(cuidadores[0].razones).toContain('cerca');
  });

  test('solo un tutor de la mascota puede buscarle cuidador', async () => {
    sembrarCuidador('c1');
    await expect(buscar(PEDIDO, 'intruso')).rejects.toMatchObject({
      codigo: 'permission-denied',
    });
    await expect(buscar(PEDIDO, 't2')).resolves.toBeDefined(); // tutor compartido
  });

  test('una mascota que no existe da not-found', async () => {
    await expect(buscar({...PEDIDO, mascotaIds: ['nada']})).rejects.toMatchObject({
      codigo: 'not-found',
    });
  });

  test('no confía en el índice: sin identidad verificada en el perfil no aparece', async () => {
    sembrarCuidador('ok');
    // se anota a sí mismo en el índice, pero su perfil (que no controla) no lo verifica
    sembrarCuidador('tramposo', {insignias_verificacion: ['EMAIL']});
    expect(await ids()).toEqual(['ok']);
  });

  test('no confía en el índice: si su zona real no cubre la celda, no aparece', async () => {
    sembrarCuidador('ok');
    const lejana = latLngToCell(4.80, -74.00, 8);
    sembrarCuidador('lejano', {h3_r8: lejana});
    expect(await ids()).toEqual(['ok']);
  });

  test('usa las celdas de cobertura manuales si existen', async () => {
    sembrarCuidador('manual', {h3_r8: CELDA_VECINA, celdas_cobertura: [CELDA]});
    expect(await ids()).toEqual(['manual']);
  });

  test('el cuidador decide con cuántos perros trabaja: más es un aviso, no una exclusión', async () => {
    mockDb.__seed('mascotas/m2', {creado_por: 't1', nombre: 'Luna'});
    mockDb.__seed('mascotas/m3', {creado_por: 't1', nombre: 'Kira'});
    const tres = {...PEDIDO, mascotaIds: ['m1', 'm2', 'm3']};
    sembrarCuidador('uno', {nombre: 'Ana', max_mascotas: 1});
    sembrarCuidador('tres', {nombre: 'Bea', max_mascotas: 3});
    sembrarCuidador('sin_limite_propio', {nombre: 'Eva'});
    sembrarCuidador('ambicioso', {nombre: 'Ivy', max_mascotas: 9});

    // global por defecto: 4. Todos aparecen; solo "uno" lleva el aviso y va al final
    const {cuidadores} = await buscar(tres);
    expect(cuidadores.map((c) => c.id)).toEqual(
      ['tres', 'sin_limite_propio', 'ambicioso', 'uno']);
    expect(cuidadores.find((c) => c.id === 'uno')!.advertencias)
      .toEqual([{tipo: 'cupo', cupo: 1}]);

    // el admin baja el tope del servicio a 2: con 3 perros nadie puede (no es negociable)
    mockDb.__seed('configuracion/paseos', {max_mascotas: 2});
    limpiarCacheConfiguracion();
    expect(await ids(tres)).toEqual([]);

    // con 2 perros todos aparecen; el cupo propio de 9 se limita a 2 y no avisa
    const {cuidadores: conDos} = await buscar({...PEDIDO, mascotaIds: ['m1', 'm2']});
    expect(conDos).toHaveLength(4);
    expect(conDos.find((c) => c.id === 'ambicioso')!.advertencias).toEqual([]);
    expect(conDos.find((c) => c.id === 'uno')!.advertencias)
      .toEqual([{tipo: 'cupo', cupo: 1}]);
  });

  test('un cupo propio inválido (0, negativo, decimal, texto) se ignora', async () => {
    for (const [i, valor] of [0, -2, 1.5, '1', null].entries()) {
      sembrarCuidador(`c${i}`, {max_mascotas: valor});
    }
    expect((await ids()).sort()).toEqual(['c0', 'c1', 'c2', 'c3', 'c4']);
  });

  test('el propio tutor, si también es cuidador, no se ofrece a sí mismo', async () => {
    sembrarCuidador('t1');
    sembrarCuidador('c1');
    expect(await ids()).toEqual(['c1']);
  });

  test('quien no suele cuidar ese tamaño sigue apareciendo, con aviso y más abajo', async () => {
    mockDb.__seed('mascotas/m1', {creado_por: 't1', nombre: 'Rocky', tamano: 'grande'});
    sembrarCuidador('sin_grandes', {nombre: 'Ana', tamanos_aceptados: ['pequeño', 'mediano']});
    sembrarCuidador('solo_grandes', {nombre: 'Bea', tamanos_aceptados: ['grande', 'gigante']});
    sembrarCuidador('todos', {nombre: 'Zoe'});
    sembrarCuidador('vacio', {nombre: 'Eva', tamanos_aceptados: []});
    sembrarCuidador('basura', {nombre: 'Ivy', tamanos_aceptados: ['enorme', 7]});

    const {cuidadores} = await buscar();

    // los que sí cuidan grandes (o no declararon nada) primero; el que no, al final
    expect(cuidadores.map((c) => c.id)).toEqual(
      ['solo_grandes', 'vacio', 'basura', 'todos', 'sin_grandes']);
    const aviso = cuidadores.find((c) => c.id === 'sin_grandes')!;
    expect(aviso.estado).toBe('disponible');
    expect(aviso.advertencias).toEqual([{tipo: 'tamano', mascotas: ['Rocky']}]);
    expect(cuidadores.filter((c) => c.id !== 'sin_grandes')
      .every((c) => c.advertencias.length === 0)).toBe(true);
  });

  test('un cuidador que no cuida pequeños recibe el aviso con una mascota pequeña', async () => {
    mockDb.__seed('mascotas/m1', {creado_por: 't1', nombre: 'Toby', tamano: 'pequeño'});
    sembrarCuidador('sin_pequenos', {tamanos_aceptados: ['mediano', 'grande']});

    const {cuidadores} = await buscar();

    expect(cuidadores).toHaveLength(1);
    expect(cuidadores[0].advertencias).toEqual([{tipo: 'tamano', mascotas: ['Toby']}]);
  });

  test('la agenda del cuidador lo deja como "ocupado" y al final', async () => {
    sembrarCuidador('libre', {nombre: 'Zoe'});
    sembrarCuidador('ocupado', {nombre: 'Ana'});
    mockDb.__seed('operaciones/p1', {
      tipo: 'paseo', estado: 'CONFIRMADO', id_cuidador: 'ocupado',
      duracion_estimada: 60,
      fecha_hora_inicio: mockFirestore.MOCK_TIMESTAMP.fromMillis(
        instanteDe(FECHA, '10:30')),
    });
    // un paseo ya finalizado no ocupa agenda
    mockDb.__seed('operaciones/p2', {
      tipo: 'paseo', estado: 'FINALIZADO', id_cuidador: 'libre',
      duracion_estimada: 60,
      fecha_hora_inicio: mockFirestore.MOCK_TIMESTAMP.fromMillis(
        instanteDe(FECHA, '10:00')),
    });

    const {cuidadores} = await buscar();

    expect(cuidadores.map((c) => [c.id, c.estado, c.motivo])).toEqual([
      ['libre', 'disponible', undefined],
      ['ocupado', 'otro_horario', 'ocupado'],
    ]);
  });

  test('una excepción semanal cierra el día', async () => {
    sembrarCuidador('c1');
    mockDb.__seed('excepciones_disponibilidad/c1/semanas/2030-W11', {
      overrides: {'2': {activo: false}},
    });
    const {cuidadores} = await buscar();
    expect(cuidadores[0]).toMatchObject({estado: 'otro_horario', motivo: 'no_trabaja'});
  });

  test('quien ya paseó a la mascota va primero y se informa', async () => {
    sembrarCuidador('a', {nombre: 'Ana'});
    sembrarCuidador('b', {nombre: 'Bea'});
    mockDb.__seed('expedientes/m1', {vinculos: {b: {paseos: 4, ultimo_en: 1}}});

    const {cuidadores} = await buscar();

    expect(cuidadores.map((c) => c.id)).toEqual(['b', 'a']);
    expect(cuidadores[0].continuidad).toEqual({nombres: 'Max', paseos: 4});
    expect(cuidadores[0].razones).toContain('conoce');
  });

  test('el admin puede apagar la prioridad de los conocidos', async () => {
    sembrarCuidador('a', {nombre: 'Ana'});
    sembrarCuidador('b', {nombre: 'Bea'});
    mockDb.__seed('expedientes/m1', {vinculos: {b: {paseos: 4, ultimo_en: 1}}});
    mockDb.__seed('configuracion/expediente', {priorizar_conocidos: false});

    expect(await ids()).toEqual(['a', 'b']);
  });

  test('respeta el máximo de resultados de la configuración', async () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) sembrarCuidador(id);
    mockDb.__seed('configuracion/emparejamiento', {max_resultados: 5});
    expect(await ids()).toHaveLength(5);
  });

  test('sin cuidadores en la celda devuelve lista vacía', async () => {
    expect(await buscar()).toEqual({cuidadores: []});
  });
});
