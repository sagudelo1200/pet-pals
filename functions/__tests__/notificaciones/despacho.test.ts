/* eslint-disable camelcase */
jest.mock('firebase-functions', () => ({
  logger: {info: jest.fn(), warn: jest.fn(), error: jest.fn()},
}));
jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: {setApiKey: jest.fn(), send: jest.fn()},
}));
jest.mock('hostinger-mail-api-sdk', () => ({
  Configuration: jest.fn(),
  SendApi: jest.fn(),
}));

import {
  canalesDeEnvio,
  CATALOGO_NOTIFICACIONES,
} from '../../src/compartido/notificaciones';
import {
  despacharAviso,
  emailAUsuario,
  SIN_DESTINO,
} from '../../src/notificaciones/despacho';
import {htmlNotificacion} from '../../src/notificaciones/emailHtml';
import {crearMockDb} from '../helpers/mockFirestore';

const db = crearMockDb();
const sgMail = (jest.requireMock('@sendgrid/mail') as any).default;

const emisores = () => ({
  push: jest.fn().mockResolvedValue('ENVIADA'),
  email: jest.fn().mockResolvedValue('ENVIADA'),
});
const escalada = {tipo: 'SOLICITUD_ESCALADA' as const, titulo: 'T', cuerpo: 'C'};
const cobro = {tipo: 'COBRO_PENDIENTE' as const, titulo: 'T', cuerpo: 'C'};
const mensaje = {titulo: 'Hola', cuerpo: 'x', datos: {}};

describe('canalesDeEnvio', () => {
  const opcional = CATALOGO_NOTIFICACIONES.SOLICITUD_ESCALADA;
  const obligatoria = CATALOGO_NOTIFICACIONES.COBRO_PENDIENTE;

  it('sin preferencias usa los canales del catálogo menos la bandeja', () => {
    expect(canalesDeEnvio(opcional)).toEqual(['push']);
    expect(canalesDeEnvio(obligatoria)).toEqual(['push', 'email']);
  });

  it('respeta lo que el usuario apagó', () => {
    expect(canalesDeEnvio(opcional, {push: false})).toEqual([]);
  });

  it('los avisos obligatorios ignoran las preferencias', () => {
    expect(canalesDeEnvio(obligatoria, {push: false, email: false}))
      .toEqual(['push', 'email']);
  });
});

describe('despacharAviso', () => {
  beforeEach(() => db.__reset());

  it('envía por los canales del catálogo y devuelve su estado', async () => {
    const e = emisores();
    expect(await despacharAviso(db, 'u1', cobro, e))
      .toEqual({push: 'ENVIADA', email: 'ENVIADA'});
    expect(e.push).toHaveBeenCalledWith(
      'u1', {titulo: 'T', cuerpo: 'C', datos: {}});
  });

  it('omite el canal que el usuario apagó', async () => {
    db.__seed('usuarios/u1/preferencias/notificaciones',
      {push: false, email: true});
    const e = emisores();
    expect(await despacharAviso(db, 'u1', escalada, e)).toEqual({});
    expect(e.push).not.toHaveBeenCalled();
  });

  it('un canal que falla no impide los demás', async () => {
    const e = emisores();
    e.push.mockRejectedValue(new Error('caído'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await despacharAviso(db, 'u1', cobro, e))
      .toEqual({push: 'FALLIDA', email: 'ENVIADA'});
  });
});

describe('emailAUsuario', () => {
  const anterior = process.env.SENDGRID_API_KEY;
  beforeEach(() => {
    db.__reset();
    sgMail.send.mockReset().mockResolvedValue(undefined);
    process.env.SENDGRID_API_KEY = 'SG.test';
  });
  afterAll(() => {
    if (anterior === undefined) delete process.env.SENDGRID_API_KEY;
    else process.env.SENDGRID_API_KEY = anterior;
  });

  it('envía al correo del usuario con el título como asunto', async () => {
    db.__seed('usuarios/u1', {correo: 'a@b.co'});
    expect(await emailAUsuario(db, 'u1', mensaje)).toBe('ENVIADA');
    expect(sgMail.send).toHaveBeenCalledWith(
      expect.objectContaining({to: 'a@b.co', subject: 'Hola'}));
  });

  it('sin correo no envía', async () => {
    db.__seed('usuarios/u1', {});
    expect(await emailAUsuario(db, 'u1', mensaje)).toBe(SIN_DESTINO);
    expect(sgMail.send).not.toHaveBeenCalled();
  });
});

describe('htmlNotificacion', () => {
  it('escapa el texto', () => {
    const html = htmlNotificacion('<b>Hola</b>', 'a & b');
    expect(html).not.toContain('<b>Hola</b>');
    expect(html).toContain('&lt;b&gt;Hola&lt;/b&gt;');
    expect(html).toContain('a &amp; b');
  });
});
