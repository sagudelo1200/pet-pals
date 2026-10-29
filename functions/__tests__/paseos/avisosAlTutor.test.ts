/**
 * Avisos al tutor durante el paseo: cuándo se avisa, a quién y sin duplicar.
 */
import * as mockFirestore from '../helpers/mockFirestore';

const mockDb = mockFirestore.crearMockDb();

jest.mock('../../src/comun/notificar', () => ({
  notificar: jest.fn().mockResolvedValue(true),
}));

import {
  VENTANA_AVISO_CHAT_MS,
  avisarCambioDePaseo,
  avisarIncidente,
  avisarMensaje,
  avisoPorEstado,
  unirNombres,
} from '../../src/paseos/avisosAlTutor';
import {notificar} from '../../src/comun/notificar';

const notificarMock = notificar as jest.Mock;

const paseo = (extra: Record<string, unknown> = {}) => ({
  tipo: 'paseo',
  estado: 'CONFIRMADO',
  creado_por: 't1',
  id_cuidador: 'c1',
  cuidador_nombre_visual: 'Ana',
  ...extra,
});

beforeEach(() => {
  mockDb.__reset();
  notificarMock.mockClear().mockResolvedValue(true);
});

describe('avisoPorEstado', () => {
  test.each([
    ['EN_CAMINO', 'PASEO_EN_CAMINO'],
    ['EN_PUNTO_RECOGIDA', 'PASEO_EN_PUNTO'],
    ['EN_PROGRESO', 'PASEO_INICIADO'],
    ['FINALIZADO', 'PASEO_FINALIZADO'],
  ])('al pasar a %s se avisa %s', (estado, tipo) => {
    expect(avisoPorEstado(paseo(), paseo({estado}))).toBe(tipo);
  });

  test('sin cambio de estado, o al aceptar o completar, no se avisa aquí', () => {
    expect(avisoPorEstado(paseo(), paseo({otro: 1}))).toBeNull();
    expect(avisoPorEstado(paseo({estado: 'PENDIENTE'}), paseo())).toBeNull();
    expect(avisoPorEstado(paseo({estado: 'FINALIZADO'}), paseo({estado: 'COMPLETADO'})))
      .toBeNull();
  });

  test('cancelar avisa solo si lo canceló el cuidador', () => {
    const cancelado = (por: string) =>
      paseo({estado: 'CANCELADO', actualizado_por: por});
    expect(avisoPorEstado(paseo(), cancelado('c1'))).toBe('PASEO_CANCELADO');
    expect(avisoPorEstado(paseo(), cancelado('t1'))).toBeNull();
    expect(avisoPorEstado(paseo(), paseo({
      estado: 'CANCELADO', id_cuidador: undefined, actualizado_por: 't1',
    }))).toBeNull();
  });
});

describe('unirNombres', () => {
  test('lee bien uno, dos o varios nombres', () => {
    expect(unirNombres([])).toBe('tu mascota');
    expect(unirNombres(['Max'])).toBe('Max');
    expect(unirNombres(['Max', 'Luna'])).toBe('Max y Luna');
    expect(unirNombres(['Max', 'Luna', 'Rex'])).toBe('Max, Luna y Rex');
  });
});

describe('avisarCambioDePaseo', () => {
  test('avisa al tutor con el cuidador y sus mascotas, con clave que evita duplicar', async () => {
    mockDb.__seed('operaciones/p1/mascotas/m1', {id_usuario: 't1', nombre: 'Max'});
    const creados = await avisarCambioDePaseo(mockDb, 'p1', paseo(),
      paseo({estado: 'EN_PUNTO_RECOGIDA'}));
    expect(creados).toBe(1);
    expect(notificarMock).toHaveBeenCalledWith(mockDb, {
      tipo: 'PASEO_EN_PUNTO',
      uid: 't1',
      dedup_key: 'paseo_p1_EN_PUNTO_RECOGIDA_t1',
      datos: {paseo_id: 'p1', cuidador: 'Ana', mascotas: 'Max'},
    });
  });

  test('en un paseo compartido cada tutor recibe lo suyo', async () => {
    mockDb.__seed('operaciones/p1/mascotas/m1', {id_usuario: 't1', nombre: 'Max'});
    mockDb.__seed('operaciones/p1/mascotas/m2', {id_usuario: 't2', nombre: 'Luna'});
    mockDb.__seed('operaciones/p1/mascotas/m3', {id_usuario: 't2', nombre: 'Rex'});
    await avisarCambioDePaseo(mockDb, 'p1', paseo(), paseo({estado: 'FINALIZADO'}));
    const destinos = notificarMock.mock.calls.map(([, s]) => [s.uid, s.datos.mascotas]);
    expect(destinos).toEqual([['t1', 'Max'], ['t2', 'Luna y Rex']]);
  });

  test('el que creó el paseo recibe el aviso aunque no haya mascotas anotadas', async () => {
    await avisarCambioDePaseo(mockDb, 'p1', paseo(), paseo({estado: 'EN_CAMINO'}));
    expect(notificarMock.mock.calls[0][1]).toMatchObject({
      uid: 't1', datos: {mascotas: 'tu mascota'},
    });
  });

  test('sin aviso para ese cambio no escribe nada', async () => {
    expect(await avisarCambioDePaseo(mockDb, 'p1', paseo({estado: 'PENDIENTE'}), paseo()))
      .toBe(0);
    expect(notificarMock).not.toHaveBeenCalled();
  });

  test('un aviso que ya existía no cuenta como creado', async () => {
    notificarMock.mockResolvedValue(false);
    expect(await avisarCambioDePaseo(mockDb, 'p1', paseo(), paseo({estado: 'EN_CAMINO'})))
      .toBe(0);
  });
});

describe('avisarIncidente', () => {
  test('avisa a los tutores, una vez por incidente', async () => {
    mockDb.__seed('operaciones/p1', paseo({estado: 'EN_PROGRESO'}));
    mockDb.__seed('operaciones/p1/mascotas/m1', {id_usuario: 't1', nombre: 'Max'});
    expect(await avisarIncidente(mockDb, 'p1', 'e9')).toBe(1);
    expect(notificarMock).toHaveBeenCalledWith(mockDb, expect.objectContaining({
      tipo: 'INCIDENTE_PASEO', uid: 't1', dedup_key: 'incidente_e9_t1',
    }));
  });

  test('un paseo que no existe no avisa', async () => {
    expect(await avisarIncidente(mockDb, 'nada', 'e1')).toBe(0);
  });
});

describe('avisarMensaje', () => {
  const AHORA = 1_800_000_000_000;
  beforeEach(() => {
    mockDb.__seed('conversaciones/p1', {participantes: ['t1', 'c1']});
    mockDb.__seed('perfiles_publicos/c1', {nombre: 'Ana'});
  });

  test('avisa al otro participante con quién escribe y el texto', async () => {
    const creados = await avisarMensaje(mockDb, 'p1',
      {autor_uid: 'c1', tipo_mensaje: 'texto', contenido: 'Ya voy llegando'}, AHORA);
    expect(creados).toBe(1);
    expect(notificarMock).toHaveBeenCalledWith(mockDb, {
      tipo: 'MENSAJE_PASEO',
      uid: 't1',
      dedup_key: `chat_p1_t1_${Math.floor(AHORA / VENTANA_AVISO_CHAT_MS)}`,
      datos: {paseo_id: 'p1', de: 'Ana', texto: 'Ya voy llegando'},
    });
  });

  test('los mensajes del sistema no avisan', async () => {
    expect(await avisarMensaje(mockDb, 'p1',
      {autor_uid: 'SISTEMA', tipo_mensaje: 'sistema', contenido: 'x'}, AHORA)).toBe(0);
    expect(notificarMock).not.toHaveBeenCalled();
  });

  test('una racha de mensajes comparte el mismo aviso (misma clave en la ventana)', async () => {
    const m = {autor_uid: 'c1', tipo_mensaje: 'texto', contenido: 'hola'};
    await avisarMensaje(mockDb, 'p1', m, AHORA);
    await avisarMensaje(mockDb, 'p1', m, AHORA + 60_000);
    const claves = notificarMock.mock.calls.map(([, s]) => s.dedup_key);
    expect(claves[0]).toBe(claves[1]);
  });

  test('el texto largo se recorta', async () => {
    await avisarMensaje(mockDb, 'p1',
      {autor_uid: 'c1', tipo_mensaje: 'texto', contenido: 'x'.repeat(500)}, AHORA);
    expect(notificarMock.mock.calls[0][1].datos.texto).toHaveLength(120);
  });
});
