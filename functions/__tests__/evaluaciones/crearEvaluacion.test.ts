/**
 * Tests unitarios de la callable `crearEvaluacion` (contrato v2).
 *
 * Se mockean `firebase-admin` y `firebase-functions/v2/https` con un mock en
 * memoria de Firestore (ver helpers/mockFirestore.ts).
 */

// El nombre empieza con `mock` para que babel-plugin-jest-hoist permita
// referenciarlo desde las factories de jest.mock (patrón documentado).
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

jest.mock('firebase-functions/v2/https', () => {
  class HttpsError extends Error {
    code: string;
    details?: unknown;
    constructor(code: string, message: string, details?: unknown) {
      super(message);
      this.name = 'HttpsError';
      this.code = code;
      this.details = details;
    }
  }
  return {
    onCall: (_opts: unknown, handler: unknown) => handler,
    HttpsError,
  };
});

import {crearEvaluacion} from '../../src/evaluaciones/crearEvaluacion';

type Req = { auth?: { uid: string | null }; data?: unknown }
type Res = { success: boolean; evaluacionId: string; timestamp: string }

// El mock de onCall devuelve el handler directamente
const handler = crearEvaluacion as unknown as (
  req: Req
) => Promise<Res>;

const adminMock = jest.requireMock('firebase-admin') as any;
const db = adminMock.firestore();

const PASEO_BASE: Record<string, unknown> = {
  estado: 'COMPLETADO',
  creado_por: 'tutor-1',
  id_cuidador: 'cuidador-1',
  mascota_ids: ['mascota-1'],
};

function seedPaseo(id: string, overrides: Record<string, unknown> = {}): void {
  db.__seed(`paseos/${id}`, {...PASEO_BASE, ...overrides});
}

function req(uid: string | null, data: unknown): Req {
  return {auth: uid ? {uid} : undefined, data};
}

describe('crearEvaluacion', () => {
  beforeEach(() => {
    db.__reset();
  });

  test('rechaza sin autenticación', async () => {
    await expect(handler(req(null, {}))).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  test('rechaza payload sin campos requeridos', async () => {
    await expect(
      handler(req('tutor-1', {tipo: 'evaluacion_cuidador'}))
    ).rejects.toMatchObject({code: 'invalid-argument'});
  });

  test('rechaza campos no string', async () => {
    await expect(
      handler(
        req('tutor-1', {tipo: 123, objetivo: 'cuidador-1', contextoId: 'p1'})
      )
    ).rejects.toMatchObject({code: 'invalid-argument'});
  });

  test('rechaza evaluacion_sistema (reservada al sistema)', async () => {
    await expect(
      handler(
        req('tutor-1', {
          tipo: 'evaluacion_sistema',
          objetivo: 'cuidador-1',
          contextoId: 'p1',
          rating: 5,
        })
      )
    ).rejects.toMatchObject({code: 'permission-denied'});
  });

  test('rechaza tipo inválido', async () => {
    await expect(
      handler(
        req('tutor-1', {
          tipo: 'evaluacion_x',
          objetivo: 'cuidador-1',
          contextoId: 'p1',
          rating: 5,
        })
      )
    ).rejects.toMatchObject({code: 'invalid-argument'});
  });

  test('rechaza rating fuera de 1-5 en evaluación humana', async () => {
    seedPaseo('p1');
    await expect(
      handler(
        req('tutor-1', {
          tipo: 'evaluacion_cuidador',
          objetivo: 'cuidador-1',
          contextoId: 'p1',
          rating: 0,
        })
      )
    ).rejects.toMatchObject({code: 'invalid-argument'});
    await expect(
      handler(
        req('tutor-1', {
          tipo: 'evaluacion_cuidador',
          objetivo: 'cuidador-1',
          contextoId: 'p1',
          rating: '5',
        })
      )
    ).rejects.toMatchObject({code: 'invalid-argument'});
  });

  test('rechaza rating en observación de mascota (cualitativa)', async () => {
    seedPaseo('p1');
    await expect(
      handler(
        req('cuidador-1', {
          tipo: 'evaluacion_mascota',
          objetivo: 'mascota-1',
          contextoId: 'p1',
          rating: 3,
        })
      )
    ).rejects.toMatchObject({code: 'invalid-argument'});
  });

  test('rechaza paseo inexistente', async () => {
    await expect(
      handler(
        req('tutor-1', {
          tipo: 'evaluacion_cuidador',
          objetivo: 'cuidador-1',
          contextoId: 'no-existe',
          rating: 5,
        })
      )
    ).rejects.toMatchObject({code: 'not-found'});
  });

  test('rechaza paseo no completado/finalizado', async () => {
    seedPaseo('p1', {estado: 'PENDIENTE'});
    await expect(
      handler(
        req('tutor-1', {
          tipo: 'evaluacion_cuidador',
          objetivo: 'cuidador-1',
          contextoId: 'p1',
          rating: 5,
        })
      )
    ).rejects.toMatchObject({code: 'failed-precondition'});
  });

  test('rechaza a un tercero no participante', async () => {
    seedPaseo('p1');
    await expect(
      handler(
        req('tercero-1', {
          tipo: 'evaluacion_cuidador',
          objetivo: 'cuidador-1',
          contextoId: 'p1',
          rating: 5,
        })
      )
    ).rejects.toMatchObject({code: 'permission-denied'});
  });

  test('tutor evalúa a su cuidador correctamente (contrato v2)', async () => {
    seedPaseo('p1');
    const res = await handler(
      req('tutor-1', {
        tipo: 'evaluacion_cuidador',
        objetivo: 'cuidador-1',
        contextoId: 'p1',
        rating: 5,
        comentario: 'Excelente',
      })
    );
    expect(res.success).toBe(true);
    expect(res.evaluacionId).toBe('evaluacion_cuidador_tutor-1_cuidador-1_p1');

    const doc = db.__docs.get('evaluaciones/evaluacion_cuidador_tutor-1_cuidador-1_p1');
    expect(doc).toBeDefined();
    expect(doc.actor).toEqual({tipo: 'usuario', id: 'tutor-1'});
    expect(doc.objetivo).toEqual({tipo: 'usuario', id: 'cuidador-1'});
    expect(doc.contexto).toEqual({tipo: 'paseo', id: 'p1'});
    expect(doc.datos.rating).toBe(5);
    expect(doc.datos.comentario).toBe('Excelente');
    expect(doc.creado_por).toBe('tutor-1');
    expect(doc.actualizado_por).toBe('tutor-1');
  });

  test('cuidador no puede evaluar al cuidador', async () => {
    seedPaseo('p1');
    await expect(
      handler(
        req('cuidador-1', {
          tipo: 'evaluacion_cuidador',
          objetivo: 'cuidador-1',
          contextoId: 'p1',
          rating: 5,
        })
      )
    ).rejects.toMatchObject({code: 'permission-denied'});
  });

  test('tutor no puede evaluar a un objetivo distinto del cuidador', async () => {
    seedPaseo('p1');
    await expect(
      handler(
        req('tutor-1', {
          tipo: 'evaluacion_cuidador',
          objetivo: 'otro-cuidador',
          contextoId: 'p1',
          rating: 5,
        })
      )
    ).rejects.toMatchObject({code: 'permission-denied'});
  });

  test('cuidador evalúa a su tutor correctamente', async () => {
    seedPaseo('p1');
    const res = await handler(
      req('cuidador-1', {
        tipo: 'evaluacion_tutor',
        objetivo: 'tutor-1',
        contextoId: 'p1',
        rating: 4,
      })
    );
    expect(res.success).toBe(true);
    const doc = db.__docs.get('evaluaciones/evaluacion_tutor_cuidador-1_tutor-1_p1');
    expect(doc.objetivo).toEqual({tipo: 'usuario', id: 'tutor-1'});
    expect(doc.datos.rating).toBe(4);
  });

  test('tutor no puede evaluar al tutor', async () => {
    seedPaseo('p1');
    await expect(
      handler(
        req('tutor-1', {
          tipo: 'evaluacion_tutor',
          objetivo: 'tutor-1',
          contextoId: 'p1',
          rating: 4,
        })
      )
    ).rejects.toMatchObject({code: 'permission-denied'});
  });

  test('cuidador registra observación de mascota (sin rating)', async () => {
    seedPaseo('p1');
    const res = await handler(
      req('cuidador-1', {
        tipo: 'evaluacion_mascota',
        objetivo: 'mascota-1',
        contextoId: 'p1',
        ritmo: 'tranquilo',
        compania: 'solo',
        tolerancia: 'ignora',
        comentario: 'Se portó bien',
      })
    );
    expect(res.success).toBe(true);

    const doc = db.__docs.get('evaluaciones/evaluacion_mascota_cuidador-1_mascota-1_p1');
    expect(doc.objetivo).toEqual({tipo: 'mascota', id: 'mascota-1'});
    expect(doc.datos.rating).toBeUndefined();
    expect(doc.datos.ritmo).toBe('tranquilo');
    expect(doc.datos.compania).toBe('solo');
    expect(doc.datos.tolerancia).toBe('ignora');
    expect(doc.datos.comentario).toBe('Se portó bien');
  });

  test('rechaza observación de mascota que no pertenece al paseo', async () => {
    seedPaseo('p1');
    await expect(
      handler(
        req('cuidador-1', {
          tipo: 'evaluacion_mascota',
          objetivo: 'mascota-99',
          contextoId: 'p1',
        })
      )
    ).rejects.toMatchObject({code: 'permission-denied'});
  });

  test('rechaza duplicado con already-exists (unicidad real)', async () => {
    seedPaseo('p1');
    db.__seed('evaluaciones/evaluacion_cuidador_tutor-1_cuidador-1_p1', {
      tipo: 'evaluacion_cuidador',
    });
    await expect(
      handler(
        req('tutor-1', {
          tipo: 'evaluacion_cuidador',
          objetivo: 'cuidador-1',
          contextoId: 'p1',
          rating: 5,
        })
      )
    ).rejects.toMatchObject({code: 'already-exists'});
  });

  test('rechaza comentario demasiado largo', async () => {
    seedPaseo('p1');
    await expect(
      handler(
        req('tutor-1', {
          tipo: 'evaluacion_cuidador',
          objetivo: 'cuidador-1',
          contextoId: 'p1',
          rating: 5,
          comentario: 'x'.repeat(2002),
        })
      )
    ).rejects.toMatchObject({code: 'invalid-argument'});
  });

  test('rechaza paseo completado sin cuidador asignado', async () => {
    seedPaseo('p1', {id_cuidador: null});
    await expect(
      handler(
        req('tutor-1', {
          tipo: 'evaluacion_cuidador',
          objetivo: 'cuidador-1',
          contextoId: 'p1',
          rating: 5,
        })
      )
    ).rejects.toMatchObject({code: 'failed-precondition'});
  });

  test('acepta paseo en FINALIZADO (ventana de evaluación abierta)', async () => {
    seedPaseo('p1', {estado: 'FINALIZADO'});
    const res = await handler(
      req('tutor-1', {
        tipo: 'evaluacion_cuidador',
        objetivo: 'cuidador-1',
        contextoId: 'p1',
        rating: 5,
      })
    );
    expect(res.success).toBe(true);
  });

  test('acepta rating límite 1', async () => {
    seedPaseo('p1');
    const res = await handler(
      req('tutor-1', {
        tipo: 'evaluacion_cuidador',
        objetivo: 'cuidador-1',
        contextoId: 'p1',
        rating: 1,
      })
    );
    expect(res.success).toBe(true);
    expect(
      db.__docs.get('evaluaciones/evaluacion_cuidador_tutor-1_cuidador-1_p1')
        .datos.rating
    ).toBe(1);
  });

  test('trimea el comentario', async () => {
    seedPaseo('p1');
    await handler(
      req('tutor-1', {
        tipo: 'evaluacion_cuidador',
        objetivo: 'cuidador-1',
        contextoId: 'p1',
        rating: 5,
        comentario: '   Excelente servicio   ',
      })
    );
    const doc = db.__docs.get('evaluaciones/evaluacion_cuidador_tutor-1_cuidador-1_p1');
    expect(doc.datos.comentario).toBe('Excelente servicio');
  });

  test('observación de mascota sin campos cualitativos es válida (solo comentario)', async () => {
    seedPaseo('p1');
    const res = await handler(
      req('cuidador-1', {
        tipo: 'evaluacion_mascota',
        objetivo: 'mascota-1',
        contextoId: 'p1',
        comentario: 'Se portó bien',
      })
    );
    expect(res.success).toBe(true);
    const doc = db.__docs.get('evaluaciones/evaluacion_mascota_cuidador-1_mascota-1_p1');
    expect(doc.datos).toEqual({comentario: 'Se portó bien'});
  });

  test('observación de mascota pasa si el paseo no declara mascota_ids', async () => {
    seedPaseo('p1', {mascota_ids: undefined});
    const res = await handler(
      req('cuidador-1', {
        tipo: 'evaluacion_mascota',
        objetivo: 'mascota-1',
        contextoId: 'p1',
        ritmo: 'tranquilo',
      })
    );
    expect(res.success).toBe(true);
  });

  test('rechaza campo cualitativo demasiado largo', async () => {
    seedPaseo('p1');
    await expect(
      handler(
        req('cuidador-1', {
          tipo: 'evaluacion_mascota',
          objetivo: 'mascota-1',
          contextoId: 'p1',
          ritmo: 'x'.repeat(202),
        })
      )
    ).rejects.toMatchObject({code: 'invalid-argument'});
  });

  test('evaluacion_tutor rechaza paseo sin tutor (creado_por)', async () => {
    seedPaseo('p1', {creado_por: null});
    await expect(
      handler(
        req('cuidador-1', {
          tipo: 'evaluacion_tutor',
          objetivo: 'tutor-1',
          contextoId: 'p1',
          rating: 4,
        })
      )
    ).rejects.toMatchObject({code: 'failed-precondition'});
  });

  test('mapea errores internos de escritura a internal', async () => {
    seedPaseo('p1');
    const docOriginal = db.doc.bind(db);
    db.doc = (path: string) => {
      const ref = docOriginal(path);
      if (path.startsWith('evaluaciones/')) {
        ref.create = async () => {
          throw new Error('boom inesperado');
        };
      }
      return ref;
    };
    try {
      await expect(
        handler(
          req('tutor-1', {
            tipo: 'evaluacion_cuidador',
            objetivo: 'cuidador-1',
            contextoId: 'p1',
            rating: 5,
          })
        )
      ).rejects.toMatchObject({code: 'internal'});
    } finally {
      db.doc = docOriginal;
    }
  });

  test('guarda el comentario privado en datos (feedback solo para el evaluado)', async () => {
    seedPaseo('p1');
    const res = await handler(
      req('tutor-1', {
        tipo: 'evaluacion_cuidador',
        objetivo: 'cuidador-1',
        contextoId: 'p1',
        rating: 4,
        comentario: 'Público',
        comentario_privado: 'Solo para ti: avísame si Luna puede soltarse',
      })
    );
    expect(res.success).toBe(true);
    const doc = db.__docs.get('evaluaciones/evaluacion_cuidador_tutor-1_cuidador-1_p1');
    expect(doc.datos.comentario).toBe('Público');
    expect(doc.datos.comentario_privado).toBe(
      'Solo para ti: avísame si Luna puede soltarse'
    );
  });

  test('rechaza comentario privado demasiado largo', async () => {
    seedPaseo('p1');
    await expect(
      handler(
        req('tutor-1', {
          tipo: 'evaluacion_cuidador',
          objetivo: 'cuidador-1',
          contextoId: 'p1',
          rating: 5,
          comentario_privado: 'x'.repeat(2002),
        })
      )
    ).rejects.toMatchObject({code: 'invalid-argument'});
  });
});


