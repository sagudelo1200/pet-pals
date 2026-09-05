/**
 * Tests unitarios del trigger `alCrearEvaluacion` (agregación + propagación).
 *
 * Se mockean `firebase-admin`, `firebase-admin/firestore`,
 * `firebase-functions/v2/firestore` y `h3-js` (gridDisk → celdas fijas).
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

jest.mock('firebase-admin/firestore', () => ({
  Timestamp: mockFirestore.MOCK_TIMESTAMP,
}));

jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: (_path: string, handler: unknown) => handler,
}));

// Cloud Tasks: el trigger programa la revelación por ventana (event-driven).
// Instancia singleton para que el módulo (que cachea el cliente) y los tests
// compartan los mismos jest.fn.
jest.mock('@google-cloud/tasks', () => {
  const createTask = jest.fn().mockResolvedValue({});
  const queuePath = jest.fn(
    (projectId: string, location: string, queue: string) =>
      `projects/${projectId}/locations/${location}/queues/${queue}`
  );
  const instancia = {queuePath, createTask};
  return {CloudTasksClient: jest.fn(() => instancia)};
});

jest.mock('h3-js', () => ({
  gridDisk: jest.fn(() => ['celda-a', 'celda-b']),
}));

import {alCrearEvaluacion} from '../../src/evaluaciones/alCrearEvaluacion';

type Evento = {
  data?: { data: () => Record<string, unknown> | undefined }
  params: Record<string, string>
}

// El mock de onDocumentCreated devuelve el handler directamente
const trigger = alCrearEvaluacion as unknown as (event: Evento) => Promise<void>;

const adminMock = jest.requireMock('firebase-admin') as any;
const db = adminMock.firestore();

function evaluacionDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tipo: 'evaluacion_cuidador',
    actor: {tipo: 'usuario', id: 'tutor-1'},
    objetivo: {tipo: 'usuario', id: 'cuidador-1'},
    contexto: {tipo: 'paseo', id: 'p1'},
    datos: {rating: 5, comentario: ''},
    ...overrides,
  };
}

function evento(data?: Record<string, unknown>): Evento {
  const id = (data?.id as string) || 'eval-1';
  // En producción el doc ya existe (el trigger se dispara por su creación);
  // se siembra automáticamente para que las escrituras del trigger funcionen.
  if (data && !db.__docs.has(`evaluaciones/${id}`)) {
    db.__seed(`evaluaciones/${id}`, data);
  }
  return {
    data: data ? {data: () => data} : undefined,
    params: {evaluacionId: id},
  };
}

describe('alCrearEvaluacion (trigger)', () => {
  beforeEach(() => {
    db.__reset();
    jest.clearAllMocks();
  });

  test('sin datos no lanza ni escribe nada', async () => {
    await trigger(evento(undefined));
    expect(db.__docs.size).toBe(0);
  });

  test('sin objetivo.id no lanza', async () => {
    await trigger(evento(evaluacionDoc({objetivo: undefined})));
    // No debe escribir ningún resumen ni cache
    const escritos = [...db.__docs.keys()].filter(
      (k) => !k.startsWith('evaluaciones/')
    );
    expect(escritos).toHaveLength(0);
  });

  test('crea resumen nuevo con desgloses separados por tipo', async () => {
    db.__seed('evaluaciones/e1', evaluacionDoc({id: 'e1', datos: {rating: 5}}));
    db.__seed('evaluaciones/e2', evaluacionDoc({id: 'e2', datos: {rating: 4}}));
    db.__seed('evaluaciones/e3', evaluacionDoc({id: 'e3', datos: {rating: 3}}));

    await trigger(evento(evaluacionDoc({id: 'e3', datos: {rating: 3}})));

    const resumen = db.__docs.get('resumenes_evaluacion/cuidador-1');
    expect(resumen).toBeDefined();
    expect(resumen.evaluaciones_cuidador).toEqual({promedio: 4, cantidad: 3});
    expect(resumen.evaluaciones_tutor).toEqual({promedio: 0, cantidad: 0});
    expect(resumen.evaluaciones_mascota).toEqual({promedio: 0, cantidad: 0});
    expect(resumen.objetivo).toEqual({tipo: 'usuario', id: 'cuidador-1'});
    expect(resumen.creado_por).toBe('sistema-cf-evaluaciones');
  });

  test('actualiza resumen existente SIN pisar creado_en', async () => {
    db.__seed('evaluaciones/e1', evaluacionDoc({id: 'e1', datos: {rating: 5}}));
    db.__seed('evaluaciones/e2', evaluacionDoc({id: 'e2', datos: {rating: 4}}));
    db.__seed('resumenes_evaluacion/cuidador-1', {
      objetivo: {tipo: 'usuario', id: 'cuidador-1'},
      evaluaciones_cuidador: {promedio: 5, cantidad: 1},
      creado_en: {marca: 'original'},
      creado_por: 'sistema-cf-evaluaciones',
    });

    await trigger(evento(evaluacionDoc({id: 'e2', datos: {rating: 4}})));

    const resumen = db.__docs.get('resumenes_evaluacion/cuidador-1');
    expect(resumen.creado_en).toEqual({marca: 'original'});
    expect(resumen.creado_por).toBe('sistema-cf-evaluaciones');
    expect(resumen.evaluaciones_cuidador).toEqual({promedio: 4.5, cantidad: 2});
  });

  test('evaluacion_cuidador propaga rating a PerfilPublico e índice H3', async () => {
    db.__seed('evaluaciones/e1', evaluacionDoc({id: 'e1', datos: {rating: 5}}));
    db.__seed('perfiles_publicos/cuidador-1', {
      nombre: 'Cuidador Uno',
      h3_r8: 'h3origen',
      rating_promedio: 0,
    });
    db.__seed('indice_cobertura/celda-a/cuidadores/cuidador-1', {
      uid: 'cuidador-1',
      rating_promedio: 0,
    });

    await trigger(evento(evaluacionDoc({id: 'e2', datos: {rating: 5}})));

    const perfil = db.__docs.get('perfiles_publicos/cuidador-1');
    expect(perfil.rating_promedio).toBe(5);

    // celda-a existe → se actualiza; celda-b no existe → allSettled la ignora
    const indice = db.__docs.get('indice_cobertura/celda-a/cuidadores/cuidador-1');
    expect(indice.rating_promedio).toBe(5);
  });

  test('evaluacion_cuidador con perfil inexistente NO crea perfil fantasma', async () => {
    db.__seed('evaluaciones/e1', evaluacionDoc({id: 'e1', datos: {rating: 5}}));

    await trigger(evento(evaluacionDoc({id: 'e2', datos: {rating: 5}})));

    expect(db.__docs.has('perfiles_publicos/cuidador-1')).toBe(false);
    expect(db.__docs.has('resumenes_evaluacion/cuidador-1')).toBe(true);
  });

  test('evaluacion_tutor NO toca la reputación pública (métrica privada)', async () => {
    const docTutor = evaluacionDoc({
      id: 'e1',
      tipo: 'evaluacion_tutor',
      actor: {tipo: 'usuario', id: 'cuidador-1'},
      objetivo: {tipo: 'usuario', id: 'tutor-1'},
      datos: {rating: 4, comentario: ''},
    });
    db.__seed('evaluaciones/e1', docTutor);
    db.__seed('perfiles_publicos/tutor-1', {
      nombre: 'Tutor Uno',
      h3_r8: 'h3x',
      rating_promedio: 4.8,
    });

    await trigger(evento(docTutor));

    const perfil = db.__docs.get('perfiles_publicos/tutor-1');
    expect(perfil.rating_promedio).toBe(4.8); // intacto
    expect(db.__docs.has('indice_cobertura/celda-a/cuidadores/tutor-1')).toBe(false);

    // El resumen privado del tutor sí se agrega
    const resumen = db.__docs.get('resumenes_evaluacion/tutor-1');
    expect(resumen.evaluaciones_tutor).toEqual({promedio: 4, cantidad: 1});
  });

  test('evaluacion_mascota agrega resumen cualitativo con promedio 0', async () => {
    const docMascota = evaluacionDoc({
      id: 'e1',
      tipo: 'evaluacion_mascota',
      actor: {tipo: 'usuario', id: 'cuidador-1'},
      objetivo: {tipo: 'mascota', id: 'mascota-1'},
      datos: {ritmo: 'tranquilo', compania: 'solo', tolerancia: 'ignora', comentario: ''},
    });
    db.__seed('evaluaciones/e1', docMascota);

    await trigger(evento(docMascota));

    const resumen = db.__docs.get('resumenes_evaluacion/mascota-1');
    expect(resumen.evaluaciones_mascota).toEqual({promedio: 0, cantidad: 1});
    expect(db.__docs.has('perfiles_publicos/mascota-1')).toBe(false);
  });

  test('usa celdas_cobertura manuales si existen', async () => {
    db.__seed('evaluaciones/e1', evaluacionDoc({id: 'e1', datos: {rating: 5}}));
    db.__seed('perfiles_publicos/cuidador-1', {
      nombre: 'C',
      celdas_cobertura: ['celda-manual-1'],
      rating_promedio: 0,
    });
    db.__seed('indice_cobertura/celda-manual-1/cuidadores/cuidador-1', {
      uid: 'cuidador-1',
      rating_promedio: 0,
    });

    await trigger(evento(evaluacionDoc({id: 'e2', datos: {rating: 5}})));

    const indice = db.__docs.get('indice_cobertura/celda-manual-1/cuidadores/cuidador-1');
    expect(indice.rating_promedio).toBe(5);
  });

  test('mezcla tipos del mismo objetivo sin cruzarlos', async () => {
    db.__seed('evaluaciones/e1', evaluacionDoc({id: 'e1', datos: {rating: 5}}));
    const docTutor = evaluacionDoc({
      id: 'e2',
      tipo: 'evaluacion_tutor',
      actor: {tipo: 'usuario', id: 'otro-cuidador'},
      objetivo: {tipo: 'usuario', id: 'cuidador-1'},
      datos: {rating: 4, comentario: ''},
    });
    db.__seed('evaluaciones/e2', docTutor);

    await trigger(evento(docTutor));

    const resumen = db.__docs.get('resumenes_evaluacion/cuidador-1');
    expect(resumen.evaluaciones_cuidador).toEqual({promedio: 5, cantidad: 1});
    expect(resumen.evaluaciones_tutor).toEqual({promedio: 4, cantidad: 1});
    // Nunca se mezclan en un promedio general
    expect(resumen.evaluaciones_cuidador.promedio).not.toBe(4.5);
  });

  test('agrega un tipo nuevo a un resumen existente sin pisar lo anterior', async () => {
    db.__seed('evaluaciones/e1', evaluacionDoc({id: 'e1', datos: {rating: 5}}));
    db.__seed('resumenes_evaluacion/cuidador-1', {
      objetivo: {tipo: 'usuario', id: 'cuidador-1'},
      evaluaciones_cuidador: {promedio: 5, cantidad: 1},
      creado_en: {marca: 'original'},
      creado_por: 'sistema-cf-evaluaciones',
    });
    const docTutor = evaluacionDoc({
      id: 'e2',
      tipo: 'evaluacion_tutor',
      actor: {tipo: 'usuario', id: 'otro-cuidador'},
      objetivo: {tipo: 'usuario', id: 'cuidador-1'},
      datos: {rating: 4, comentario: ''},
    });
    db.__seed('evaluaciones/e2', docTutor);

    await trigger(evento(docTutor));

    const resumen = db.__docs.get('resumenes_evaluacion/cuidador-1');
    expect(resumen.creado_en).toEqual({marca: 'original'});
    expect(resumen.evaluaciones_cuidador).toEqual({promedio: 5, cantidad: 1});
    expect(resumen.evaluaciones_tutor).toEqual({promedio: 4, cantidad: 1});
  });

  test('redondea el promedio a 2 decimales', async () => {
    db.__seed('evaluaciones/e1', evaluacionDoc({id: 'e1', datos: {rating: 5}}));
    db.__seed('evaluaciones/e2', evaluacionDoc({id: 'e2', datos: {rating: 5}}));
    db.__seed('evaluaciones/e3', evaluacionDoc({id: 'e3', datos: {rating: 4}}));

    await trigger(evento(evaluacionDoc({id: 'e3', datos: {rating: 4}})));

    const resumen = db.__docs.get('resumenes_evaluacion/cuidador-1');
    expect(resumen.evaluaciones_cuidador).toEqual({promedio: 4.67, cantidad: 3});
  });

  test('cuidador sin h3 ni celdas: perfil actualizado, índice omitido sin error', async () => {
    db.__seed('evaluaciones/e1', evaluacionDoc({id: 'e1', datos: {rating: 5}}));
    db.__seed('perfiles_publicos/cuidador-1', {nombre: 'C', rating_promedio: 0});

    await expect(
      trigger(evento(evaluacionDoc({id: 'e2', datos: {rating: 5}})))
    ).resolves.toBeUndefined();

    expect(db.__docs.get('perfiles_publicos/cuidador-1').rating_promedio).toBe(5);
    expect(db.__docs.has('indice_cobertura/celda-a/cuidadores/cuidador-1')).toBe(false);
  });

  test('incluye desglose de evaluacion_sistema sin tocar el perfil', async () => {
    const docSistema = evaluacionDoc({
      id: 'e1',
      tipo: 'evaluacion_sistema',
      actor: {tipo: 'sistema', id: 'sistema'},
      objetivo: {tipo: 'usuario', id: 'cuidador-1'},
      datos: {rating: 4, comentario: ''},
    });
    db.__seed('evaluaciones/e1', docSistema);

    await trigger(evento(docSistema));

    const resumen = db.__docs.get('resumenes_evaluacion/cuidador-1');
    expect(resumen.evaluaciones_sistema).toEqual({promedio: 4, cantidad: 1});
    expect(db.__docs.has('perfiles_publicos/cuidador-1')).toBe(false);
  });

  test('doble ciego: marca revelada:false si la contraparte no existe', async () => {
    const doc = evaluacionDoc({id: 'e1', datos: {rating: 5}});
    db.__seed('evaluaciones/e1', doc);

    await trigger(evento(doc));

    const guardada = db.__docs.get('evaluaciones/e1');
    expect(guardada.revelada).toBe(false);
    expect(guardada.revelada_en).toBeUndefined();
  });

  test('doble ciego: marca AMBAS reveladas si la contraparte existe', async () => {
    const doc = evaluacionDoc({id: 'e1', datos: {rating: 5}});
    db.__seed('evaluaciones/e1', doc);
    // Contraparte: cuidador evalúa al tutor en el mismo paseo
    const contraparte = evaluacionDoc({
      id: 'evaluacion_tutor_cuidador-1_tutor-1_p1',
      tipo: 'evaluacion_tutor',
      actor: {tipo: 'usuario', id: 'cuidador-1'},
      objetivo: {tipo: 'usuario', id: 'tutor-1'},
      datos: {rating: 4, comentario: ''},
    });
    db.__seed('evaluaciones/evaluacion_tutor_cuidador-1_tutor-1_p1', contraparte);

    await trigger(evento(doc));

    expect(db.__docs.get('evaluaciones/e1').revelada).toBe(true);
    expect(db.__docs.get('evaluaciones/evaluacion_tutor_cuidador-1_tutor-1_p1').revelada).toBe(true);
  });

  test('doble ciego: no aplica a evaluacion_mascota', async () => {
    const doc = evaluacionDoc({
      id: 'e1',
      tipo: 'evaluacion_mascota',
      actor: {tipo: 'usuario', id: 'cuidador-1'},
      objetivo: {tipo: 'mascota', id: 'mascota-1'},
      datos: {ritmo: 'tranquilo', compania: 'solo', tolerancia: 'ignora', comentario: ''},
    });
    db.__seed('evaluaciones/e1', doc);

    await trigger(evento(doc));

    expect(db.__docs.get('evaluaciones/e1').revelada).toBeUndefined();
  });

  test('doble ciego: programa la revelación por ventana si no hay contraparte', async () => {
    process.env.GCLOUD_PROJECT = 'test-project';
    try {
      const {CloudTasksClient} = require('@google-cloud/tasks') as any;
      const doc = evaluacionDoc({id: 'e1', datos: {rating: 5}});
      db.__seed('evaluaciones/e1', doc);

      await trigger(evento(doc));

      expect(db.__docs.get('evaluaciones/e1').revelada).toBe(false);
      const client = new CloudTasksClient();
      expect(client.createTask).toHaveBeenCalledTimes(1);
      const [request] = (client.createTask as jest.Mock).mock.calls[0];
      expect(request.task.httpRequest.url).toContain(
        'revelarEvaluacionVencida'
      );
      const bodyDecodificado = Buffer.from(
        request.task.httpRequest.body,
        'base64'
      ).toString('utf8');
      expect(bodyDecodificado).toContain('e1');
      // Programada para dentro de 6 a 12 días (plazo aleatorio)
      const hoy = Math.floor(Date.now() / 1000);
      expect(request.task.scheduleTime.seconds).toBeGreaterThan(hoy + 5 * 86400);
      expect(request.task.scheduleTime.seconds).toBeLessThan(hoy + 13 * 86400);
    } finally {
      delete process.env.GCLOUD_PROJECT;
    }
  });

  test('doble ciego: no programa si la contraparte ya existe (mutua)', async () => {
    process.env.GCLOUD_PROJECT = 'test-project';
    try {
      const {CloudTasksClient} = require('@google-cloud/tasks') as any;
      const doc = evaluacionDoc({id: 'e1', datos: {rating: 5}});
      db.__seed('evaluaciones/e1', doc);
      db.__seed('evaluaciones/evaluacion_tutor_cuidador-1_tutor-1_p1', {
        tipo: 'evaluacion_tutor',
      });

      await trigger(evento(doc));

      expect(db.__docs.get('evaluaciones/e1').revelada).toBe(true);
      const client = new CloudTasksClient();
      expect(client.createTask).not.toHaveBeenCalled();
    } finally {
      delete process.env.GCLOUD_PROJECT;
    }
  });

  test('doble ciego: no programa para observaciones de mascota', async () => {
    process.env.GCLOUD_PROJECT = 'test-project';
    try {
      const {CloudTasksClient} = require('@google-cloud/tasks') as any;
      const doc = evaluacionDoc({
        id: 'e1',
        tipo: 'evaluacion_mascota',
        actor: {tipo: 'usuario', id: 'cuidador-1'},
        objetivo: {tipo: 'mascota', id: 'mascota-1'},
        datos: {ritmo: 'tranquilo', compania: 'solo', tolerancia: 'ignora', comentario: ''},
      });
      db.__seed('evaluaciones/e1', doc);

      await trigger(evento(doc));

      const client = new CloudTasksClient();
      expect(client.createTask).not.toHaveBeenCalled();
    } finally {
      delete process.env.GCLOUD_PROJECT;
    }
  });

  test('incluye distribución de ratings y reseñas públicas solo si mutuas', async () => {
    db.__seed(
      'evaluaciones/e1',
      evaluacionDoc({
        id: 'e1',
        datos: {rating: 5, comentario: 'Excelente'},
        revelada: true,
      })
    );
    const doc2 = evaluacionDoc({
      id: 'e2',
      datos: {rating: 4, comentario: 'Muy bien'},
      revelada: false,
    });
    db.__seed('evaluaciones/e2', doc2);

    await trigger(evento(doc2));

    const resumen = db.__docs.get('resumenes_evaluacion/cuidador-1');
    expect(resumen.distribucion_ratings).toEqual({
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 1,
      '5': 1,
    });
    // Solo la evaluación mutuamente revelada aparece en público, sin identidad
    expect(resumen.reseñas_publicas).toHaveLength(1);
    expect(resumen.reseñas_publicas[0]).toMatchObject({
      rating: 5,
      comentario: 'Excelente',
      contexto_id: 'p1',
    });
    expect(resumen.reseñas_publicas[0].actor).toBeUndefined();
  });

  test('observación de mascota alimenta su expediente (observaciones_recientes)', async () => {
    const doc = evaluacionDoc({
      id: 'e1',
      tipo: 'evaluacion_mascota',
      actor: {tipo: 'usuario', id: 'cuidador-1'},
      objetivo: {tipo: 'mascota', id: 'mascota-1'},
      datos: {
        ritmo: 'tranquilo',
        compania: 'solo',
        tolerancia: 'ignora',
        comentario: 'Se portó muy bien',
      },
    });
    db.__seed('evaluaciones/e1', doc);

    await trigger(evento(doc));

    const resumen = db.__docs.get('resumenes_evaluacion/mascota-1');
    expect(resumen.observaciones_recientes).toHaveLength(1);
    expect(resumen.observaciones_recientes[0]).toMatchObject({
      ritmo: 'tranquilo',
      compania: 'solo',
      tolerancia: 'ignora',
      comentario: 'Se portó muy bien',
      contexto_id: 'p1',
    });
  });

  test('el comentario privado NUNCA sale en las reseñas públicas', async () => {
    db.__seed(
      'evaluaciones/e1',
      evaluacionDoc({
        id: 'e1',
        datos: {
          rating: 5,
          comentario: 'Público',
          comentario_privado: 'Privado: avísame si Luna se porta mal',
        },
        revelada: true,
      })
    );

    await trigger(evento(evaluacionDoc({id: 'e2', datos: {rating: 4}})));

    const resumen = db.__docs.get('resumenes_evaluacion/cuidador-1');
    expect(resumen.reseñas_publicas).toHaveLength(1);
    expect(resumen.reseñas_publicas[0].comentario).toBe('Público');
    expect(resumen.reseñas_publicas[0].comentario_privado).toBeUndefined();
  });

  test('otorga SUPERHOST cuando el rating ≥ 4.8 con volumen suficiente', async () => {
    for (let i = 1; i <= 6; i++) {
      db.__seed(
        `evaluaciones/e${i}`,
        evaluacionDoc({id: `e${i}`, datos: {rating: 5}})
      );
    }
    db.__seed('perfiles_publicos/cuidador-1', {
      nombre: 'Cuidador Uno',
      insignias_verificacion: ['IDENTIDAD'],
      rating_promedio: 0,
    });

    await trigger(evento(evaluacionDoc({id: 'e6', datos: {rating: 5}})));

    const perfil = db.__docs.get('perfiles_publicos/cuidador-1');
    expect(perfil.insignias_verificacion).toContain('SUPERHOST');
  });

  test('revoca SUPERHOST si baja del umbral', async () => {
    // Promedio 2 y cantidad 2 → no cumple (promedio y volumen)
    db.__seed(
      'evaluaciones/e1',
      evaluacionDoc({id: 'e1', datos: {rating: 2}})
    );
    db.__seed(
      'evaluaciones/e2',
      evaluacionDoc({id: 'e2', datos: {rating: 2}})
    );
    db.__seed('perfiles_publicos/cuidador-1', {
      nombre: 'Cuidador Uno',
      insignias_verificacion: ['IDENTIDAD', 'SUPERHOST'],
      rating_promedio: 4.9,
    });

    await trigger(evento(evaluacionDoc({id: 'e2', datos: {rating: 2}})));

    const perfil = db.__docs.get('perfiles_publicos/cuidador-1');
    expect(perfil.insignias_verificacion).not.toContain('SUPERHOST');
    expect(perfil.insignias_verificacion).toContain('IDENTIDAD');
  });

  test('el expediente de la mascota agrega el patrón de comportamiento (chips)', async () => {
    const obs = (id: string, datos: Record<string, unknown>) =>
      evaluacionDoc({
        id,
        tipo: 'evaluacion_mascota',
        actor: {tipo: 'usuario', id: 'cuidador-1'},
        objetivo: {tipo: 'mascota', id: 'mascota-1'},
        datos: {ritmo: 'tranquilo', compania: 'solo', tolerancia: 'ignora', comentario: '', ...datos},
      });
    db.__seed('evaluaciones/e1', obs('e1', {}));
    db.__seed(
      'evaluaciones/e2',
      obs('e2', {compania: 'confiado', tolerancia: 'neutro'})
    );

    await trigger(evento(obs('e2', {compania: 'confiado', tolerancia: 'neutro'})));

    const resumen = db.__docs.get('resumenes_evaluacion/mascota-1');
    expect(resumen.comportamiento_resumen.total_observaciones).toBe(2);
    expect(resumen.comportamiento_resumen.ritmo).toEqual({
      tranquilo: 2,
      normal: 0,
      energico: 0,
    });
    expect(resumen.comportamiento_resumen.compania).toEqual({
      solo: 1,
      confiado: 1,
      sociable: 0,
    });
    expect(resumen.comportamiento_resumen.tolerancia).toEqual({
      ignora: 1,
      neutro: 1,
      receptivo: 0,
    });
  });
});


