/**
 * Tests de la escalada automática de solicitudes dirigidas (30 minutos).
 */

import * as mockFirestore from '../helpers/mockFirestore';

// El código usa comun/firebaseAdminCompat (firebase-admin v14 modular): se
// le entrega el mismo mock de firebase-admin para no cargar el SDK real
jest.mock('../../src/comun/firebaseAdminCompat', () => ({
  __esModule: true,
  default: jest.requireMock('firebase-admin'),
}));

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

// Los mocks devuelven el handler y exponen la configuración para verificarla
jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: (path: string, handler: any) =>
    Object.assign(handler, {__path: path}),
}));
jest.mock('firebase-functions/v2/https', () => ({
  onRequest: (opts: unknown, handler: any) => Object.assign(handler, {__opts: opts}),
}));

jest.mock('@google-cloud/tasks', () => {
  const createTask = jest.fn().mockResolvedValue({});
  const queuePath = jest.fn(
    (p: string, l: string, q: string) => `projects/${p}/locations/${l}/queues/${q}`
  );
  const instancia = {queuePath, createTask};
  return {CloudTasksClient: jest.fn(() => instancia)};
});

import {onCrearPaseoDirecto, escalarPaseoIndividual} from '../../src/paseos/escalarSolicitudes';

const adminMock = jest.requireMock('firebase-admin') as any;
const db = adminMock.firestore();
const {CloudTasksClient} = jest.requireMock('@google-cloud/tasks') as any;
const tasks = new CloudTasksClient();

const trigger = onCrearPaseoDirecto as any;
const http = escalarPaseoIndividual as any;

function evento(id: string, data: Record<string, unknown>) {
  return {data: {id, data: () => data}, params: {operacionId: id}};
}

function respuesta() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const paseoDirecto = {
  tipo: 'paseo',
  estado: 'PENDIENTE',
  id_cuidador: 'c1',
  cuidador_nombre_visual: 'Ana',
  creado_por: 't1',
};

describe('onCrearPaseoDirecto (programación de la escalada)', () => {
  const projectOriginal = process.env.GCLOUD_PROJECT;

  beforeEach(() => {
    db.__reset();
    jest.clearAllMocks();
    process.env.GCLOUD_PROJECT = 'proyecto-test';
    delete process.env.TASKS_SA_EMAIL;
  });

  afterAll(() => {
    process.env.GCLOUD_PROJECT = projectOriginal;
  });

  it('escucha la creación de documentos en operaciones/{operacionId}', () => {
    expect(trigger.__path).toBe('operaciones/{operacionId}');
  });

  it('programa la escalada 30 minutos después con token OIDC', async () => {
    const antes = Math.floor(Date.now() / 1000);

    await trigger(evento('p1', paseoDirecto));

    expect(tasks.createTask).toHaveBeenCalledTimes(1);
    const {parent, task} = tasks.createTask.mock.calls[0][0];
    expect(parent).toContain('queues/escaladas-directas');
    expect(task.scheduleTime.seconds - antes).toBeGreaterThanOrEqual(1800);
    expect(task.scheduleTime.seconds - antes).toBeLessThan(1805);
    expect(task.httpRequest.url).toContain('escalarPaseoIndividual');
    expect(task.httpRequest.oidcToken.serviceAccountEmail).toBe(
      'proyecto-test@appspot.gserviceaccount.com'
    );
    const payload = JSON.parse(Buffer.from(task.httpRequest.body, 'base64').toString());
    expect(payload).toEqual({paseoId: 'p1', cuidadorOriginal: 'c1', cuidadorNombre: 'Ana'});
  });

  it('usa TASKS_SA_EMAIL si está configurada', async () => {
    process.env.TASKS_SA_EMAIL = 'tareas@proyecto-test.iam.gserviceaccount.com';

    await trigger(evento('p1', paseoDirecto));

    const {task} = tasks.createTask.mock.calls[0][0];
    expect(task.httpRequest.oidcToken.serviceAccountEmail).toBe(
      'tareas@proyecto-test.iam.gserviceaccount.com'
    );
  });

  it.each([
    ['solicitud abierta (sin cuidador)', {...paseoDirecto, id_cuidador: undefined}],
    ['otro tipo de operación', {...paseoDirecto, tipo: 'guarderia'}],
    ['paseo no PENDIENTE', {...paseoDirecto, estado: 'CONFIRMADO'}],
  ])('no programa nada para %s', async (_caso, data) => {
    await trigger(evento('p1', data));
    expect(tasks.createTask).not.toHaveBeenCalled();
  });

  it('un error de Cloud Tasks no rompe el trigger', async () => {
    tasks.createTask.mockRejectedValueOnce(new Error('cola inexistente'));
    await expect(trigger(evento('p1', paseoDirecto))).resolves.toBeUndefined();
  });
});

describe('escalarPaseoIndividual (HTTP invocado por Cloud Tasks)', () => {
  beforeEach(() => {
    db.__reset();
    jest.clearAllMocks();
  });

  it('es privada (solo invocable con credenciales)', () => {
    expect(http.__opts).toEqual(expect.objectContaining({invoker: 'private'}));
  });

  it('solo acepta POST', async () => {
    const res = respuesta();
    await http({method: 'GET', body: {}}, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('exige paseoId', async () => {
    const res = respuesta();
    await http({method: 'POST', body: {}}, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('convierte la solicitud dirigida en abierta, registra el evento y notifica al tutor', async () => {
    db.__seed('operaciones/p1', paseoDirecto);
    const res = respuesta();

    await http(
      {method: 'POST', body: {paseoId: 'p1', cuidadorOriginal: 'c1', cuidadorNombre: 'Ana'}},
      res
    );

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({success: true}));
    const paseo = db.__docs.get('operaciones/p1');
    // FieldValue.delete() elimina el campo: la solicitud queda sin cuidador
    expect(paseo).not.toHaveProperty('id_cuidador');
    expect(paseo.actualizado_por).toBe('SISTEMA_ESCALADA');

    const eventos = [...db.__docs.entries()].filter(([p]) =>
      p.startsWith('operaciones/p1/eventos/')
    );
    expect(eventos).toHaveLength(1);
    expect(eventos[0][1].evento).toBe('ESCALADA_AUTOMATICA');
    expect(eventos[0][1].payload.razon).toContain('30 minutos');

    await new Promise(r => setImmediate(r)); // notificación fire-and-forget
    const notifs = [...db.__docs.keys()].filter(p => p.startsWith('usuarios/t1/notificaciones/'));
    expect(notifs).toHaveLength(1);
  });

  it('es idempotente: si ya fue aceptado no escala', async () => {
    db.__seed('operaciones/p1', {...paseoDirecto, estado: 'CONFIRMADO'});
    const res = respuesta();

    await http({method: 'POST', body: {paseoId: 'p1'}}, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({success: false}));
    expect(db.__docs.get('operaciones/p1').id_cuidador).toBe('c1');
  });

  it('no escala solicitudes que ya son abiertas', async () => {
    db.__seed('operaciones/p1', {...paseoDirecto, id_cuidador: undefined});
    const res = respuesta();

    await http({method: 'POST', body: {paseoId: 'p1'}}, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({success: false, razon: 'Ya es solicitud abierta'})
    );
  });

  it('paseo inexistente', async () => {
    const res = respuesta();
    await http({method: 'POST', body: {paseoId: 'nope'}}, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({success: false, razon: 'Paseo no existe'})
    );
  });
});
