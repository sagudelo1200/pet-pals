/**
 * Tests del trigger `alCompletarPaseo` (contador de paseos realizados).
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

jest.mock('firebase-admin/firestore', () => ({
  Timestamp: mockFirestore.MOCK_TIMESTAMP,
}));

jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentUpdated: (_path: string, handler: unknown) => handler,
}));

import {alCompletarPaseo} from '../../src/evaluaciones/alCompletarPaseo';

type Evento = {
  data?: {
    before: { data: () => Record<string, unknown> | undefined }
    after: { data: () => Record<string, unknown> | undefined }
  }
  params: Record<string, string>
}

const trigger = alCompletarPaseo as unknown as (event: Evento) => Promise<void>;

const adminMock = jest.requireMock('firebase-admin') as any;
const db = adminMock.firestore();

function evento(
  antes?: Record<string, unknown>,
  despues?: Record<string, unknown>
): Evento {
  return {
    data: {
      before: {data: () => antes},
      after: {data: () => despues},
    },
    params: {paseoId: 'p1'},
  };
}

const PASEOS_C1 = {
  'paseos/pa': {id_cuidador: 'c1', estado: 'FINALIZADO'},
  'paseos/pb': {id_cuidador: 'c1', estado: 'COMPLETADO'},
  'paseos/pc': {id_cuidador: 'c1', estado: 'PENDIENTE'},
  'paseos/pd': {id_cuidador: 'c2', estado: 'COMPLETADO'}, // otro cuidador
};

describe('alCompletarPaseo (contador de paseos)', () => {
  beforeEach(() => {
    db.__reset();
  });

  test('sin datos after no hace nada', async () => {
    await trigger(evento(undefined, undefined));
    expect(db.__docs.size).toBe(0);
  });

  test('sin id_cuidador no hace nada', async () => {
    await trigger(evento({estado: 'EN_PROGRESO'}, {estado: 'COMPLETADO'}));
    expect(db.__docs.size).toBe(0);
  });

  test('cuenta y escribe al pasar a FINALIZADO (resumen + perfil)', async () => {
    for (const [path, data] of Object.entries(PASEOS_C1)) {
      db.__seed(path, data);
    }
    db.__seed('perfiles_publicos/c1', {
      nombre: 'Cuidador Uno',
      cantidad_paseos_realizados: 0,
    });

    await trigger(evento({estado: 'EN_PROGRESO'}, {estado: 'FINALIZADO', id_cuidador: 'c1'}));

    // 2 paseos finalizados/completados de c1 (pa, pb); pc pendiente y pd de c2 no cuentan
    const resumen = db.__docs.get('resumenes_evaluacion/c1');
    expect(resumen.cantidad_paseos_realizados).toBe(2);
    expect(db.__docs.get('perfiles_publicos/c1').cantidad_paseos_realizados).toBe(2);
  });

  test('no re-cuenta en la transición FINALIZADO → COMPLETADO', async () => {
    for (const [path, data] of Object.entries(PASEOS_C1)) {
      db.__seed(path, data);
    }
    // Simula que el contador ya se escribió antes
    db.__seed('perfiles_publicos/c1', {
      nombre: 'Cuidador Uno',
      cantidad_paseos_realizados: 2,
    });
    db.__seed('resumenes_evaluacion/c1', {
      cantidad_paseos_realizados: 2,
      creado_en: {marca: 'original'},
    });

    await trigger(evento({estado: 'FINALIZADO'}, {estado: 'COMPLETADO', id_cuidador: 'c1'}));

    const perfil = db.__docs.get('perfiles_publicos/c1');
    expect(perfil.cantidad_paseos_realizados).toBe(2); // sin re-cómputo
    const resumen = db.__docs.get('resumenes_evaluacion/c1');
    expect(resumen.cantidad_paseos_realizados).toBe(2);
    expect(resumen.creado_en).toEqual({marca: 'original'}); // preservado
  });

  test('no cuenta si el paseo se cancela', async () => {
    await trigger(evento({estado: 'EN_PROGRESO'}, {estado: 'CANCELADO', id_cuidador: 'c1'}));
    expect(db.__docs.has('resumenes_evaluacion/c1')).toBe(false);
    expect(db.__docs.has('perfiles_publicos/c1')).toBe(false);
  });

  test('actualiza el resumen pero NO crea perfil fantasma', async () => {
    db.__seed('paseos/pa', {id_cuidador: 'c1', estado: 'FINALIZADO'});

    await trigger(evento({estado: 'EN_PROGRESO'}, {estado: 'FINALIZADO', id_cuidador: 'c1'}));

    const resumen = db.__docs.get('resumenes_evaluacion/c1');
    expect(resumen.cantidad_paseos_realizados).toBe(1);
    expect(db.__docs.has('perfiles_publicos/c1')).toBe(false);
  });
});
