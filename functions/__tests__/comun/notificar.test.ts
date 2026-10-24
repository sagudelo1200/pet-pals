/* eslint-disable camelcase */
import {Timestamp} from 'firebase-admin/firestore';
import {notificar} from '../../src/comun/notificar';
import {
  CATALOGO_NOTIFICACIONES,
  esTipoNotificacion,
} from '../../src/compartido/notificaciones';
import {crearMockDb} from '../helpers/mockFirestore';

const db = crearMockDb();
const AHORA = Timestamp.fromMillis(1_700_000_000_000);

const bandeja = (uid: string) =>
  [...db.__docs.keys()].filter((p: string) =>
    p.startsWith(`usuarios/${uid}/notificaciones/`));

describe('notificar', () => {
  beforeEach(() => db.__reset());

  it('crea el aviso con texto, categoría y acción del catálogo', async () => {
    const creada = await notificar(db, {
      tipo: 'SOLICITUD_ESCALADA',
      uid: 't1',
      datos: {paseo_id: 'p1'},
      ahora: AHORA,
    });

    expect(creada).toBe(true);
    const [ruta] = bandeja('t1');
    expect(db.__docs.get(ruta)).toEqual({
      tipo: 'SOLICITUD_ESCALADA',
      categoria: 'operativa',
      titulo: '✅ Tu solicitud está disponible',
      cuerpo: expect.stringContaining('cuidador asignado no respondió'),
      datos: {paseo_id: 'p1', accion: 'abrir_solicitud'},
      leido: false,
      creado_en: AHORA,
    });
  });

  it('formatea el valor del cobro en el texto', async () => {
    await notificar(db, {
      tipo: 'COBRO_PENDIENTE', uid: 't1', datos: {valor: 18000},
    });
    const aviso = db.__docs.get(bandeja('t1')[0]);
    expect(aviso.cuerpo).toContain('18');
    expect(aviso.datos.accion).toBe('pagar');
  });

  it('con dedup_key avisar dos veces crea un solo documento', async () => {
    const solicitud = {
      tipo: 'COBRO_PENDIENTE' as const, uid: 't1', dedup_key: 'o1_1',
      datos: {valor: 5000},
    };
    expect(await notificar(db, solicitud)).toBe(true);
    expect(await notificar(db, solicitud)).toBe(false);
    expect(bandeja('t1')).toEqual(['usuarios/t1/notificaciones/o1_1']);
  });

  it('sin dedup_key cada llamada crea un aviso nuevo', async () => {
    await notificar(db, {tipo: 'SOLICITUD_ESCALADA', uid: 't1'});
    await notificar(db, {tipo: 'SOLICITUD_ESCALADA', uid: 't1'});
    expect(bandeja('t1')).toHaveLength(2);
  });

  it('sin destinatario no escribe nada', async () => {
    expect(await notificar(db, {tipo: 'SOLICITUD_ESCALADA', uid: ''}))
      .toBe(false);
    expect(db.__docs.size).toBe(0);
  });

  it('dentro de una transacción respeta dedup_key', async () => {
    const solicitud = {
      tipo: 'COBRO_PENDIENTE' as const, uid: 't1', dedup_key: 'o1_1',
      datos: {valor: 5000},
    };
    const resultados = await db.runTransaction(async (tx: any) => [
      await notificar(db, solicitud, tx),
    ]);
    const repetido = await db.runTransaction((tx: any) =>
      notificar(db, solicitud, tx));

    expect(resultados).toEqual([true]);
    expect(repetido).toBe(false);
    expect(bandeja('t1')).toHaveLength(1);
  });
});

describe('catálogo de notificaciones', () => {
  it('todas las plantillas devuelven título y cuerpo', () => {
    for (const definicion of Object.values(CATALOGO_NOTIFICACIONES)) {
      const {titulo, cuerpo} = definicion.plantilla({valor: 1000});
      expect(titulo).not.toBe('');
      expect(cuerpo).not.toBe('');
    }
  });

  it('reconoce solo tipos del catálogo', () => {
    expect(esTipoNotificacion('COBRO_PENDIENTE')).toBe(true);
    expect(esTipoNotificacion('INVENTADO')).toBe(false);
    expect(esTipoNotificacion(undefined)).toBe(false);
  });
});
