/**
 * Evidencia de un requisito para quien revisa.
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

import {evidenciaDeRequisito} from '../../src/habilitaciones/evidencia';

const leidas: string[] = [];
const deps = {
  leerArchivo: async (ruta: string) => {
    leidas.push(ruta);
    return ruta.endsWith('/reverso') ? null :
      {contentType: 'image/jpeg', base64: 'QUJD'};
  },
};

beforeEach(() => {
  mockDb.__reset();
  leidas.length = 0;
  mockDb.__seed('habilitaciones/ana_paseo', {
    usuario_id: 'ana', servicio: 'paseo', estado: 'EN_REVISION',
    motivo: null, requisitos: {},
  });
});

describe('evidenciaDeRequisito', () => {
  test('lee solo los archivos que el catálogo pide, de la persona dueña', async () => {
    const r = await evidenciaDeRequisito(mockDb, 'ana_paseo', 'identidad', deps);
    expect(r).toEqual([
      {archivo: 'frente', existe: true, contentType: 'image/jpeg', base64: 'QUJD'},
      {archivo: 'reverso', existe: false},
    ]);
    expect(leidas).toEqual([
      'solicitudes/ana/paseo/identidad/frente',
      'solicitudes/ana/paseo/identidad/reverso',
    ]);
  });

  test('un requisito sin evidencia, o que no existe, se rechaza sin leer nada', async () => {
    for (const requisito of ['email', 'perfil', 'no_existe']) {
      await expect(evidenciaDeRequisito(mockDb, 'ana_paseo', requisito, deps))
        .rejects.toMatchObject({codigo: 'invalid-argument'});
    }
    expect(leidas).toEqual([]);
  });

  test('una habilitación que no existe', async () => {
    await expect(evidenciaDeRequisito(mockDb, 'x_paseo', 'identidad', deps))
      .rejects.toMatchObject({codigo: 'not-found'});
  });
});
