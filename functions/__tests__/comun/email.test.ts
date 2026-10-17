/**
 * Tests del envío de emails con respaldo (SendGrid → Hostinger).
 */

jest.mock('firebase-functions', () => ({
  logger: {info: jest.fn(), warn: jest.fn(), error: jest.fn()},
}));

jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: {setApiKey: jest.fn(), send: jest.fn()},
}));

jest.mock('hostinger-mail-api-sdk', () => {
  const sendEmail = jest.fn();
  return {
    Configuration: jest.fn((params: unknown) => ({params})),
    SendApi: jest.fn(() => ({sendEmail})),
    __sendEmail: sendEmail,
  };
});

import {
  enviarEmail,
  describirErrorEmail,
  REMITENTE_EMAIL,
  SECRETOS_EMAIL,
} from '../../src/comun/email';

const sgMail = (jest.requireMock('@sendgrid/mail') as any).default;
const hostinger = jest.requireMock('hostinger-mail-api-sdk') as any;
const logger = (jest.requireMock('firebase-functions') as any).logger;

const EMAIL = {to: 'tutor@correo.co', subject: 'Código', html: '<b>123456</b>'};
const errorSendGrid = (msg: string) => ({response: {body: {errors: [{message: msg}]}}});

describe('enviarEmail', () => {
  const envOriginal = {...process.env};

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SENDGRID_API_KEY = 'SG.test';
    process.env.HOSTINGER_MAIL_TOKEN = 'token-hostinger';
    process.env.HOSTINGER_MAILBOX_ID = 'buzon-123';
    sgMail.send.mockResolvedValue([{statusCode: 202}]);
    hostinger.__sendEmail.mockResolvedValue({status: 204});
  });

  afterAll(() => {
    process.env = envOriginal;
  });

  it('declara los secretos de ambos proveedores', () => {
    expect(SECRETOS_EMAIL).toEqual([
      'SENDGRID_API_KEY',
      'HOSTINGER_MAIL_TOKEN',
      'HOSTINGER_MAILBOX_ID',
    ]);
  });

  it('envía con SendGrid desde no-responder y no toca Hostinger', async () => {
    const proveedor = await enviarEmail(EMAIL);

    expect(proveedor).toBe('sendgrid');
    expect(sgMail.setApiKey).toHaveBeenCalledWith('SG.test');
    expect(sgMail.send).toHaveBeenCalledWith({
      to: 'tutor@correo.co',
      from: {email: 'no-responder@paw-path.com.co', name: 'Paw-Path'},
      subject: 'Código',
      html: '<b>123456</b>',
    });
    expect(hostinger.__sendEmail).not.toHaveBeenCalled();
    expect(REMITENTE_EMAIL).toBe('no-responder@paw-path.com.co');
  });

  it('si SendGrid falla (sin créditos), envía con Hostinger desde el buzón configurado', async () => {
    sgMail.send.mockRejectedValue(errorSendGrid('Maximum credits exceeded'));

    const proveedor = await enviarEmail(EMAIL);

    expect(proveedor).toBe('hostinger');
    expect(hostinger.Configuration).toHaveBeenCalledWith({accessToken: 'token-hostinger'});
    expect(hostinger.__sendEmail).toHaveBeenCalledWith('buzon-123', {
      to: ['tutor@correo.co'],
      displayName: 'Paw-Path',
      subject: 'Código',
      html: '<b>123456</b>',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Maximum credits exceeded')
    );
  });

  it('sin API key de SendGrid pasa directo a Hostinger', async () => {
    delete process.env.SENDGRID_API_KEY;

    const proveedor = await enviarEmail(EMAIL);

    expect(proveedor).toBe('hostinger');
    expect(sgMail.send).not.toHaveBeenCalled();
  });

  it('si fallan ambos lanza un error con los dos motivos', async () => {
    sgMail.send.mockRejectedValue(errorSendGrid('Maximum credits exceeded'));
    hostinger.__sendEmail.mockRejectedValue({
      response: {status: 403, data: {message: 'Token not authorized'}},
    });

    await expect(enviarEmail(EMAIL)).rejects.toThrow(
      'SendGrid: Maximum credits exceeded | Hostinger: HTTP 403 - Token not authorized'
    );
    expect(logger.error).toHaveBeenCalled();
  });

  it('si Hostinger no está configurado lo indica junto al error de SendGrid', async () => {
    sgMail.send.mockRejectedValue(errorSendGrid('Maximum credits exceeded'));
    delete process.env.HOSTINGER_MAILBOX_ID;

    await expect(enviarEmail(EMAIL)).rejects.toThrow(
      'SendGrid: Maximum credits exceeded | Hostinger: Hostinger no configurado'
    );
    expect(hostinger.__sendEmail).not.toHaveBeenCalled();
  });
});

describe('describirErrorEmail', () => {
  it.each([
    [errorSendGrid('Bad key'), 'Bad key'],
    [{response: {status: 502}}, 'HTTP 502'],
    [{response: {status: 422, data: {message: 'to inválido'}}}, 'HTTP 422 - to inválido'],
    [
      {response: {status: 403, data: {error: 'Token is not authorized.', code: 'ERR_FORBIDDEN'}}},
      'HTTP 403 - ERR_FORBIDDEN: Token is not authorized.',
    ],
    [new Error('timeout'), 'timeout'],
    [undefined, 'Error desconocido'],
  ])('%p → %s', (error, esperado) => {
    expect(describirErrorEmail(error)).toBe(esperado);
  });
});
