/**
 * Capa de Cloud Functions de las zonas: callable de admin y disparador.
 */
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
jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: (_p: string, h: unknown) => h,
}));
jest.mock('firebase-functions/v2/https', () => {
  class HttpsError extends Error {
    constructor(readonly code: string, message: string) {
      super(message);
    }
  }
  return {
    HttpsError,
    onCall: (_o: unknown, h: unknown) => h,
    onRequest: (_o: unknown, h: unknown) => h,
  };
});

import * as fn from '../../src/zonas/funciones';
import {notificar} from '../../src/comun/notificar';
import {limpiarCacheConfiguracion} from '../../src/comun/configuracion';
import {celdaDe} from '../../src/compartido/geografia';

const R7 = celdaDe(4.6486, -74.0628, 'macro');
const llamar = (f: unknown) => f as (req: any) => Promise<any>;
const disparar = (f: unknown) => f as (e: any) => Promise<void>;
const admin = (data: unknown) => ({
  auth: {uid: 'a1', token: {roles: ['admin']}},
  data,
});
const cuerpo = {
  nombre: 'Chicó',
  ciudad: 'Bogotá',
  estado: 'piloto',
  celdas: [R7],
  motivo: 'Primer piloto',
};

const R8 = celdaDe(4.6486, -74.0628, 'cobertura');
const autenticado = (uid: string, data: unknown) => ({auth: {uid, token: {}}, data});

beforeEach(() => {
  mockDb.__reset();
  limpiarCacheConfiguracion();
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('guardarZona (callable)', () => {
  test('solo un admin puede', async () => {
    mockDb.__seed('usuarios/t1', {roles: ['tutor']});
    await expect(llamar(fn.guardarZona)({
      auth: {uid: 't1', token: {}}, data: cuerpo,
    })).rejects.toMatchObject({code: 'permission-denied'});
    await expect(llamar(fn.guardarZona)({data: cuerpo}))
      .rejects.toMatchObject({code: 'unauthenticated'});
    expect(mockDb.__docs.has('zonas/bogota-chico')).toBe(false);
  });

  test('un admin crea la zona y queda como autor', async () => {
    const r = await llamar(fn.guardarZona)(admin(cuerpo));
    expect(r).toEqual({id: 'bogota-chico', agregadas: 1, quitadas: 0});
    expect(mockDb.__docs.get('zonas/bogota-chico')).toMatchObject({
      creado_por: 'a1', estado: 'piloto',
    });
  });

  test('los errores de validación llegan como invalid-argument', async () => {
    await expect(llamar(fn.guardarZona)(admin({...cuerpo, nombre: ''})))
      .rejects.toMatchObject({code: 'invalid-argument'});
  });

  test('un conflicto llega como failed-precondition', async () => {
    await llamar(fn.guardarZona)(admin(cuerpo));
    await expect(llamar(fn.guardarZona)(admin({...cuerpo, nombre: 'Rival'})))
      .rejects.toMatchObject({code: 'failed-precondition'});
  });
});

describe('alCrearPaseoAsignarZona', () => {
  const paseo = {
    tipo: 'paseo',
    estado: 'PENDIENTE',
    ubicacion_inicio: {coordenadas: {latitude: 4.6486, longitude: -74.0628}},
  };
  const evento = {
    params: {operacionId: 'p1'},
    data: {data: () => paseo},
  };

  test('el paseo nuevo guarda su zona', async () => {
    await llamar(fn.guardarZona)(admin(cuerpo));
    mockDb.__seed('operaciones/p1', paseo);
    await disparar(fn.alCrearPaseoAsignarZona)(evento);
    expect(mockDb.__docs.get('operaciones/p1').zona_id).toBe('bogota-chico');
  });

  test('un fallo se registra sin lanzar', async () => {
    await expect(disparar(fn.alCrearPaseoAsignarZona)({
      params: {operacionId: 'p1'}, data: undefined,
    })).resolves.toBeUndefined();
  });
});

describe('consultarServicio (callable)', () => {
  test('exige sesión y una celda de cobertura válida', async () => {
    await expect(llamar(fn.consultarServicio)({data: {celda: R8}}))
      .rejects.toMatchObject({code: 'unauthenticated'});
    await expect(llamar(fn.consultarServicio)(autenticado('c1', {celda: 'basura'})))
      .rejects.toMatchObject({code: 'invalid-argument'});
    await expect(llamar(fn.consultarServicio)(autenticado('c1', {celda: R7})))
      .rejects.toMatchObject({code: 'invalid-argument'});
  });

  test('dice si se atiende esa celda', async () => {
    expect(await llamar(fn.consultarServicio)(autenticado('c1', {celda: R8})))
      .toEqual({abierto: true});
    mockDb.__seed('configuracion/paseos', {exigir_zona: true});
    limpiarCacheConfiguracion();
    expect(await llamar(fn.consultarServicio)(autenticado('c1', {celda: R8})))
      .toEqual({abierto: false, motivo: 'sin_zona'});
  });
});

describe('avisarCuandoLleguen (callable)', () => {
  test('registra al interesado pidiendo aviso', async () => {
    const r = await llamar(fn.avisarCuandoLleguen)(
      autenticado('t1', {celda: R8, rol: 'tutor'}));
    expect(r).toEqual({ok: true});
    expect(mockDb.__docs.get(`interes_zona/t1_tutor_${R8}`)).toMatchObject({
      uid: 't1', avisar: true, notificado: false,
    });
  });

  test('exige sesión y datos válidos', async () => {
    await expect(llamar(fn.avisarCuandoLleguen)({data: {celda: R8, rol: 'tutor'}}))
      .rejects.toMatchObject({code: 'unauthenticated'});
    await expect(llamar(fn.avisarCuandoLleguen)(
      autenticado('t1', {celda: R8, rol: 'admin'})))
      .rejects.toMatchObject({code: 'invalid-argument'});
  });
});

describe('guardarZona avisa a los interesados', () => {
  const pedirAviso = (uid: string, rol: string) =>
    llamar(fn.avisarCuandoLleguen)(autenticado(uid, {celda: R8, rol}));

  test('al abrir una zona, se avisa a quienes lo pidieron', async () => {
    await pedirAviso('t1', 'tutor');
    await pedirAviso('c1', 'cuidador');

    await llamar(fn.guardarZona)(admin(cuerpo));

    expect(notificar).toHaveBeenCalledTimes(2);
    expect(mockDb.__docs.get(`interes_zona/t1_tutor_${R8}`).notificado).toBe(true);
  });

  test('al guardar una zona cerrada no se avisa a nadie', async () => {
    await pedirAviso('t1', 'tutor');
    await llamar(fn.guardarZona)(admin({...cuerpo, estado: 'cerrada'}));
    expect(notificar).not.toHaveBeenCalled();
  });

  test('si el aviso falla, la zona queda guardada igual', async () => {
    await pedirAviso('t1', 'tutor');
    (notificar as jest.Mock).mockRejectedValueOnce(new Error('sin red'));
    await expect(llamar(fn.guardarZona)(admin(cuerpo))).resolves.toMatchObject({
      id: 'bogota-chico',
    });
    expect(mockDb.__docs.has('zonas/bogota-chico')).toBe(true);
  });
});

describe('alCrearPaseoAsignarZona: sin servicio', () => {
  const paseo = {
    tipo: 'paseo',
    estado: 'PENDIENTE',
    creado_por: 't1',
    ubicacion_inicio: {coordenadas: {latitude: 4.6486, longitude: -74.0628}},
  };
  const evento = {params: {operacionId: 'p1'}, data: {data: () => paseo}};

  test('un pedido en un sector sin servicio se cancela', async () => {
    mockDb.__seed('configuracion/paseos', {exigir_zona: true});
    mockDb.__seed('operaciones/p1', paseo);
    await disparar(fn.alCrearPaseoAsignarZona)(evento);
    expect(mockDb.__docs.get('operaciones/p1').estado).toBe('CANCELADO');
  });

  test('en una zona abierta, queda con su zona y sigue pendiente', async () => {
    mockDb.__seed('configuracion/paseos', {exigir_zona: true});
    await llamar(fn.guardarZona)(admin(cuerpo));
    mockDb.__seed('operaciones/p1', paseo);
    await disparar(fn.alCrearPaseoAsignarZona)(evento);
    expect(mockDb.__docs.get('operaciones/p1')).toMatchObject({
      estado: 'PENDIENTE', zona_id: 'bogota-chico',
    });
  });

  test('con "exigir zona" apagado el paseo no se toca', async () => {
    mockDb.__seed('operaciones/p1', paseo);
    await disparar(fn.alCrearPaseoAsignarZona)(evento);
    expect(mockDb.__docs.get('operaciones/p1').estado).toBe('PENDIENTE');
  });
});
