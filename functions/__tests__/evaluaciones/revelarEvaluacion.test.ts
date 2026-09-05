/**
 * Tests de la HTTP function `revelarEvaluacionVencida` (ejecutada por Cloud
 * Task 6 días después de una evaluación unidireccional).
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

jest.mock('firebase-functions/v2/https', () => ({
  onRequest: (_opts: unknown, handler: unknown) => handler,
}));

jest.mock('h3-js', () => ({
  gridDisk: jest.fn(() => ['celda-a']),
}));

import {revelarEvaluacionVencida} from '../../src/evaluaciones/revelarEvaluacion';

type Req = { method: string; body?: unknown }
type Res = {
  statusCode: number
  body: unknown
  status: (c: number) => Res
  json: (b: unknown) => Res
}

const handler = revelarEvaluacionVencida as unknown as (
  req: Req,
  res: Res
) => Promise<void>;

const adminMock = jest.requireMock('firebase-admin') as any;
const db = adminMock.firestore();

function respuesta(): Res {
  const res: Res = {
    statusCode: 0,
    body: null,
    status(c: number) {
      this.statusCode = c;
      return this;
    },
    json(b: unknown) {
      this.body = b;
      return this;
    },
  };
  return res;
}

function evaluacionPendiente(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'e1',
    tipo: 'evaluacion_cuidador',
    actor: {tipo: 'usuario', id: 'tutor-1'},
    objetivo: {tipo: 'usuario', id: 'cuidador-1'},
    contexto: {tipo: 'paseo', id: 'p1'},
    datos: {rating: 4, comentario: 'Buen servicio'},
    revelada: false,
    ...overrides,
  };
}

describe('revelarEvaluacionVencida', () => {
  beforeEach(() => {
    db.__reset();
  });

  test('rechaza métodos que no sean POST', async () => {
    const res = respuesta();
    await handler({method: 'GET'}, res);
    expect(res.statusCode).toBe(405);
  });

  test('rechaza payload sin evaluacionId', async () => {
    const res = respuesta();
    await handler({method: 'POST', body: {}}, res);
    expect(res.statusCode).toBe(400);
  });

  test('no-op si el documento no existe', async () => {
    const res = respuesta();
    await handler({method: 'POST', body: {evaluacionId: 'no-existe'}}, res);
    expect(res.statusCode).toBe(200);
  });

  test('no-op si la evaluación ya está revelada (contraparte llegó antes)', async () => {
    db.__seed('evaluaciones/e1', evaluacionPendiente({revelada: true}));
    const res = respuesta();
    await handler({method: 'POST', body: {evaluacionId: 'e1'}}, res);
    expect(res.statusCode).toBe(200);
    expect((res.body as { razon?: string }).razon).toBe('ya revelada');
    // No recalcula el resumen (no hay nada nuevo que publicar)
    expect(db.__docs.has('resumenes_evaluacion/cuidador-1')).toBe(false);
  });

  test('materializa la revelación y publica la reseña unidireccional', async () => {
    db.__seed('evaluaciones/e1', evaluacionPendiente());
    const res = respuesta();
    await handler({method: 'POST', body: {evaluacionId: 'e1'}}, res);

    expect(res.statusCode).toBe(200);
    expect(db.__docs.get('evaluaciones/e1').revelada).toBe(true);
    expect(db.__docs.get('evaluaciones/e1').revelada_en).toBeDefined();

    const resumen = db.__docs.get('resumenes_evaluacion/cuidador-1');
    expect(resumen).toBeDefined();
    expect(resumen.reseñas_publicas).toHaveLength(1);
    expect(resumen.reseñas_publicas[0]).toMatchObject({
      rating: 4,
      comentario: 'Buen servicio',
      contexto_id: 'p1',
    });
  });

  test('marca observaciones de mascota sin tocar perfiles públicos', async () => {
    db.__seed(
      'evaluaciones/e1',
      evaluacionPendiente({
        tipo: 'evaluacion_mascota',
        actor: {tipo: 'usuario', id: 'cuidador-1'},
        objetivo: {tipo: 'mascota', id: 'm1'},
        datos: {ritmo: 'tranquilo', compania: 'solo', tolerancia: 'ignora', comentario: ''},
      })
    );
    const res = respuesta();
    await handler({method: 'POST', body: {evaluacionId: 'e1'}}, res);

    expect(res.statusCode).toBe(200);
    expect(db.__docs.get('evaluaciones/e1').revelada).toBe(true);
    expect(db.__docs.has('resumenes_evaluacion/m1')).toBe(false);
  });
});
