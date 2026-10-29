/**
 * Aceptar un paseo y validar la asignación al crearlo: el servidor vuelve a
 * comprobar que el cuidador puede tomarlo.
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
jest.mock('../../src/comun/notificar', () => ({
  notificar: jest.fn().mockResolvedValue(true),
}));

import {
  aceptarPaseo,
  validarAsignacionAlCrear,
} from '../../src/emparejamiento/emparejamiento';
import {instanteDe} from '../../src/compartido/emparejamiento';
import {limpiarCacheConfiguracion} from '../../src/comun/configuracion';
import {notificar} from '../../src/comun/notificar';

const T = (ms: number) => mockFirestore.MOCK_TIMESTAMP.fromMillis(ms);
const CELDA = latLngToCell(4.6486, -74.0628, 8);
const FECHA = '2030-03-12'; // martes
const AHORA = instanteDe('2030-03-01', '08:00');
const HORARIO = {'2': {inicio: '08:00', fin: '18:00'}};

const paseo = (cambios: Record<string, unknown> = {}) => ({
  tipo: 'paseo',
  estado: 'PENDIENTE',
  creado_por: 't1',
  mascota_ids: ['m1'],
  duracion_estimada: 60,
  fecha_hora_inicio: T(instanteDe(FECHA, '10:00')),
  ubicacion_inicio: {coordenadas: {latitude: 4.6486, longitude: -74.0628}},
  ...cambios,
});

function sembrarCuidador(id: string, perfil: Record<string, unknown> = {}) {
  mockDb.__seed(`perfiles_publicos/${id}`, {
    nombre: 'Ana Pérez',
    foto: 'ana.jpg',
    insignias_verificacion: ['EMAIL', 'IDENTIDAD'],
    servicios_habilitados: ['paseo'],
    horario_semanal: HORARIO,
    h3_r8: CELDA,
    rating_promedio: 4.5,
    cantidad_paseos_realizados: 20,
    ...perfil,
  });
}

const paseoGuardado = (id = 'p1') => mockDb.__docs.get(`operaciones/${id}`);
const eventos = () =>
  [...mockDb.__docs.entries()].filter(([ruta]) =>
    (ruta as string).startsWith('operaciones/p1/eventos/'));

beforeEach(() => {
  mockDb.__reset();
  limpiarCacheConfiguracion();
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  mockDb.__seed('mascotas/m1', {
    creado_por: 't1', nombre: 'Max', tamano: 'mediano',
  });
  mockDb.__seed('operaciones/p1', paseo());
  sembrarCuidador('c1');
});

describe('aceptarPaseo', () => {
  const aceptar = (uid = 'c1', id: unknown = 'p1') =>
    aceptarPaseo(mockDb, uid, id, AHORA);

  test('confirma el paseo con el nombre y la foto del perfil', async () => {
    await expect(aceptar()).resolves.toEqual({aceptado: true, id_cuidador: 'c1'});

    expect(paseoGuardado()).toMatchObject({
      estado: 'CONFIRMADO',
      id_cuidador: 'c1',
      cuidador_nombre_visual: 'Ana Pérez',
      cuidador_foto_visual: 'ana.jpg',
      actualizado_por: 'c1',
    });
  });

  test('puede aceptar uno dirigido a él', async () => {
    mockDb.__seed('operaciones/p1', paseo({id_cuidador: 'c1'}));
    await expect(aceptar()).resolves.toBeDefined();
  });

  test.each([
    ['sin id', null, 'invalid-argument'],
    ['id vacío', ' ', 'invalid-argument'],
    ['paseo inexistente', 'nada', 'not-found'],
  ])('%s', async (_caso, id, codigo) => {
    await expect(aceptar('c1', id)).rejects.toMatchObject({codigo});
  });

  test('no puede aceptar su propio paseo', async () => {
    sembrarCuidador('t1');
    await expect(aceptar('t1')).rejects.toMatchObject({
      codigo: 'permission-denied',
    });
  });

  test('un paseo dirigido a otro cuidador no se acepta', async () => {
    mockDb.__seed('operaciones/p1', paseo({id_cuidador: 'otro'}));
    await expect(aceptar()).rejects.toMatchObject({
      codigo: 'failed-precondition',
    });
    expect(paseoGuardado()?.estado).toBe('PENDIENTE');
  });

  test('un paseo que ya no está pendiente no se acepta', async () => {
    mockDb.__seed('operaciones/p1', paseo({estado: 'CONFIRMADO'}));
    await expect(aceptar()).rejects.toMatchObject({
      codigo: 'failed-precondition',
    });
  });

  test('sin habilitación no puede aceptar, aunque tenga la insignia de identidad', async () => {
    sembrarCuidador('c1', {servicios_habilitados: []});
    await expect(aceptar()).rejects.toThrow(/habilitado/);
    expect(paseoGuardado()?.estado).toBe('PENDIENTE');
  });

  test('con la habilitación vencida tampoco', async () => {
    sembrarCuidador('c1', {servicios_vencen: {paseo: 1}});
    await expect(aceptar()).rejects.toThrow(/habilitado/);
    expect(paseoGuardado()?.estado).toBe('PENDIENTE');
  });

  test('sin perfil público no puede aceptar', async () => {
    await expect(aceptar('fantasma')).rejects.toMatchObject({
      codigo: 'failed-precondition',
    });
  });

  test('fuera de su zona no puede aceptar', async () => {
    sembrarCuidador('c1', {h3_r8: latLngToCell(4.80, -74.00, 8)});
    await expect(aceptar()).rejects.toThrow(/zona/);
  });

  test('un perro de un tamaño que no suele cuidar: primero se avisa, no se rechaza', async () => {
    mockDb.__seed('mascotas/m1', {
      creado_por: 't1', nombre: 'Rocky', tamano: 'grande',
    });
    sembrarCuidador('c1', {tamanos_aceptados: ['pequeño', 'mediano']});

    const respuesta = await aceptarPaseo(mockDb, 'c1', 'p1', AHORA);

    expect(respuesta).toEqual({
      aceptado: false,
      requiereConfirmacion: true,
      advertencias: [{tipo: 'tamano', mascotas: ['Rocky']}],
    });
    expect(paseoGuardado()?.estado).toBe('PENDIENTE');
    expect(notificar).not.toHaveBeenCalled();
  });

  test('si el cuidador confirma, se acepta y el tutor recibe el aviso', async () => {
    mockDb.__seed('mascotas/m1', {
      creado_por: 't1', nombre: 'Rocky', tamano: 'grande',
    });
    sembrarCuidador('c1', {tamanos_aceptados: ['pequeño', 'mediano']});

    const respuesta = await aceptarPaseo(mockDb, 'c1', 'p1', AHORA, true);

    expect(respuesta).toEqual({aceptado: true, id_cuidador: 'c1'});
    expect(paseoGuardado()).toMatchObject({estado: 'CONFIRMADO', id_cuidador: 'c1'});
    expect(notificar).toHaveBeenCalledWith(mockDb, {
      tipo: 'PASEO_CON_AVISOS',
      uid: 't1',
      datos: {
        paseo_id: 'p1',
        cuidador: 'Ana Pérez',
        detalle: 'Normalmente no cuida el tamaño de Rocky',
      },
    });
  });

  test('sin advertencias no hace falta confirmar: acepta y avisa al tutor que aceptaron', async () => {
    await expect(aceptarPaseo(mockDb, 'c1', 'p1', AHORA)).resolves
      .toMatchObject({aceptado: true});
    expect(notificar).toHaveBeenCalledTimes(1);
    expect(notificar).toHaveBeenCalledWith(mockDb, expect.objectContaining({
      tipo: 'PASEO_ACEPTADO',
      uid: 't1',
      dedup_key: 'paseo_p1_CONFIRMADO_t1',
      datos: expect.objectContaining({cuidador: 'Ana Pérez'}),
    }));
  });

  test('con más perros de los que prefiere: avisa; al confirmar, acepta', async () => {
    mockDb.__seed('mascotas/m2', {creado_por: 't1', nombre: 'Luna'});
    mockDb.__seed('operaciones/p1', paseo({mascota_ids: ['m1', 'm2']}));
    sembrarCuidador('c1', {max_mascotas: 1});

    await expect(aceptarPaseo(mockDb, 'c1', 'p1', AHORA)).resolves.toEqual({
      aceptado: false,
      requiereConfirmacion: true,
      advertencias: [{tipo: 'cupo', cupo: 1}],
    });
    expect(paseoGuardado()?.estado).toBe('PENDIENTE');

    await expect(aceptarPaseo(mockDb, 'c1', 'p1', AHORA, true)).resolves
      .toMatchObject({aceptado: true});
    expect(notificar).toHaveBeenCalledWith(mockDb, expect.objectContaining({
      tipo: 'PASEO_CON_AVISOS',
      datos: expect.objectContaining({detalle: 'Suele cuidar hasta 1 perro a la vez'}),
    }));
  });

  test('más perros que el tope del servicio sí se rechaza (no es negociable)', async () => {
    for (const id of ['m2', 'm3', 'm4', 'm5']) {
      mockDb.__seed(`mascotas/${id}`, {creado_por: 't1', nombre: id});
    }
    mockDb.__seed('operaciones/p1', paseo({mascota_ids: ['m1', 'm2', 'm3', 'm4', 'm5']}));
    await expect(aceptarPaseo(mockDb, 'c1', 'p1', AHORA, true)).rejects
      .toThrow(/permite el servicio/);
  });

  test('otro paseo suyo en ese horario: doble reserva', async () => {
    mockDb.__seed('operaciones/p2', paseo({
      estado: 'CONFIRMADO',
      id_cuidador: 'c1',
      fecha_hora_inicio: T(instanteDe(FECHA, '10:30')),
    }));
    await expect(aceptar()).rejects.toThrow(/otro paseo/);
    expect(paseoGuardado()?.estado).toBe('PENDIENTE');
  });

  test('un paseo en otro día no estorba', async () => {
    mockDb.__seed('operaciones/p2', paseo({
      estado: 'CONFIRMADO',
      id_cuidador: 'c1',
      fecha_hora_inicio: T(instanteDe('2030-03-13', '10:00')),
    }));
    await expect(aceptar()).resolves.toBeDefined();
  });

  test('fuera de su horario declarado SÍ puede aceptar (él decide)', async () => {
    mockDb.__seed('operaciones/p1', paseo({
      fecha_hora_inicio: T(instanteDe(FECHA, '19:00')),
    }));
    await expect(aceptar()).resolves.toBeDefined();
  });

  test('un día que no trabaja tampoco lo impide', async () => {
    sembrarCuidador('c1', {horario_semanal: {'1': HORARIO['2']}});
    await expect(aceptar()).resolves.toBeDefined();
  });

  test('fuera del horario del servicio (05:30-22:30) no se acepta', async () => {
    mockDb.__seed('operaciones/p1', paseo({
      fecha_hora_inicio: T(instanteDe(FECHA, '23:00')),
    }));
    await expect(aceptar()).rejects.toThrow(/horario del servicio/);
  });

  test('puede aceptar en los minutos previos a que empiece', async () => {
    const diezAntes = instanteDe(FECHA, '10:00') - 10 * 60000;
    await expect(aceptarPaseo(mockDb, 'c1', 'p1', diezAntes)).resolves
      .toBeDefined();
  });

  test('uno que ya empezó no se acepta', async () => {
    const despues = instanteDe(FECHA, '10:00') + 20 * 60000;
    await expect(aceptarPaseo(mockDb, 'c1', 'p1', despues)).rejects
      .toThrow(/ya empezó/);
  });
});

describe('validarAsignacionAlCrear', () => {
  const validar = (id = 'p1') => validarAsignacionAlCrear(mockDb, id, AHORA);

  test('un cuidador que puede tomarlo se queda asignado', async () => {
    mockDb.__seed('operaciones/p1', paseo({id_cuidador: 'c1'}));
    await expect(validar()).resolves.toBe(false);
    expect(paseoGuardado()?.id_cuidador).toBe('c1');
    expect(notificar).not.toHaveBeenCalled();
  });

  test('una solicitud abierta no se toca', async () => {
    await expect(validar()).resolves.toBe(false);
    expect(paseoGuardado()?.estado).toBe('PENDIENTE');
    expect(paseoGuardado()).not.toHaveProperty('actualizado_por');
  });

  test('si el elegido no puede, el paseo se abre a otros y se avisa al tutor', async () => {
    mockDb.__seed('operaciones/p1', paseo({
      id_cuidador: 'c1',
      cuidador_nombre_visual: 'Ana',
      cuidador_foto_visual: 'ana.jpg',
    }));
    mockDb.__seed('operaciones/p2', paseo({
      estado: 'CONFIRMADO',
      id_cuidador: 'c1',
      fecha_hora_inicio: T(instanteDe(FECHA, '10:00')),
    }));

    await expect(validar()).resolves.toBe(true);

    const guardado = paseoGuardado()!;
    expect(guardado.estado).toBe('PENDIENTE');
    expect(guardado).not.toHaveProperty('id_cuidador');
    expect(guardado).not.toHaveProperty('cuidador_nombre_visual');
    expect(guardado.actualizado_por).toBe('SISTEMA_EMPAREJAMIENTO');
    expect(eventos()).toHaveLength(1);
    expect(eventos()[0][1]).toMatchObject({
      evento: 'ASIGNACION_INVALIDA',
      payload: {cuidador_anterior: 'c1'},
    });
    expect(notificar).toHaveBeenCalledWith(mockDb, {
      tipo: 'SOLICITUD_ESCALADA', uid: 't1', datos: {paseo_id: 'p1'},
    });
  });

  test('un cuidador sin habilitar se descarta aunque el horario calce', async () => {
    sembrarCuidador('c1', {servicios_habilitados: []});
    mockDb.__seed('operaciones/p1', paseo({id_cuidador: 'c1'}));
    await expect(validar()).resolves.toBe(true);
  });

  test('un tamaño que no suele cuidar no cambia la asignación: él decide', async () => {
    mockDb.__seed('mascotas/m1', {
      creado_por: 't1', nombre: 'Rocky', tamano: 'grande',
    });
    sembrarCuidador('c1', {tamanos_aceptados: ['pequeño']});
    mockDb.__seed('operaciones/p1', paseo({id_cuidador: 'c1'}));

    await expect(validar()).resolves.toBe(false);
    expect(paseoGuardado()?.id_cuidador).toBe('c1');
  });

  test('salirse de su horario declarado no lo descarta', async () => {
    mockDb.__seed('operaciones/p1', paseo({
      id_cuidador: 'c1',
      fecha_hora_inicio: T(instanteDe(FECHA, '19:00')),
    }));
    await expect(validar()).resolves.toBe(false);
  });

  test('no toca operaciones que no son paseos ni ya confirmadas', async () => {
    mockDb.__seed('operaciones/p1', {tipo: 'otro', estado: 'PENDIENTE', id_cuidador: 'x'});
    await expect(validar()).resolves.toBe(false);
    mockDb.__seed('operaciones/p1', paseo({estado: 'CONFIRMADO', id_cuidador: 'c1'}));
    await expect(validar()).resolves.toBe(false);
  });
});
