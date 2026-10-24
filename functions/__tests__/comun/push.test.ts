/* eslint-disable camelcase */
import {enviarPush, URL_PUSH_EXPO} from '../../src/comun/push';
import {crearMockDb} from '../helpers/mockFirestore';

const db = crearMockDb();
const mensaje = {titulo: 'Hola', cuerpo: 'Mundo', datos: {accion: 'pagar'}};

const respuesta = (data: unknown, ok = true, status = 200) =>
  jest.fn().mockResolvedValue({ok, status, json: async () => ({data})});

describe('enviarPush', () => {
  beforeEach(() => {
    db.__reset();
    db.__seed('usuarios/u1/dispositivos/a', {token: 'ExponentPushToken[a]', activo: true});
    db.__seed('usuarios/u1/dispositivos/b', {token: 'ExponentPushToken[b]', activo: true});
    db.__seed('usuarios/u1/dispositivos/c', {token: 'ExponentPushToken[c]', activo: false});
  });

  it('envía solo a dispositivos activos', async () => {
    const http = respuesta([{status: 'ok'}, {status: 'ok'}]);
    expect(await enviarPush(db, 'u1', mensaje, http)).toBe('ENVIADA');

    const [url, init] = http.mock.calls[0];
    expect(url).toBe(URL_PUSH_EXPO);
    const cuerpo = JSON.parse(init.body);
    expect(cuerpo.map((m: any) => m.to)).toEqual(
      ['ExponentPushToken[a]', 'ExponentPushToken[b]']);
    expect(cuerpo[0]).toMatchObject({title: 'Hola', body: 'Mundo', data: {accion: 'pagar'}});
  });

  it('sin dispositivos activos no llama a Expo', async () => {
    const http = respuesta([]);
    expect(await enviarPush(db, 'otro', mensaje, http)).toBe('SIN_DISPOSITIVOS');
    expect(http).not.toHaveBeenCalled();
  });

  it('desactiva el token que Expo reporta como no registrado', async () => {
    const http = respuesta([
      {status: 'ok'},
      {status: 'error', details: {error: 'DeviceNotRegistered'}},
    ]);
    expect(await enviarPush(db, 'u1', mensaje, http)).toBe('ENVIADA');
    expect(db.__docs.get('usuarios/u1/dispositivos/b').activo).toBe(false);
    expect(db.__docs.get('usuarios/u1/dispositivos/a').activo).toBe(true);
  });

  it('si todos fallan queda FALLIDA', async () => {
    const http = respuesta([{status: 'error'}, {status: 'error'}]);
    expect(await enviarPush(db, 'u1', mensaje, http)).toBe('FALLIDA');
  });

  it('lanza si el servicio de Expo responde con error', async () => {
    const http = respuesta([], false, 503);
    await expect(enviarPush(db, 'u1', mensaje, http)).rejects.toThrow('503');
  });
});
