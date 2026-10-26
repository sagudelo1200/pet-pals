/**
 * Capa de Cloud Functions del territorio: disparadores y callable.
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
  onDocumentWritten: (_p: string, h: unknown) => h,
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

import * as fn from '../../src/territorio/funciones';
import {limpiarCacheConfiguracion} from '../../src/comun/configuracion';
import {celdaDe} from '../../src/compartido/geografia';

const R8 = celdaDe(4.6486, -74.0628, 'cobertura');
const R9 = celdaDe(4.6486, -74.0628, 'micro');
const disparar = (f: unknown) => f as (e: any) => Promise<void>;
const llamar = (f: unknown) => f as (req: any) => Promise<any>;
const instantanea = (data: Record<string, unknown> | undefined) => ({
  data: () => data,
});
const territorio = (celda: string) => mockDb.__docs.get(`territorio/${celda}`);

const perfil = {
  nombre: 'Ana',
  h3_r8: R8,
  insignias_verificacion: ['IDENTIDAD'],
  servicios_habilitados: ['paseo'],
};

beforeEach(() => {
  mockDb.__reset();
  limpiarCacheConfiguracion();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('alCambiarCoberturaTerritorio', () => {
  test('un cuidador nuevo entra al índice y suma a la oferta de sus celdas', async () => {
    await disparar(fn.alCambiarCoberturaTerritorio)({
      params: {uid: 'c1'},
      data: {before: instantanea(undefined), after: instantanea(perfil)},
    });

    expect(mockDb.__docs.get(`indice_cobertura/${R8}/cuidadores/c1`))
      .toMatchObject({uid: 'c1', habilitado: true});
    expect(territorio(R8)!.operativa).toMatchObject({
      cuidadores_count: 1, estado: 'disponible',
    });
  });

  test('un cuidador que vive donde no se atiende queda como interesado', async () => {
    mockDb.__seed('configuracion/paseos', {exigir_zona: true});

    await disparar(fn.alCambiarCoberturaTerritorio)({
      params: {uid: 'c1'},
      data: {before: instantanea(undefined), after: instantanea(perfil)},
    });

    expect(mockDb.__docs.get(`interes_zona/c1_cuidador_${R8}`)).toMatchObject({
      uid: 'c1', rol: 'cuidador', avisar: false,
    });
    expect(territorio(R8)).toMatchObject({
      interes: {tutores: 0, cuidadores: 1},
      operativa: {cuidadores_count: 1},
    });
  });

  test('si se atiende ahí, o "exigir zona" está apagado, no es interesado', async () => {
    await disparar(fn.alCambiarCoberturaTerritorio)({
      params: {uid: 'c1'},
      data: {before: instantanea(undefined), after: instantanea(perfil)},
    });
    expect(mockDb.__docs.has(`interes_zona/c1_cuidador_${R8}`)).toBe(false);
  });

  test('un cambio que no toca la cobertura no escribe nada', async () => {
    await disparar(fn.alCambiarCoberturaTerritorio)({
      params: {uid: 'c1'},
      data: {
        before: instantanea({...perfil, rating_promedio: 4}),
        after: instantanea({...perfil, rating_promedio: 5}),
      },
    });
    expect(territorio(R8)).toBeUndefined();
  });

  test('si algo falla, lo registra y no tumba el cambio del perfil', async () => {
    await expect(disparar(fn.alCambiarCoberturaTerritorio)({
      params: {uid: 'c1'},
      data: undefined,
    })).resolves.toBeUndefined();
  });
});

describe('alCambiarPaseoTerritorio', () => {
  test('un pedido nuevo suma demanda en su celda', async () => {
    const paseo = {tipo: 'paseo', estado: 'PENDIENTE', h3_r8: R8};
    mockDb.__seed('operaciones/p1', paseo);

    await disparar(fn.alCambiarPaseoTerritorio)({
      params: {operacionId: 'p1'},
      data: {before: instantanea(undefined), after: instantanea(paseo)},
    });

    expect(territorio(R8)!.operativa).toMatchObject({
      demanda_total: 1, estado: 'sin_cobertura',
    });
  });

  test('un fallo se registra sin lanzar', async () => {
    await expect(disparar(fn.alCambiarPaseoTerritorio)({
      params: {operacionId: 'p1'},
      data: undefined,
    })).resolves.toBeUndefined();
  });
});

describe('alRegistrarEventoTerritorio', () => {
  const evento = (tipo: string) => ({
    params: {operacionId: 'p1', eventoId: 'e1'},
    data: instantanea({evento: tipo}),
  });

  test('un evento de bitácora suma a la narrativa de su microzona', async () => {
    mockDb.__seed('operaciones/p1/eventos/e1', {
      evento: 'bitacora',
      payload: {accion: 'juego'},
      hechoTerritorial: {h3_r8: R8, h3_r9: R9},
    });

    await disparar(fn.alRegistrarEventoTerritorio)(evento('bitacora'));

    expect(territorio(R9)!.narrativa.total_eventos).toBe(1);
  });

  test('los demás eventos se ignoran', async () => {
    await disparar(fn.alRegistrarEventoTerritorio)(evento('incidente'));
    expect(territorio(R9)).toBeUndefined();
  });
});

describe('reconstruirTerritorio', () => {
  test('solo un admin puede reconstruir', async () => {
    mockDb.__seed('usuarios/t1', {roles: ['tutor']});
    await expect(llamar(fn.reconstruirTerritorio)({
      auth: {uid: 't1', token: {}}, data: {},
    })).rejects.toMatchObject({code: 'permission-denied'});
  });

  test('sin sesión no se puede', async () => {
    await expect(llamar(fn.reconstruirTerritorio)({data: {}}))
      .rejects.toMatchObject({code: 'unauthenticated'});
  });

  test('un admin reconstruye desde los datos y recibe el resumen', async () => {
    mockDb.__seed('perfiles_publicos/c1', perfil);

    const resultado = await llamar(fn.reconstruirTerritorio)({
      auth: {uid: 'a1', token: {roles: ['admin']}}, data: {},
    });

    expect(resultado).toEqual({perfiles: 1, celdas: 19});
    expect(territorio(R8)!.operativa.cuidadores_count).toBe(1);
  });
});
