/**
 * Habilitaciones (servidor): iniciar, enviar, decidir y sus efectos.
 */
import * as mockFirestore from '../helpers/mockFirestore';

const mockDb = mockFirestore.crearMockDb();

jest.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
  initializeApp: jest.fn(),
}));
jest.mock('firebase-admin/auth', () => ({getAuth: jest.fn()}));
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
  Timestamp: mockFirestore.MOCK_TIMESTAMP,
  FieldValue: mockFirestore.MOCK_FIELD_VALUE,
}));
jest.mock('../../src/comun/notificar', () => ({
  notificar: jest.fn().mockResolvedValue(true),
}));

import {
  actualizarPerfil,
  aplicarDecisionRequisito,
  decidirHabilitacion,
  decidirRequisitoDelEquipo,
  enviarHabilitacion,
  iniciarHabilitacion,
} from '../../src/habilitaciones/habilitaciones';
import {limpiarCacheConfiguracion} from '../../src/comun/configuracion';
import {notificar} from '../../src/comun/notificar';
import {
  CATALOGO_SERVICIOS,
  rutaEvidencia,
} from '../../src/compartido/servicios';
import {ofreceServicio} from '../../src/compartido/habilitacion';

const AHORA = Date.UTC(2026, 9, 25, 12);
const DIA = 86400000;
const ID = 'ana_paseo';
const TODAS = [
  rutaEvidencia('ana', 'paseo', 'identidad', 'frente'),
  rutaEvidencia('ana', 'paseo', 'identidad', 'reverso'),
  rutaEvidencia('ana', 'paseo', 'antecedentes', 'certificado'),
];

// Archivos de Storage: ruta → cuándo se subió (ms). Por defecto, antes de que el
// equipo decida nada; un archivo "nuevo" se sube después de la decisión.
let archivos: Map<string, number>;
const subidos = (rutas: string[], ms = AHORA - DIA) =>
  new Map(rutas.map((ruta) => [ruta, ms] as [string, number]));
const deps = () => ({
  archivo: async (r: string) =>
    archivos.has(r) ? {actualizadoMs: archivos.get(r) as number} : null,
});
const ts = (ms: number) => mockFirestore.MOCK_TIMESTAMP.fromMillis(ms);
const doc = (path: string) => mockDb.__docs.get(path) as Record<string, any>;
const avisos = () => (notificar as jest.Mock).mock.calls.map(([, s]) => s);
const historial = () => [...mockDb.__docs.keys()]
  .filter((p: string) => p.startsWith(`habilitaciones/${ID}/historial/`));

const sembrarPersona = (opciones: {perfil?: boolean; email?: boolean} = {}) => {
  const {perfil = true, email = true} = opciones;
  // El celular es privado: vive en `usuarios` y el servidor lo suma al evaluar
  mockDb.__seed('usuarios/ana', {roles: ['tutor'], ...(perfil ? {celular: '3001234567'} : {})});
  mockDb.__seed('perfiles_publicos/ana', perfil ? {
    nombre: 'Ana',
    biografia: 'Amo a los perros',
    horario_semanal: {'1': {inicio: '08:00', fin: '18:00'}},
    h3_r8: '88aaaaaaaaaaaaa',
  } : {nombre: 'Ana'});
  if (email) {
    mockDb.__seed('verificaciones/email1', {
      usuario_id: 'ana', tipo: 'EMAIL', estado: 'VERIFICADO',
    });
  }
};

const equipo = (requisito: string, decision: 'APROBAR' | 'RECHAZAR', extra = {}) =>
  decidirRequisitoDelEquipo(mockDb, {
    id: ID, requisito, decision, autor: 'admin1', ahoraMs: AHORA, ...extra,
  });

/** Lleva a la persona hasta la revisión, con toda la evidencia subida. */
const enviada = async () => {
  archivos = subidos(TODAS);
  return enviarHabilitacion(mockDb, 'ana', 'paseo', AHORA, deps());
};

beforeEach(() => {
  mockDb.__reset();
  limpiarCacheConfiguracion();
  jest.clearAllMocks();
  archivos = new Map();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('iniciarHabilitacion', () => {
  test('crea la habilitación en borrador y toma el correo ya verificado', async () => {
    sembrarPersona();
    expect(await iniciarHabilitacion(mockDb, 'ana', 'paseo', AHORA)).toBe(ID);
    expect(doc(`habilitaciones/${ID}`)).toMatchObject({
      usuario_id: 'ana', usuario_nombre: 'Ana', servicio: 'paseo', estado: 'BORRADOR',
      requisitos: {email: {estado: 'VERIFICADO', verificacion_id: 'email1'}},
    });
  });

  test('es idempotente: repetirlo no cambia nada ni llena el historial', async () => {
    sembrarPersona();
    await iniciarHabilitacion(mockDb, 'ana', 'paseo', AHORA);
    const antes = JSON.stringify(doc(`habilitaciones/${ID}`));
    await iniciarHabilitacion(mockDb, 'ana', 'paseo', AHORA + 1000);
    expect(JSON.stringify(doc(`habilitaciones/${ID}`))).toBe(antes);
    expect(historial()).toHaveLength(0);
  });

  test('reutiliza lo que la persona ya tiene verificado en otro servicio', async () => {
    sembrarPersona();
    mockDb.__seed('verificaciones/id1', {
      usuario_id: 'ana', tipo: 'IDENTIDAD', estado: 'VERIFICADO',
    });
    await iniciarHabilitacion(mockDb, 'ana', 'paseo', AHORA);
    expect(doc(`habilitaciones/${ID}`).requisitos.identidad)
      .toMatchObject({estado: 'VERIFICADO', verificacion_id: 'id1'});
  });
});

describe('enviarHabilitacion', () => {
  test('con el perfil incompleto no se envía y dice qué falta', async () => {
    sembrarPersona({perfil: false});
    archivos = subidos(TODAS);
    await expect(enviarHabilitacion(mockDb, 'ana', 'paseo', AHORA, deps()))
      .rejects.toMatchObject({
        codigo: 'failed-precondition',
        message: expect.stringContaining('Perfil completo (biografia, horario_semanal, h3_r8, celular)'),
      });
    expect(doc(`habilitaciones/${ID}`).estado).toBe('BORRADOR');
  });

  test('sin la evidencia subida no se envía y dice qué archivo falta', async () => {
    sembrarPersona();
    archivos = subidos([TODAS[0], TODAS[2]]);
    await expect(enviarHabilitacion(mockDb, 'ana', 'paseo', AHORA, deps()))
      .rejects.toMatchObject({
        message: expect.stringContaining('Identidad (falta subir: reverso)'),
      });
    expect(doc(`habilitaciones/${ID}`).estado).toBe('BORRADOR');
  });

  test('sin el correo verificado no se envía', async () => {
    sembrarPersona({email: false});
    archivos = subidos(TODAS);
    await expect(enviarHabilitacion(mockDb, 'ana', 'paseo', AHORA, deps()))
      .rejects.toMatchObject({message: expect.stringContaining('Correo verificado')});
  });

  test('con todo listo pasa a revisión: identidad y antecedentes quedan por revisar', async () => {
    sembrarPersona();
    const h = await enviada();
    expect(h.estado).toBe('EN_REVISION');
    const d = doc(`habilitaciones/${ID}`);
    expect(d.requisitos.identidad.estado).toBe('EN_REVISION');
    expect(d.requisitos.antecedentes.estado).toBe('EN_REVISION');
    expect(d.requisitos.email.estado).toBe('VERIFICADO');
    expect(historial().map((p) => doc(p))).toEqual(expect.arrayContaining([
      expect.objectContaining({de: 'BORRADOR', a: 'EN_REVISION', autor: 'ana'}),
    ]));
  });

  test('no se puede enviar dos veces', async () => {
    sembrarPersona();
    await enviada();
    await expect(enviarHabilitacion(mockDb, 'ana', 'paseo', AHORA, deps()))
      .rejects.toMatchObject({codigo: 'failed-precondition'});
  });

  test('si ya tiene todo verificado de antes, se aprueba sola sin revisión', async () => {
    sembrarPersona();
    for (const tipo of ['IDENTIDAD', 'ANTECEDENTES']) {
      mockDb.__seed(`verificaciones/${tipo}`, {
        usuario_id: 'ana', tipo, estado: 'VERIFICADO',
        vence_en: tipo === 'ANTECEDENTES' ? ts(AHORA + 100 * DIA) : null,
      });
    }
    const h = await enviarHabilitacion(mockDb, 'ana', 'paseo', AHORA, deps());
    expect(h.estado).toBe('APROBADA');
    expect(doc('perfiles_publicos/ana').servicios_habilitados).toEqual(['paseo']);
  });

  test('un proveedor no configurado frena el envío antes de escribir nada', async () => {
    sembrarPersona();
    archivos = subidos(TODAS);
    const identidad = CATALOGO_SERVICIOS.paseo.requisitos
      .find((r) => r.id === 'identidad')!;
    identidad.validador = 'sumsub';
    try {
      await expect(enviarHabilitacion(mockDb, 'ana', 'paseo', AHORA, deps()))
        .rejects.toMatchObject({message: expect.stringContaining('sumsub')});
    } finally {
      identidad.validador = 'manual';
    }
    expect(doc(`habilitaciones/${ID}`).estado).toBe('BORRADOR');
  });
});

describe('decisiones del equipo sobre los requisitos', () => {
  test('aprobar la identidad crea la verificación y la habilitación sigue en revisión', async () => {
    sembrarPersona();
    await enviada();
    const h = await equipo('identidad', 'APROBAR');
    expect(h.estado).toBe('EN_REVISION');
    const progreso = doc(`habilitaciones/${ID}`).requisitos.identidad;
    expect(progreso.estado).toBe('VERIFICADO');
    const verificacion = doc(`verificaciones/${progreso.verificacion_id}`);
    expect(verificacion).toMatchObject({
      usuario_id: 'ana', tipo: 'IDENTIDAD', estado: 'VERIFICADO',
      metodo: 'MANUAL', version: 1, revisado_por: 'admin1',
      habilitacion_id: ID, evidencias: {frente: true, reverso: true},
    });
    expect(verificacion.vence_en).toBeUndefined();
  });

  test('al aprobar el último requisito se aprueba la habilitación y se abre el servicio', async () => {
    sembrarPersona();
    await enviada();
    await equipo('identidad', 'APROBAR');
    const h = await equipo('antecedentes', 'APROBAR');
    expect(h.estado).toBe('APROBADA');

    const perfil = doc('perfiles_publicos/ana');
    expect(perfil.servicios_habilitados).toEqual(['paseo']);
    expect(ofreceServicio(perfil, 'paseo', AHORA)).toBe(true);
    expect(doc('usuarios/ana').roles).toEqual(['tutor', 'cuidador']);
    expect(avisos()).toEqual([expect.objectContaining({
      tipo: 'HABILITACION_APROBADA', uid: 'ana',
      datos: {servicio: 'Paseos'},
    })]);
  });

  test('los antecedentes vencen a los 12 meses por defecto, y la puerta se cierra sola', async () => {
    sembrarPersona();
    await enviada();
    await equipo('identidad', 'APROBAR');
    await equipo('antecedentes', 'APROBAR');

    const vence = Date.UTC(2027, 9, 25, 12);
    const progreso = doc(`habilitaciones/${ID}`).requisitos.antecedentes;
    expect(progreso.vence_en.toMillis()).toBe(vence);
    const perfil = doc('perfiles_publicos/ana');
    expect(perfil.servicios_vencen).toEqual({paseo: vence});
    expect(ofreceServicio(perfil, 'paseo', vence - 1)).toBe(true);
    expect(ofreceServicio(perfil, 'paseo', vence)).toBe(false);
  });

  test('la vigencia configurada por el equipo manda', async () => {
    sembrarPersona();
    mockDb.__seed('configuracion/habilitaciones', {antecedentes_vigencia_meses: 6});
    await enviada();
    await equipo('identidad', 'APROBAR');
    await equipo('antecedentes', 'APROBAR');
    expect(doc('perfiles_publicos/ana').servicios_vencen)
      .toEqual({paseo: Date.UTC(2027, 3, 25, 12)});
  });

  test('rechazar exige motivo; con motivo devuelve la habilitación y avisa', async () => {
    sembrarPersona();
    await enviada();
    await expect(equipo('identidad', 'RECHAZAR'))
      .rejects.toMatchObject({codigo: 'invalid-argument'});
    expect(doc(`habilitaciones/${ID}`).estado).toBe('EN_REVISION');

    const h = await equipo('identidad', 'RECHAZAR', {motivo: 'La foto está borrosa'});
    expect(h.estado).toBe('BORRADOR');
    const d = doc(`habilitaciones/${ID}`);
    expect(d.requisitos.identidad).toMatchObject({
      estado: 'RECHAZADO', motivo: 'La foto está borrosa',
    });
    expect(d.motivo).toBe('La foto está borrosa');
    expect(avisos()).toEqual([expect.objectContaining({
      tipo: 'HABILITACION_DEVUELTA',
      datos: {servicio: 'Paseos', motivo: 'Identidad: La foto está borrosa'},
    })]);
    expect(historial().map((p) => doc(p))).toEqual(expect.arrayContaining([
      expect.objectContaining({requisito: 'identidad', de: 'EN_REVISION', a: 'RECHAZADO'}),
      expect.objectContaining({de: 'EN_REVISION', a: 'BORRADOR'}),
    ]));
  });

  test('tras corregir, la persona reenvía solo lo rechazado y el ciclo sigue', async () => {
    sembrarPersona();
    await enviada();
    await equipo('antecedentes', 'APROBAR');
    await equipo('identidad', 'RECHAZAR', {motivo: 'Borrosa'});

    // Reenviar los mismos archivos que ya se rechazaron no sirve
    await expect(enviarHabilitacion(mockDb, 'ana', 'paseo', AHORA, deps()))
      .rejects.toMatchObject({
        message: expect.stringContaining('Identidad (sube un archivo nuevo)'),
      });
    expect(doc(`habilitaciones/${ID}`).estado).toBe('BORRADOR');

    // Con la foto corregida (basta una) sí
    archivos.set(TODAS[0], AHORA + 1000);
    const reenviada = await enviarHabilitacion(mockDb, 'ana', 'paseo', AHORA, deps());
    expect(reenviada.estado).toBe('EN_REVISION');
    expect(doc(`habilitaciones/${ID}`).requisitos.antecedentes.estado).toBe('VERIFICADO');

    const final = await equipo('identidad', 'APROBAR');
    expect(final.estado).toBe('APROBADA');
  });

  test('solo se decide lo que está en revisión', async () => {
    sembrarPersona();
    await iniciarHabilitacion(mockDb, 'ana', 'paseo', AHORA);
    await expect(equipo('identidad', 'APROBAR'))
      .rejects.toMatchObject({message: expect.stringContaining('no está en revisión')});
    expect([...mockDb.__docs.keys()].some((p: string) =>
      p.startsWith('verificaciones/') && p !== 'verificaciones/email1')).toBe(false);
  });

  test('lo que valida el sistema no se revisa', async () => {
    sembrarPersona();
    await enviada();
    await expect(equipo('email', 'APROBAR'))
      .rejects.toMatchObject({codigo: 'invalid-argument'});
    await expect(equipo('perfil', 'APROBAR'))
      .rejects.toMatchObject({codigo: 'invalid-argument'});
  });

  test('una decisión repetida no vuelve a aprobar', async () => {
    sembrarPersona();
    await enviada();
    await equipo('identidad', 'APROBAR');
    await expect(equipo('identidad', 'APROBAR'))
      .rejects.toMatchObject({codigo: 'failed-precondition'});
  });

  test('si el perfil quedó incompleto al final, se devuelve diciendo qué falta', async () => {
    sembrarPersona();
    await enviada();
    mockDb.__seed('perfiles_publicos/ana', {nombre: 'Ana'});
    await equipo('identidad', 'APROBAR');
    const h = await equipo('antecedentes', 'APROBAR');
    expect(h.estado).toBe('BORRADOR');
    expect(h.motivo).toBe('Falta completar: Perfil completo');
    expect(avisos().map((a) => a.tipo)).toEqual(['HABILITACION_DEVUELTA']);
    expect(doc('perfiles_publicos/ana').servicios_habilitados).toBeUndefined();
  });
});

describe('proveedores externos', () => {
  test('el equipo no decide lo que valida un proveedor; el proveedor sí, con su método', async () => {
    sembrarPersona();
    await enviada();
    const identidad = CATALOGO_SERVICIOS.paseo.requisitos
      .find((r) => r.id === 'identidad')!;
    identidad.validador = 'sumsub';
    try {
      await expect(equipo('identidad', 'APROBAR'))
        .rejects.toMatchObject({message: expect.stringContaining('sumsub')});

      await aplicarDecisionRequisito(mockDb, {
        id: ID, requisito: 'identidad', decision: 'APROBAR', autor: 'sumsub',
        ahoraMs: AHORA, metodo: 'PROVEEDOR', proveedor: 'sumsub',
      });
    } finally {
      identidad.validador = 'manual';
    }
    const verificacionId = doc(`habilitaciones/${ID}`).requisitos.identidad.verificacion_id;
    expect(doc(`verificaciones/${verificacionId}`))
      .toMatchObject({metodo: 'PROVEEDOR', proveedor: 'sumsub'});
  });
});

describe('decidirHabilitacion', () => {
  const aprobada = async () => {
    sembrarPersona();
    await enviada();
    await equipo('identidad', 'APROBAR');
    await equipo('antecedentes', 'APROBAR');
    jest.clearAllMocks();
  };
  const decidir = (decision: any, motivo?: string, ahoraMs = AHORA) =>
    decidirHabilitacion(mockDb, {id: ID, decision, motivo, autor: 'admin1', ahoraMs});

  test('suspender exige motivo, cierra el servicio y avisa; reactivar lo reabre', async () => {
    await aprobada();
    await expect(decidir('SUSPENDER')).rejects.toMatchObject({codigo: 'invalid-argument'});

    const suspendida = await decidir('SUSPENDER', 'Quejas de tutores');
    expect(suspendida.estado).toBe('SUSPENDIDA');
    expect(doc('perfiles_publicos/ana').servicios_habilitados).toEqual([]);
    expect(ofreceServicio(doc('perfiles_publicos/ana'), 'paseo', AHORA)).toBe(false);
    expect(avisos()).toEqual([expect.objectContaining({
      tipo: 'HABILITACION_SUSPENDIDA',
      datos: {servicio: 'Paseos', motivo: 'Quejas de tutores'},
    })]);

    const reactivada = await decidir('REACTIVAR');
    expect(reactivada.estado).toBe('APROBADA');
    expect(reactivada.motivo).toBeNull();
    expect(ofreceServicio(doc('perfiles_publicos/ana'), 'paseo', AHORA)).toBe(true);
  });

  test('no se reactiva si ya venció algo', async () => {
    await aprobada();
    await decidir('SUSPENDER', 'Revisión');
    await expect(decidir('REACTIVAR', undefined, AHORA + 400 * DIA))
      .rejects.toMatchObject({
        message: expect.stringContaining('Antecedentes judiciales'),
      });
    expect(doc(`habilitaciones/${ID}`).estado).toBe('SUSPENDIDA');
  });

  test('rechazar desde revisión exige motivo; reabrir permite volver a intentar', async () => {
    sembrarPersona();
    await enviada();
    await expect(decidir('RECHAZAR')).rejects.toMatchObject({codigo: 'invalid-argument'});
    const rechazada = await decidir('RECHAZAR', 'Documento falso');
    expect(rechazada.estado).toBe('RECHAZADA');
    expect(avisos()[0]).toMatchObject({tipo: 'HABILITACION_RECHAZADA'});

    const reabierta = await decidir('REABRIR');
    expect(reabierta.estado).toBe('BORRADOR');
  });

  test('una transición que no existe se rechaza', async () => {
    sembrarPersona();
    await iniciarHabilitacion(mockDb, 'ana', 'paseo', AHORA);
    await expect(decidir('REACTIVAR'))
      .rejects.toMatchObject({codigo: 'failed-precondition'});
    await expect(decidir('SUSPENDER', 'x'))
      .rejects.toMatchObject({codigo: 'failed-precondition'});
  });
});

describe('vencimiento y renovación', () => {
  test('con algo vencido, enviar la devuelve a borrador y pide renovar solo eso', async () => {
    sembrarPersona();
    await enviada();
    await equipo('identidad', 'APROBAR');
    await equipo('antecedentes', 'APROBAR');

    const despues = AHORA + 400 * DIA;
    expect(ofreceServicio(doc('perfiles_publicos/ana'), 'paseo', despues)).toBe(false);

    // Con el mismo certificado de antes no puede renovar
    archivos = subidos(TODAS);
    await expect(enviarHabilitacion(mockDb, 'ana', 'paseo', despues, deps()))
      .rejects.toMatchObject({
        message: expect.stringContaining('Antecedentes judiciales (sube un archivo nuevo)'),
      });

    // Con uno nuevo, sí
    archivos = subidos(TODAS, despues - DIA);
    const renovada = await enviarHabilitacion(mockDb, 'ana', 'paseo', despues, deps());
    expect(renovada.estado).toBe('EN_REVISION');
    const d = doc(`habilitaciones/${ID}`);
    expect(d.requisitos.antecedentes.estado).toBe('EN_REVISION');
    // La identidad no vence: no se vuelve a pedir
    expect(d.requisitos.identidad.estado).toBe('VERIFICADO');
    expect(doc('perfiles_publicos/ana').servicios_habilitados).toEqual([]);

    const final = await equipo('antecedentes', 'APROBAR', {ahoraMs: despues});
    expect(final.estado).toBe('APROBADA');
    const nuevo = doc(`habilitaciones/${ID}`).requisitos.antecedentes;
    expect(nuevo.verificacion_id).not.toBe(d.requisitos.antecedentes.verificacion_id);
    expect(nuevo.vence_en.toMillis()).toBe(Date.UTC(2028, 10, 29, 12));
    // La anterior queda como historia; la nueva es la versión 2
    expect(doc(`verificaciones/${nuevo.verificacion_id}`)).toMatchObject({version: 2});
  });

  test('si no venció nada, no tiene sentido enviar', async () => {
    sembrarPersona();
    await enviada();
    await equipo('identidad', 'APROBAR');
    await equipo('antecedentes', 'APROBAR');
    await expect(enviarHabilitacion(mockDb, 'ana', 'paseo', AHORA + DIA, deps()))
      .rejects.toMatchObject({message: expect.stringContaining('Ya estás habilitado')});
  });
});

describe('actualizarPerfil', () => {
  test('si no hay habilitaciones aprobadas deja listas vacías', async () => {
    mockDb.__seed('perfiles_publicos/ana', {nombre: 'Ana'});
    await actualizarPerfil(mockDb, 'ana', AHORA);
    expect(doc('perfiles_publicos/ana')).toMatchObject({
      nombre: 'Ana', servicios_habilitados: [], servicios_vencen: {},
    });
  });

  test('crea el perfil si no existía', async () => {
    await actualizarPerfil(mockDb, 'nuevo', AHORA);
    expect(doc('perfiles_publicos/nuevo').servicios_habilitados).toEqual([]);
  });

  test('un admin no recibe el rol de cuidador', async () => {
    sembrarPersona();
    mockDb.__seed('usuarios/ana', {roles: ['admin'], celular: '3001234567'});
    await enviada();
    await equipo('identidad', 'APROBAR');
    await equipo('antecedentes', 'APROBAR');
    expect(doc('usuarios/ana').roles).toEqual(['admin']);
  });
});
