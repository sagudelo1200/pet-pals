/**
 * Servicio por zonas (servidor): dónde se atiende, interesados fuera de
 * servicio, aviso cuando una zona abre y cancelación de pedidos sin servicio.
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
jest.mock('../../src/comun/notificar', () => ({
  notificar: jest.fn().mockResolvedValue(true),
}));

import {
  avisarZonasAbiertas,
  cancelarSiFueraDeServicio,
  consultarServicio,
  registrarInteres,
  registrarInteresDeCuidador,
} from '../../src/zonas/servicio';
import {guardarZona} from '../../src/zonas/zonas';
import {celdaDe} from '../../src/compartido/geografia';
import {limpiarCacheConfiguracion} from '../../src/comun/configuracion';
import {notificar} from '../../src/comun/notificar';

const AHORA = mockFirestore.MOCK_TIMESTAMP.fromMillis(1_700_000_000_000);
const LAT = 4.6486;
const LNG = -74.0628;
const R7 = celdaDe(LAT, LNG, 'macro');
const R8 = celdaDe(LAT, LNG, 'cobertura');
const OTRO_R8 = cellToChildren(R7, 8).find((c) => c !== R8) as string;
const LEJOS_R8 = celdaDe(6.25, -75.57, 'cobertura');

const interes = (uid: string, rol: string, celda = R8) =>
  mockDb.__docs.get(`interes_zona/${uid}_${rol}_${celda}`);
const territorio = (celda: string) => mockDb.__docs.get(`territorio/${celda}`);
const exigirZona = (valor: boolean) =>
  mockDb.__seed('configuracion/zonas', {exigir_zona: valor});
const crearZona = (estado: string, celdas = [R7], nombre = 'Chicó') =>
  guardarZona(mockDb, {nombre, ciudad: 'Bogotá', estado, celdas},
    {motivo: 'Prueba', autor: 'a1', ahora: AHORA});

beforeEach(() => {
  mockDb.__reset();
  limpiarCacheConfiguracion();
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('consultarServicio', () => {
  test('con "exigir zona" apagado (por defecto) se atiende en todas partes', async () => {
    expect(await consultarServicio(mockDb, R8)).toEqual({abierto: true});
    await crearZona('cerrada');
    expect(await consultarServicio(mockDb, R8)).toMatchObject({abierto: true});
  });

  test('encendido, fuera de toda zona no se atiende', async () => {
    exigirZona(true);
    await crearZona('activa');
    expect(await consultarServicio(mockDb, LEJOS_R8)).toEqual({
      abierto: false, motivo: 'sin_zona',
    });
  });

  test('encendido, zona activa o piloto atiende y dice cuál es', async () => {
    exigirZona(true);
    await crearZona('piloto');
    expect(await consultarServicio(mockDb, R8)).toEqual({
      abierto: true, zona_id: 'bogota-chico', zona: 'Chicó',
    });
    await guardarZona(mockDb, {
      id: 'bogota-chico', nombre: 'Chicó', ciudad: 'Bogotá', estado: 'activa', celdas: [R7],
    }, {motivo: 'Abrimos', autor: 'a1', ahora: AHORA});
    expect((await consultarServicio(mockDb, R8)).abierto).toBe(true);
  });

  test('encendido, una zona cerrada no atiende', async () => {
    exigirZona(true);
    await crearZona('cerrada');
    expect(await consultarServicio(mockDb, R8)).toMatchObject({
      abierto: false, motivo: 'zona_cerrada', zona: 'Chicó',
    });
  });

  test('un hueco de la zona no se atiende; el resto del barrio sí', async () => {
    exigirZona(true);
    await guardarZona(mockDb, {
      nombre: 'Chicó', ciudad: 'Bogotá', estado: 'activa', celdas: [R7], excluidas: [OTRO_R8],
    }, {motivo: 'Prueba', autor: 'a1', ahora: AHORA});
    expect((await consultarServicio(mockDb, OTRO_R8)).abierto).toBe(false);
    expect((await consultarServicio(mockDb, R8)).abierto).toBe(true);
  });

  test('una zona fina cerrada dentro de una abierta manda en su celda', async () => {
    exigirZona(true);
    await crearZona('activa');
    await crearZona('cerrada', [R8], 'Obras');
    expect(await consultarServicio(mockDb, R8)).toMatchObject({
      abierto: false, motivo: 'zona_cerrada', zona: 'Obras',
    });
    expect((await consultarServicio(mockDb, OTRO_R8)).abierto).toBe(true);
  });
});

describe('registrarInteres', () => {
  const registrar = (uid: string, rol: string, avisar = false, celda: unknown = R8) =>
    registrarInteres(mockDb, {uid, celda, rol, avisar}, AHORA);

  test('un interesado nuevo queda anotado y se cuenta en la celda', async () => {
    await expect(registrar('t1', 'tutor')).resolves.toBe(true);

    expect(interes('t1', 'tutor')).toEqual({
      uid: 't1', celda: R8, rol: 'tutor', avisar: false, notificado: false,
      intentos: 1, desde: AHORA, ultimo: AHORA,
    });
    expect(territorio(R8)).toMatchObject({
      celda: R8, res: 8, padre_r8: R8, interes: {tutores: 1, cuidadores: 0},
    });
  });

  test('repetir no duplica: suma un intento y no cambia el conteo', async () => {
    await registrar('t1', 'tutor');
    await expect(registrar('t1', 'tutor')).resolves.toBe(false);
    await registrar('t1', 'tutor');

    expect(interes('t1', 'tutor')!.intentos).toBe(3);
    expect(territorio(R8)!.interes).toEqual({tutores: 1, cuidadores: 0});
  });

  test('tutores y cuidadores se cuentan por separado', async () => {
    await registrar('t1', 'tutor');
    await registrar('t2', 'tutor');
    await registrar('c1', 'cuidador');
    expect(territorio(R8)!.interes).toEqual({tutores: 2, cuidadores: 1});
  });

  test('la misma persona puede ser tutor y cuidador en la misma celda', async () => {
    await registrar('u1', 'tutor');
    await registrar('u1', 'cuidador');
    expect(territorio(R8)!.interes).toEqual({tutores: 1, cuidadores: 1});
  });

  test('cada celda cuenta lo suyo', async () => {
    await registrar('t1', 'tutor', false, R8);
    await registrar('t1', 'tutor', false, LEJOS_R8);
    expect(territorio(R8)!.interes.tutores).toBe(1);
    expect(territorio(LEJOS_R8)!.interes.tutores).toBe(1);
  });

  test('pedir aviso lo marca, y no se pierde si luego solo reintenta', async () => {
    await registrar('t1', 'tutor');
    await registrar('t1', 'tutor', true);
    expect(interes('t1', 'tutor')!.avisar).toBe(true);
    await registrar('t1', 'tutor', false);
    expect(interes('t1', 'tutor')!.avisar).toBe(true);
  });

  test('pedir aviso de nuevo reactiva un aviso ya enviado', async () => {
    await registrar('t1', 'tutor', true);
    mockDb.__seed(`interes_zona/t1_tutor_${R8}`, {...interes('t1', 'tutor'), notificado: true});
    await registrar('t1', 'tutor', true);
    expect(interes('t1', 'tutor')!.notificado).toBe(false);
  });

  test('no toca la oferta y demanda de la celda', async () => {
    mockDb.__seed(`territorio/${R8}`, {celda: R8, operativa: {cuidadores_count: 3}});
    await registrar('t1', 'tutor');
    expect(territorio(R8)!.operativa).toEqual({cuidadores_count: 3});
  });

  test.each([
    ['celda inválida', 'basura', 'tutor'],
    ['celda que no es de cobertura', R7, 'tutor'],
    ['rol inválido', R8, 'admin'],
  ])('rechaza %s', async (_caso, celda, rol) => {
    await expect(registrar('t1', rol, false, celda)).rejects.toMatchObject({
      codigo: 'invalid-argument',
    });
    expect([...mockDb.__docs.keys()]).toEqual([]);
  });
});

describe('registrarInteresDeCuidador', () => {
  const perfil = {nombre: 'Ana', h3_r8: R8};

  test('un cuidador que vive fuera de servicio queda registrado', async () => {
    exigirZona(true);
    await expect(registrarInteresDeCuidador(mockDb, 'c1', perfil, AHORA))
      .resolves.toBe(true);
    expect(interes('c1', 'cuidador')).toMatchObject({avisar: false});
    expect(territorio(R8)!.interes.cuidadores).toBe(1);
  });

  test('si vive donde se atiende, no', async () => {
    exigirZona(true);
    await crearZona('activa');
    await expect(registrarInteresDeCuidador(mockDb, 'c1', perfil, AHORA))
      .resolves.toBe(false);
    expect(interes('c1', 'cuidador')).toBeUndefined();
  });

  test('con "exigir zona" apagado no hay "fuera de servicio"', async () => {
    await expect(registrarInteresDeCuidador(mockDb, 'c1', perfil, AHORA))
      .resolves.toBe(false);
  });

  test('sin ubicación válida no hace nada', async () => {
    exigirZona(true);
    expect(await registrarInteresDeCuidador(mockDb, 'c1', {nombre: 'Ana'}, AHORA)).toBe(false);
    expect(await registrarInteresDeCuidador(mockDb, 'c1', undefined, AHORA)).toBe(false);
  });
});

describe('avisarZonasAbiertas', () => {
  const sembrar = async (uid: string, rol: string, avisar: boolean, celda = R8) => {
    await registrarInteres(mockDb, {uid, celda, rol, avisar}, AHORA);
  };

  test('al abrir la zona se avisa a quienes lo pidieron, con el aviso de su rol', async () => {
    await sembrar('t1', 'tutor', true);
    await sembrar('c1', 'cuidador', true);
    await crearZona('activa');

    await expect(avisarZonasAbiertas(mockDb)).resolves.toBe(2);

    expect(notificar).toHaveBeenCalledWith(mockDb, {
      tipo: 'ZONA_ABIERTA_TUTOR', uid: 't1', datos: {zona: 'Chicó'},
    });
    expect(notificar).toHaveBeenCalledWith(mockDb, {
      tipo: 'ZONA_ABIERTA_CUIDADOR', uid: 'c1', datos: {zona: 'Chicó'},
    });
    expect(interes('t1', 'tutor')!.notificado).toBe(true);
  });

  test('cada interesado recibe el aviso una sola vez', async () => {
    await sembrar('t1', 'tutor', true);
    await crearZona('activa');
    await avisarZonasAbiertas(mockDb);
    await expect(avisarZonasAbiertas(mockDb)).resolves.toBe(0);
    expect(notificar).toHaveBeenCalledTimes(1);
  });

  test('quien no pidió aviso no recibe nada', async () => {
    await sembrar('t1', 'tutor', false);
    await crearZona('activa');
    await expect(avisarZonasAbiertas(mockDb)).resolves.toBe(0);
    expect(notificar).not.toHaveBeenCalled();
  });

  test('no avisa mientras su celda siga fuera de servicio o en una zona cerrada', async () => {
    await sembrar('t1', 'tutor', true, R8);
    await sembrar('t2', 'tutor', true, LEJOS_R8);
    await crearZona('cerrada', [R7]);
    await expect(avisarZonasAbiertas(mockDb)).resolves.toBe(0);
    expect(interes('t1', 'tutor')!.notificado).toBe(false);
  });

  test('una zona piloto también cuenta como abierta', async () => {
    await sembrar('t1', 'tutor', true);
    await crearZona('piloto');
    await expect(avisarZonasAbiertas(mockDb)).resolves.toBe(1);
  });

  test('solo se avisa a los de la zona que abrió', async () => {
    await sembrar('t1', 'tutor', true, R8);
    await sembrar('t2', 'tutor', true, LEJOS_R8);
    await crearZona('activa');
    await expect(avisarZonasAbiertas(mockDb)).resolves.toBe(1);
    expect(interes('t2', 'tutor', LEJOS_R8)!.notificado).toBe(false);
  });
});

describe('cancelarSiFueraDeServicio', () => {
  const paseo = (extra: Record<string, unknown> = {}) => ({
    tipo: 'paseo',
    estado: 'PENDIENTE',
    creado_por: 't1',
    ubicacion_inicio: {coordenadas: {latitude: LAT, longitude: LNG}},
    ...extra,
  });
  const cancelar = (p: Record<string, unknown> | undefined = paseo()) =>
    cancelarSiFueraDeServicio(mockDb, 'p1', p, AHORA);
  const eventos = () => [...mockDb.__docs.entries()].filter(([k]) =>
    (k as string).startsWith('operaciones/p1/eventos/')).map(([, v]) => v);

  beforeEach(() => {
    mockDb.__seed('operaciones/p1', paseo());
  });

  test('un pedido en un sector sin servicio se cancela, con motivo, interés y aviso', async () => {
    exigirZona(true);

    await expect(cancelar()).resolves.toBe(true);

    expect(mockDb.__docs.get('operaciones/p1')).toMatchObject({
      estado: 'CANCELADO', actualizado_por: 'SISTEMA_ZONAS',
    });
    expect(eventos()).toEqual([expect.objectContaining({
      evento: 'CANCELADO_FUERA_DE_ZONA', payload: {razon: 'sin_zona'},
    })]);
    expect(interes('t1', 'tutor')).toBeDefined();
    expect(notificar).toHaveBeenCalledWith(mockDb, {
      tipo: 'PASEO_FUERA_DE_ZONA', uid: 't1', datos: {paseo_id: 'p1'},
    });
  });

  test('en una zona cerrada también', async () => {
    exigirZona(true);
    await crearZona('cerrada');
    await expect(cancelar()).resolves.toBe(true);
    expect(eventos()[0]).toMatchObject({payload: {razon: 'zona_cerrada'}});
  });

  test('donde se atiende no toca nada', async () => {
    exigirZona(true);
    await crearZona('activa');
    await expect(cancelar()).resolves.toBe(false);
    expect(mockDb.__docs.get('operaciones/p1').estado).toBe('PENDIENTE');
    expect(notificar).not.toHaveBeenCalled();
  });

  test('con "exigir zona" apagado no cancela nada', async () => {
    await expect(cancelar()).resolves.toBe(false);
    expect(mockDb.__docs.get('operaciones/p1').estado).toBe('PENDIENTE');
  });

  test('no toca lo que no es un pedido pendiente ni uno sin ubicación', async () => {
    exigirZona(true);
    expect(await cancelar(paseo({estado: 'CONFIRMADO'}))).toBe(false);
    expect(await cancelar(paseo({tipo: 'cobro'}))).toBe(false);
    expect(await cancelar({tipo: 'paseo', estado: 'PENDIENTE'})).toBe(false);
    expect(await cancelarSiFueraDeServicio(mockDb, 'p1', undefined, AHORA)).toBe(false);
  });

  test('si el paseo ya cambió de estado antes de cancelar, no lo pisa', async () => {
    exigirZona(true);
    mockDb.__seed('operaciones/p1', paseo({estado: 'CONFIRMADO'}));
    await expect(cancelar()).resolves.toBe(false);
    expect(mockDb.__docs.get('operaciones/p1').estado).toBe('CONFIRMADO');
  });
});
