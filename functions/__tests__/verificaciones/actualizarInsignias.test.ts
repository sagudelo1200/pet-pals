/**
 * Tests de los triggers que cachean las insignias de verificación en el perfil público.
 */

import * as mockFirestore from '../helpers/mockFirestore';

jest.mock('firebase-admin', () => {
  const db = mockFirestore.crearMockDb();
  return {
    apps: [],
    initializeApp: jest.fn(),
    firestore: Object.assign(() => db, {
      FieldValue: mockFirestore.MOCK_FIELD_VALUE,
      Timestamp: mockFirestore.MOCK_TIMESTAMP,
    }),
  };
});

jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: (_path: string, handler: unknown) => handler,
  onDocumentUpdated: (_path: string, handler: unknown) => handler,
}));

import {
  actualizarInsignias,
  actualizarInsigniasOnUpdate,
} from '../../src/verificaciones/actualizarInsignias';

const adminMock = jest.requireMock('firebase-admin') as any;
const db = adminMock.firestore();
const alCrear = actualizarInsignias as any;
const alActualizar = actualizarInsigniasOnUpdate as any;

const snap = (data: Record<string, unknown> | undefined) => ({data: () => data});

describe('actualizarInsignias (creación de verificación)', () => {
  beforeEach(() => {
    db.__reset();
    jest.clearAllMocks();
  });

  it('agrega la insignia del tipo verificado al perfil existente', async () => {
    db.__seed('perfiles_publicos/u1', {nombre: 'Ana'});
    db.__seed('verificaciones/v1', {usuario_id: 'u1', tipo: 'EMAIL', estado: 'VERIFICADO'});

    await alCrear({data: snap({usuario_id: 'u1', tipo: 'EMAIL', estado: 'VERIFICADO'})});

    const perfil = db.__docs.get('perfiles_publicos/u1');
    expect(perfil.insignias_verificacion).toEqual(['EMAIL']);
    expect(perfil.nombre).toBe('Ana');
  });

  it('crea el perfil si aún no existe', async () => {
    db.__seed('verificaciones/v1', {usuario_id: 'u1', tipo: 'EMAIL', estado: 'VERIFICADO'});

    await alCrear({data: snap({usuario_id: 'u1', tipo: 'EMAIL', estado: 'VERIFICADO'})});

    expect(db.__docs.get('perfiles_publicos/u1').insignias_verificacion).toEqual(['EMAIL']);
  });

  it('solo cuenta verificaciones VERIFICADO y sin duplicar tipos', async () => {
    db.__seed('perfiles_publicos/u1', {});
    db.__seed('verificaciones/v1', {usuario_id: 'u1', tipo: 'EMAIL', estado: 'VERIFICADO'});
    db.__seed('verificaciones/v2', {usuario_id: 'u1', tipo: 'EMAIL', estado: 'VERIFICADO'});
    db.__seed('verificaciones/v3', {usuario_id: 'u1', tipo: 'IDENTIDAD', estado: 'PENDIENTE'});
    db.__seed('verificaciones/v4', {usuario_id: 'otro', tipo: 'IDENTIDAD', estado: 'VERIFICADO'});

    await alCrear({data: snap({usuario_id: 'u1', tipo: 'EMAIL', estado: 'VERIFICADO'})});

    expect(db.__docs.get('perfiles_publicos/u1').insignias_verificacion).toEqual(['EMAIL']);
  });

  it('ignora documentos sin usuario_id', async () => {
    await alCrear({data: snap({tipo: 'EMAIL', estado: 'VERIFICADO'})});
    expect(db.__docs.size).toBe(0);
  });
});

describe('actualizarInsigniasOnUpdate (cambio de estado)', () => {
  beforeEach(() => {
    db.__reset();
    jest.clearAllMocks();
  });

  it('recalcula las insignias cuando una verificación pasa a VERIFICADO', async () => {
    db.__seed('perfiles_publicos/u1', {insignias_verificacion: ['EMAIL']});
    db.__seed('verificaciones/v1', {usuario_id: 'u1', tipo: 'EMAIL', estado: 'VERIFICADO'});
    db.__seed('verificaciones/v2', {usuario_id: 'u1', tipo: 'IDENTIDAD', estado: 'VERIFICADO'});

    await alActualizar({
      data: {
        before: snap({usuario_id: 'u1', tipo: 'IDENTIDAD', estado: 'PENDIENTE'}),
        after: snap({usuario_id: 'u1', tipo: 'IDENTIDAD', estado: 'VERIFICADO'}),
      },
    });

    expect(db.__docs.get('perfiles_publicos/u1').insignias_verificacion).toEqual([
      'EMAIL',
      'IDENTIDAD',
    ]);
  });

  it('revoca la insignia cuando la verificación deja de estar VERIFICADO', async () => {
    db.__seed('perfiles_publicos/u1', {insignias_verificacion: ['EMAIL', 'IDENTIDAD']});
    db.__seed('verificaciones/v1', {usuario_id: 'u1', tipo: 'EMAIL', estado: 'VERIFICADO'});
    db.__seed('verificaciones/v2', {usuario_id: 'u1', tipo: 'IDENTIDAD', estado: 'RECHAZADO'});

    await alActualizar({
      data: {
        before: snap({usuario_id: 'u1', tipo: 'IDENTIDAD', estado: 'VERIFICADO'}),
        after: snap({usuario_id: 'u1', tipo: 'IDENTIDAD', estado: 'RECHAZADO'}),
      },
    });

    expect(db.__docs.get('perfiles_publicos/u1').insignias_verificacion).toEqual(['EMAIL']);
  });

  it('no hace nada si el estado no cambió', async () => {
    db.__seed('perfiles_publicos/u1', {insignias_verificacion: ['VIEJA']});

    await alActualizar({
      data: {
        before: snap({usuario_id: 'u1', tipo: 'EMAIL', estado: 'VERIFICADO'}),
        after: snap({usuario_id: 'u1', tipo: 'EMAIL', estado: 'VERIFICADO'}),
      },
    });

    expect(db.__docs.get('perfiles_publicos/u1').insignias_verificacion).toEqual(['VIEJA']);
  });
});
