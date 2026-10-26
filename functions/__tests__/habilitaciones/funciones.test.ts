/**
 * Capa de Cloud Functions de las habilitaciones: quién puede llamar y cómo se
 * valida la petición.
 */
import * as mockFirestore from '../helpers/mockFirestore';

const mockDb = mockFirestore.crearMockDb();
const mockExiste = jest.fn();
const mockDescargar = jest.fn();
const mockMetadatos = jest.fn();

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
jest.mock('firebase-admin/storage', () => ({
  getStorage: () => ({
    bucket: () => ({
      file: () => ({
        exists: mockExiste,
        download: mockDescargar,
        getMetadata: mockMetadatos,
      }),
    }),
  }),
}));
jest.mock('../../src/comun/notificar', () => ({
  notificar: jest.fn().mockResolvedValue(true),
}));
jest.mock('firebase-functions/v2/https', () => {
  class HttpsError extends Error {
    constructor(readonly code: string, message: string) {
      super(message);
    }
  }
  return {HttpsError, onCall: (_o: unknown, h: unknown) => h};
});

import * as fn from '../../src/habilitaciones/funciones';
import {limpiarCacheConfiguracion} from '../../src/comun/configuracion';

const llamar = (f: unknown) => f as (req: any) => Promise<any>;
const persona = (data: unknown) => ({auth: {uid: 'ana', token: {}}, data});
const admin = (data: unknown) => ({auth: {uid: 'a1', token: {roles: ['admin']}}, data});

beforeEach(() => {
  mockDb.__reset();
  limpiarCacheConfiguracion();
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  mockDb.__seed('usuarios/ana', {roles: ['tutor']});
  mockDb.__seed('usuarios/a1', {roles: ['admin']});
});

describe('iniciarHabilitacion y enviarHabilitacion (la persona)', () => {
  test('exigen sesión y un servicio que exista', async () => {
    await expect(llamar(fn.iniciarHabilitacion)({data: {servicio: 'paseo'}}))
      .rejects.toMatchObject({code: 'unauthenticated'});
    await expect(llamar(fn.iniciarHabilitacion)(persona({servicio: 'vuelo'})))
      .rejects.toMatchObject({code: 'invalid-argument'});
    await expect(llamar(fn.enviarHabilitacion)(persona({})))
      .rejects.toMatchObject({code: 'invalid-argument'});
  });

  test('iniciar crea la habilitación de quien llama, no de otro', async () => {
    const r = await llamar(fn.iniciarHabilitacion)(
      persona({servicio: 'paseo', usuario_id: 'otro'}));
    expect(r).toEqual({id: 'ana_paseo'});
    expect(mockDb.__docs.get('habilitaciones/ana_paseo')?.usuario_id).toBe('ana');
    expect(mockDb.__docs.has('habilitaciones/otro_paseo')).toBe(false);
  });

  test('enviar traduce los errores de negocio y consulta Storage', async () => {
    mockExiste.mockResolvedValue([false]);
    await expect(llamar(fn.enviarHabilitacion)(persona({servicio: 'paseo'})))
      .rejects.toMatchObject({
        code: 'failed-precondition',
        message: expect.stringContaining('Falta completar'),
      });
    expect(mockExiste).toHaveBeenCalled();
  });
});

describe('decidirRequisito y decidirHabilitacion (el equipo)', () => {
  const cuerpo = {id: 'ana_paseo', requisito: 'identidad', decision: 'APROBAR'};

  test('solo un admin puede', async () => {
    for (const f of [fn.decidirRequisito, fn.decidirHabilitacion]) {
      await expect(llamar(f)(persona(cuerpo)))
        .rejects.toMatchObject({code: 'permission-denied'});
      await expect(llamar(f)({data: cuerpo}))
        .rejects.toMatchObject({code: 'unauthenticated'});
    }
  });

  test('valida la decisión antes de tocar nada', async () => {
    await expect(llamar(fn.decidirRequisito)(admin({...cuerpo, decision: 'TAL_VEZ'})))
      .rejects.toMatchObject({code: 'invalid-argument'});
    await expect(llamar(fn.decidirHabilitacion)(admin({id: 'ana_paseo', decision: 'APROBAR'})))
      .rejects.toMatchObject({code: 'invalid-argument'});
    await expect(llamar(fn.decidirRequisito)(admin({decision: 'APROBAR'})))
      .rejects.toMatchObject({code: 'invalid-argument'});
  });

  test('una habilitación que no existe responde not-found', async () => {
    await expect(llamar(fn.decidirRequisito)(admin(cuerpo)))
      .rejects.toMatchObject({code: 'not-found'});
    await expect(llamar(fn.decidirHabilitacion)(admin({id: 'x_paseo', decision: 'SUSPENDER', motivo: 'a'})))
      .rejects.toMatchObject({code: 'not-found'});
  });

  test('el admin decide y queda como autor', async () => {
    mockDb.__seed('habilitaciones/ana_paseo', {
      usuario_id: 'ana', servicio: 'paseo', estado: 'EN_REVISION', motivo: null,
      requisitos: {identidad: {estado: 'EN_REVISION', vence_en: null}},
    });
    const r = await llamar(fn.decidirRequisito)(admin(cuerpo));
    expect(r.id).toBe('ana_paseo');
    expect(mockDb.__docs.get('habilitaciones/ana_paseo')?.requisitos.identidad.estado)
      .toBe('VERIFICADO');
    expect(mockDb.__docs.get('habilitaciones/ana_paseo')?.actualizado_por).not.toBe('ana');
  });
});

describe('evidenciaHabilitacion (el equipo ve los archivos)', () => {
  const cuerpo = {id: 'ana_paseo', requisito: 'identidad'};
  beforeEach(() => {
    mockDb.__seed('habilitaciones/ana_paseo', {
      usuario_id: 'ana', servicio: 'paseo', estado: 'EN_REVISION',
      motivo: null, requisitos: {},
    });
  });

  test('solo un admin los ve', async () => {
    await expect(llamar(fn.evidenciaHabilitacion)(persona(cuerpo)))
      .rejects.toMatchObject({code: 'permission-denied'});
    expect(mockDescargar).not.toHaveBeenCalled();
  });

  test('el admin recibe el contenido en base64 y su tipo', async () => {
    mockExiste.mockResolvedValue([true]);
    mockDescargar.mockResolvedValue([Buffer.from('ABC')]);
    mockMetadatos.mockResolvedValue([{contentType: 'image/jpeg'}]);
    const r = await llamar(fn.evidenciaHabilitacion)(admin(cuerpo));
    expect(r.archivos).toEqual([
      {archivo: 'frente', existe: true, contentType: 'image/jpeg', base64: 'QUJD'},
      {archivo: 'reverso', existe: true, contentType: 'image/jpeg', base64: 'QUJD'},
    ]);
  });

  test('un archivo que no se subió se marca como inexistente', async () => {
    mockExiste.mockResolvedValue([false]);
    const r = await llamar(fn.evidenciaHabilitacion)(admin(cuerpo));
    expect(r.archivos.map((a: any) => a.existe)).toEqual([false, false]);
    expect(mockDescargar).not.toHaveBeenCalled();
  });
});
