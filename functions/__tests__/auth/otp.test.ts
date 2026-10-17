/**
 * Tests unitarios de `enviarOTP` y `validarOTP` (verificación de email).
 */

import * as mockFirestore from '../helpers/mockFirestore';

const AHORA = 1_700_000_000_000;
const mockTimestamp = (ms: number) => ({
  valueOf: () => ms,
  toMillis: () => ms,
  toDate: () => new Date(ms),
});

jest.mock('firebase-admin', () => {
  const db = mockFirestore.crearMockDb();
  const updateUser = jest.fn().mockResolvedValue({});
  return {
    apps: [],
    initializeApp: jest.fn(),
    auth: () => ({updateUser}),
    firestore: Object.assign(() => db, {
      Timestamp: {
        now: () => mockTimestamp(AHORA),
        fromDate: (d: Date) => mockTimestamp(d.getTime()),
      },
    }),
  };
});

jest.mock('firebase-functions', () => ({
  // onCall(handler) u onCall(opciones, handler): devuelve el handler
  https: {onCall: (...args: unknown[]) => args[args.length - 1]},
  logger: {info: jest.fn(), error: jest.fn(), warn: jest.fn()},
}));

jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: {setApiKey: jest.fn(), send: jest.fn().mockResolvedValue([{}])},
}));

jest.mock('hostinger-mail-api-sdk', () => {
  const sendEmail = jest.fn().mockResolvedValue({status: 204});
  return {
    Configuration: jest.fn(),
    SendApi: jest.fn(() => ({sendEmail})),
    __sendEmail: sendEmail,
  };
});

jest.mock('../../src/auth/emailTemplates', () => ({
  injectOTPData: jest.fn(() => '<html>OTP</html>'),
}));

import {enviarOTP} from '../../src/auth/enviarOTP';
import {validarOTP} from '../../src/auth/validarOTP';

type Req = { auth?: { uid: string }; data: Record<string, unknown> };
type Res = { success: boolean; error?: string };
const enviar = enviarOTP as unknown as (r: Req) => Promise<Res>;
const validar = validarOTP as unknown as (r: Req) => Promise<Res>;

const adminMock = jest.requireMock('firebase-admin') as any;
const db = adminMock.firestore();
const sgMail = (jest.requireMock('@sendgrid/mail') as any).default;
const hostinger = jest.requireMock('hostinger-mail-api-sdk') as any;

function sembrarOtp(datos: Record<string, unknown> = {}) {
  db.__seed('otp_codes/u1', {
    codigo: '123456',
    utilizado: false,
    intentos_fallidos: 0,
    expira_en: mockTimestamp(AHORA + 60_000),
    ...datos,
  });
}

describe('enviarOTP', () => {
  beforeEach(() => {
    db.__reset();
    jest.clearAllMocks();
    process.env.SENDGRID_API_KEY = 'SG.test';
    delete process.env.HOSTINGER_MAIL_TOKEN;
    delete process.env.HOSTINGER_MAILBOX_ID;
  });

  it('exige autenticación', async () => {
    const res = await enviar({data: {email: 'a@b.co', uid: 'u1'}});
    expect(res.success).toBe(false);
  });

  it('rechaza un uid distinto al autenticado', async () => {
    const res = await enviar({auth: {uid: 'otro'}, data: {email: 'a@b.co', uid: 'u1'}});
    expect(res).toEqual({success: false, error: expect.stringContaining('UID')});
  });

  it('rechaza un email con formato inválido', async () => {
    const res = await enviar({auth: {uid: 'u1'}, data: {email: 'no-es-email', uid: 'u1'}});
    expect(res.success).toBe(false);
    expect(sgMail.send).not.toHaveBeenCalled();
  });

  it('guarda un código de 6 dígitos, sin usar y con 0 intentos, y lo envía', async () => {
    const res = await enviar({auth: {uid: 'u1'}, data: {email: 'a@b.co', uid: 'u1'}});

    expect(res.success).toBe(true);
    const otp = db.__docs.get('otp_codes/u1');
    expect(otp.codigo).toMatch(/^\d{6}$/);
    expect(otp.utilizado).toBe(false);
    expect(otp.intentos_fallidos).toBe(0);
    expect(otp.expira_en.valueOf()).toBe(AHORA + 10 * 60_000);
    expect(sgMail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'a@b.co',
        from: {email: 'no-responder@paw-path.com.co', name: 'Paw-Path'},
      })
    );
    expect(hostinger.__sendEmail).not.toHaveBeenCalled();
  });

  it('si SendGrid se queda sin créditos, envía el OTP con Hostinger', async () => {
    process.env.HOSTINGER_MAIL_TOKEN = 'token';
    process.env.HOSTINGER_MAILBOX_ID = 'buzon-1';
    sgMail.send.mockRejectedValueOnce({
      response: {body: {errors: [{message: 'Maximum credits exceeded'}]}},
    });

    const res = await enviar({auth: {uid: 'u1'}, data: {email: 'a@b.co', uid: 'u1'}});

    expect(res.success).toBe(true);
    expect(hostinger.__sendEmail).toHaveBeenCalledWith(
      'buzon-1',
      expect.objectContaining({to: ['a@b.co'], displayName: 'Paw-Path'})
    );
  });

  it('reenviar reemplaza el código anterior y reinicia los intentos', async () => {
    sembrarOtp({codigo: '000000', intentos_fallidos: 3});

    await enviar({auth: {uid: 'u1'}, data: {email: 'a@b.co', uid: 'u1'}});

    expect(db.__docs.get('otp_codes/u1').intentos_fallidos).toBe(0);
  });

  it('si fallan ambos proveedores informa los dos motivos', async () => {
    sgMail.send.mockRejectedValueOnce({response: {body: {errors: [{message: 'cuota'}]}}});

    const res = await enviar({auth: {uid: 'u1'}, data: {email: 'a@b.co', uid: 'u1'}});

    expect(res).toEqual({
      success: false,
      error: 'Error de email: SendGrid: cuota | Hostinger: Hostinger no configurado',
    });
  });
});

describe('validarOTP', () => {
  beforeEach(() => {
    db.__reset();
    jest.clearAllMocks();
  });

  it('exige autenticación y que el uid coincida', async () => {
    expect((await validar({data: {uid: 'u1', codigo: '123456'}})).success).toBe(false);
    expect(
      (await validar({auth: {uid: 'otro'}, data: {uid: 'u1', codigo: '123456'}})).success
    ).toBe(false);
  });

  it('rechaza códigos que no tienen 6 dígitos', async () => {
    const res = await validar({auth: {uid: 'u1'}, data: {uid: 'u1', codigo: '12ab'}});
    expect(res).toEqual({success: false, error: 'Formato de código inválido'});
  });

  it('sin código solicitado', async () => {
    const res = await validar({auth: {uid: 'u1'}, data: {uid: 'u1', codigo: '123456'}});
    expect(res.error).toContain('no encontrado');
  });

  it('código expirado', async () => {
    sembrarOtp({expira_en: mockTimestamp(AHORA - 1)});
    const res = await validar({auth: {uid: 'u1'}, data: {uid: 'u1', codigo: '123456'}});
    expect(res.error).toContain('expirado');
  });

  it('código ya utilizado', async () => {
    sembrarOtp({utilizado: true});
    const res = await validar({auth: {uid: 'u1'}, data: {uid: 'u1', codigo: '123456'}});
    expect(res.error).toContain('utilizado');
  });

  it('código incorrecto suma un intento fallido', async () => {
    sembrarOtp();
    const res = await validar({auth: {uid: 'u1'}, data: {uid: 'u1', codigo: '999999'}});
    expect(res).toEqual({success: false, error: 'Código incorrecto'});
    expect(db.__docs.get('otp_codes/u1').intentos_fallidos).toBe(1);
  });

  it('tras 3 intentos fallidos bloquea incluso el código correcto', async () => {
    sembrarOtp();
    for (let i = 0; i < 3; i++) {
      await validar({auth: {uid: 'u1'}, data: {uid: 'u1', codigo: '999999'}});
    }

    const res = await validar({auth: {uid: 'u1'}, data: {uid: 'u1', codigo: '123456'}});

    expect(res.success).toBe(false);
    expect(res.error).toContain('Demasiados intentos');
    expect(db.__docs.get('otp_codes/u1').utilizado).toBe(false);
    expect(adminMock.auth().updateUser).not.toHaveBeenCalled();
  });

  it('código correcto: marca usado, crea la verificación EMAIL y verifica en Auth', async () => {
    sembrarOtp();

    const res = await validar({auth: {uid: 'u1'}, data: {uid: 'u1', codigo: '123456'}});

    expect(res.success).toBe(true);
    expect(db.__docs.get('otp_codes/u1').utilizado).toBe(true);
    const verificaciones = [...db.__docs.entries()].filter(([p]) =>
      p.startsWith('verificaciones/')
    );
    expect(verificaciones).toHaveLength(1);
    expect(verificaciones[0][1]).toEqual(
      expect.objectContaining({usuario_id: 'u1', tipo: 'EMAIL', estado: 'VERIFICADO'})
    );
    expect(adminMock.auth().updateUser).toHaveBeenCalledWith('u1', {emailVerified: true});
  });
});
