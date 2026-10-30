/**
 * Territorio (lado servidor): índice de cobertura, oferta y demanda
 * recalculadas contando, y narrativa por microzona.
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

import {
  actualizarPorPaseo,
  aplicarCoberturaManual,
  celdaDePaseo,
  coberturaDe,
  recalcularOperativa,
  reconstruirTerritorio,
  sincronizarCobertura,
  sumarEventoATerritorio,
} from '../../src/territorio/territorio';
import {
  celdaDe,
  celdasAlrededor,
  padreDe,
} from '../../src/compartido/geografia';

const AHORA_MS = 1_700_000_000_000;
const AHORA = mockFirestore.MOCK_TIMESTAMP.fromMillis(AHORA_MS);
const LAT = 4.6486;
const LNG = -74.0628;
const R8 = celdaDe(LAT, LNG, 'cobertura');
const R9 = celdaDe(LAT, LNG, 'micro');
const VECINA = celdasAlrededor(R8, 1).find((c) => c !== R8) as string;

const perfil = (extra: Record<string, unknown> = {}) => ({
  nombre: 'Ana',
  h3_r8: R8,
  insignias_verificacion: ['EMAIL', 'IDENTIDAD'],
  servicios_habilitados: ['paseo'],
  ...extra,
});
const indice = (celda: string, uid: string) =>
  mockDb.__docs.get(`indice_cobertura/${celda}/cuidadores/${uid}`);
const territorio = (celda: string) => mockDb.__docs.get(`territorio/${celda}`);
const paseo = (extra: Record<string, unknown> = {}) => ({
  tipo: 'paseo', estado: 'PENDIENTE', h3_r8: R8, ...extra,
});
const entradasDe = (uid: string) =>
  [...mockDb.__docs.keys()].filter((k: string) =>
    k.startsWith('indice_cobertura/') && k.endsWith(`/cuidadores/${uid}`));

beforeEach(() => {
  mockDb.__reset();
});

describe('coberturaDe', () => {
  test('celdas y origen salen del perfil', () => {
    const c = coberturaDe('c1', perfil(), AHORA_MS)!;
    expect(c.celdas).toHaveLength(19);
    expect(c.h3_origen).toBe(R8);
  });

  test('solo atiende quien está habilitado para pasear, no quien tiene la insignia de identidad', () => {
    const sinHabilitar = perfil({servicios_habilitados: []});
    expect(sinHabilitar.insignias_verificacion).toContain('IDENTIDAD');
    expect(coberturaDe('c1', sinHabilitar, AHORA_MS)).toBeNull();
    expect(coberturaDe('c1', perfil({servicios_habilitados: undefined}), AHORA_MS)).toBeNull();
  });

  test('un tutor o un admin con dirección (sin servicio habilitado) no tiene cobertura', () => {
    const tutor = {nombre: 'Santiago', h3_r8: R8};
    expect(coberturaDe('t1', tutor, AHORA_MS)).toBeNull();
  });

  test('una habilitación vencida no cuenta', () => {
    const vence = perfil({servicios_vencen: {paseo: AHORA_MS}});
    expect(coberturaDe('c1', vence, AHORA_MS - 1)).not.toBeNull();
    expect(coberturaDe('c1', vence, AHORA_MS)).toBeNull();
  });

  test('guarda hasta cuándo vale la habilitación (null si no vence)', () => {
    expect(coberturaDe('c1', perfil(), AHORA_MS)!.habilitadoHasta).toBeNull();
    expect(coberturaDe('c1', perfil({servicios_vencen: {paseo: AHORA_MS + 5}}), AHORA_MS)!
      .habilitadoHasta).toBe(AHORA_MS + 5);
    // el vencimiento de otro servicio no es el de paseo
    expect(coberturaDe('c1', perfil({servicios_vencen: {guarderia: 5}}), AHORA_MS)!
      .habilitadoHasta).toBeNull();
  });

  test('sin ubicación (o sin perfil) no hay cobertura', () => {
    expect(coberturaDe('c1', {nombre: 'Ana'}, AHORA_MS)).toBeNull();
    expect(coberturaDe('c1', undefined, AHORA_MS)).toBeNull();
  });

  test('con celdas manuales, el origen puede no ser una de ellas', () => {
    const c = coberturaDe('c1', perfil({celdas_cobertura: [VECINA]}), AHORA_MS, true)!;
    expect(c.celdas).toEqual([VECINA]);
    expect(c.h3_origen).toBe(R8);
  });

  test('con el modo manual apagado, las celdas a mano no cuentan: vale el radio', () => {
    const c = coberturaDe(
      'c1', perfil({celdas_cobertura: [VECINA], radio_cobertura: 1}), AHORA_MS)!;
    expect(c.celdas).toHaveLength(7);
  });
});

describe('sincronizarCobertura (índice)', () => {
  test('un cuidador nuevo queda en las 19 celdas con lo mínimo', async () => {
    const afectadas = await sincronizarCobertura(
      mockDb, 'c1', undefined, perfil(), AHORA);

    expect(afectadas).toHaveLength(19);
    expect(entradasDe('c1')).toHaveLength(19);
    expect(indice(R8, 'c1')).toEqual({
      uid: 'c1', h3_origen: R8, habilitado_hasta: null, actualizado_en: AHORA,
    });
  });

  test('si no cambió lo que importa (por ejemplo, solo su calificación) no escribe nada', async () => {
    const antes = perfil({rating_promedio: 4});
    const despues = perfil({rating_promedio: 5, biografia: 'hola'});
    expect(await sincronizarCobertura(mockDb, 'c1', antes, despues, AHORA)).toEqual([]);
    expect(entradasDe('c1')).toHaveLength(0);
  });

  test('al mudarse, borra las celdas que dejó y escribe las nuevas', async () => {
    const lejos = celdaDe(4.70, -74.00);
    await sincronizarCobertura(mockDb, 'c1', undefined, perfil(), AHORA);

    const afectadas = await sincronizarCobertura(
      mockDb, 'c1', perfil(), perfil({h3_r8: lejos}), AHORA);

    expect(indice(R8, 'c1')).toBeUndefined();
    expect(indice(lejos, 'c1')).toBeDefined();
    expect(afectadas).toEqual(expect.arrayContaining([R8, lejos]));
    expect(entradasDe('c1')).toHaveLength(19);
  });

  test('al elegir celdas a mano, solo queda en esas', async () => {
    await sincronizarCobertura(mockDb, 'c1', undefined, perfil(), AHORA);
    await sincronizarCobertura(
      mockDb, 'c1', perfil(), perfil({celdas_cobertura: [R8, VECINA]}), AHORA, true);

    expect(entradasDe('c1').sort()).toEqual([
      `indice_cobertura/${R8}/cuidadores/c1`,
      `indice_cobertura/${VECINA}/cuidadores/c1`,
    ].sort());
  });

  test('al cambiar el radio, el índice se ajusta', async () => {
    await sincronizarCobertura(mockDb, 'c1', undefined, perfil(), AHORA);
    await sincronizarCobertura(
      mockDb, 'c1', perfil(), perfil({radio_cobertura: 1}), AHORA);
    expect(entradasDe('c1')).toHaveLength(7);
  });
});

describe('aplicarCoberturaManual (el admin enciende o apaga el modo)', () => {
  const conManual = () => perfil({celdas_cobertura: [R8, VECINA]});

  test('al encender, quien eligió a mano pasa a cubrir solo esas', async () => {
    mockDb.__seed('perfiles_publicos/c1', conManual());
    await reconstruirTerritorio(mockDb, AHORA, false);
    expect(entradasDe('c1')).toHaveLength(19);

    await aplicarCoberturaManual(mockDb, true, AHORA);
    expect(entradasDe('c1')).toHaveLength(2);
  });

  test('al apagar, vuelve al radio y lo elegido a mano queda guardado', async () => {
    mockDb.__seed('perfiles_publicos/c1', conManual());
    await reconstruirTerritorio(mockDb, AHORA, true);
    expect(entradasDe('c1')).toHaveLength(2);

    await aplicarCoberturaManual(mockDb, false, AHORA);
    expect(entradasDe('c1')).toHaveLength(19);
    expect(mockDb.__docs.get('perfiles_publicos/c1').celdas_cobertura)
      .toEqual([R8, VECINA]);
  });

  test('quien no eligió a mano no cambia', async () => {
    mockDb.__seed('perfiles_publicos/c2', perfil());
    await reconstruirTerritorio(mockDb, AHORA, false);
    await expect(aplicarCoberturaManual(mockDb, true, AHORA)).resolves.toBe(0);
    expect(entradasDe('c2')).toHaveLength(19);
  });

  test('al habilitarse entra al índice y al perder la habilitación sale, sin que haga nada', async () => {
    const sinHabilitar = perfil({servicios_habilitados: []});
    await sincronizarCobertura(mockDb, 'c1', undefined, sinHabilitar, AHORA);
    expect(entradasDe('c1')).toHaveLength(0);

    const afectadas = await sincronizarCobertura(
      mockDb, 'c1', sinHabilitar, perfil(), AHORA);
    expect(afectadas).toHaveLength(19);
    expect(entradasDe('c1')).toHaveLength(19);

    await sincronizarCobertura(mockDb, 'c1', perfil(), sinHabilitar, AHORA);
    expect(entradasDe('c1')).toHaveLength(0);
  });

  test('un tutor con dirección nunca llega al índice, aunque cambie su perfil', async () => {
    const tutor = {nombre: 'Santiago', h3_r8: R8};
    expect(await sincronizarCobertura(mockDb, 't1', undefined, tutor, AHORA)).toEqual([]);
    expect(await sincronizarCobertura(
      mockDb, 't1', tutor, {...tutor, h3_r8: celdaDe(4.70, -74.00)}, AHORA)).toEqual([]);
    expect(entradasDe('t1')).toHaveLength(0);
  });

  test('renovar la habilitación (otro vencimiento) actualiza el índice; sin cambios no escribe', async () => {
    const antes = perfil({servicios_vencen: {paseo: AHORA_MS + 10}});
    const despues = perfil({servicios_vencen: {paseo: AHORA_MS + 999}});
    await sincronizarCobertura(mockDb, 'c1', undefined, antes, AHORA);
    expect(indice(R8, 'c1')!.habilitado_hasta).toBe(AHORA_MS + 10);

    const afectadas = await sincronizarCobertura(mockDb, 'c1', antes, despues, AHORA);
    expect(indice(R8, 'c1')!.habilitado_hasta).toBe(AHORA_MS + 999);
    expect(afectadas.length).toBeGreaterThan(0);
    expect(await sincronizarCobertura(mockDb, 'c1', despues, despues, AHORA)).toEqual([]);
  });

  test('si se borra el perfil, sale de todas las celdas', async () => {
    await sincronizarCobertura(mockDb, 'c1', undefined, perfil(), AHORA);
    const afectadas = await sincronizarCobertura(
      mockDb, 'c1', perfil(), undefined, AHORA);
    expect(entradasDe('c1')).toHaveLength(0);
    expect(afectadas).toHaveLength(19);
  });

  test('no toca a otros cuidadores de la misma celda', async () => {
    await sincronizarCobertura(mockDb, 'c1', undefined, perfil(), AHORA);
    await sincronizarCobertura(mockDb, 'c2', undefined, perfil(), AHORA);
    await sincronizarCobertura(mockDb, 'c1', perfil(), undefined, AHORA);
    expect(indice(R8, 'c1')).toBeUndefined();
    expect(indice(R8, 'c2')).toBeDefined();
  });
});

describe('recalcularOperativa (oferta y demanda)', () => {
  const sembrarCuidadores = (habilitados: number) => {
    for (let i = 0; i < habilitados; i++) {
      mockDb.__seed(`indice_cobertura/${R8}/cuidadores/v${i}`, {uid: `v${i}`});
    }
  };

  test('la oferta no cuenta a quien ya tiene la habilitación vencida', async () => {
    mockDb.__seed(`indice_cobertura/${R8}/cuidadores/vigente`, {uid: 'vigente', habilitado_hasta: AHORA_MS + 1});
    mockDb.__seed(`indice_cobertura/${R8}/cuidadores/sin_vencer`, {uid: 'sin_vencer', habilitado_hasta: null});
    mockDb.__seed(`indice_cobertura/${R8}/cuidadores/vencido`, {uid: 'vencido', habilitado_hasta: AHORA_MS});
    mockDb.__seed(`indice_cobertura/${R8}/cuidadores/sin_dato`, {uid: 'sin_dato'});

    await recalcularOperativa(mockDb, R8, AHORA);

    // vigente, sin_vencer y sin_dato cuentan; el vencido no
    expect(territorio(R8)!.operativa.cuidadores_count).toBe(3);
  });

  test('cuenta cuidadores habilitados, pedidos pendientes, paseos en curso y hechos', async () => {
    sembrarCuidadores(3);
    mockDb.__seed('operaciones/p1', paseo({estado: 'PENDIENTE'}));
    mockDb.__seed('operaciones/p2', paseo({estado: 'PENDIENTE'}));
    mockDb.__seed('operaciones/p3', paseo({estado: 'EN_PROGRESO'}));
    mockDb.__seed('operaciones/p4', paseo({estado: 'EN_CAMINO'}));
    mockDb.__seed('operaciones/p5', paseo({estado: 'FINALIZADO'}));
    mockDb.__seed('operaciones/p6', paseo({estado: 'COMPLETADO'}));
    mockDb.__seed('operaciones/p7', paseo({estado: 'CANCELADO'}));
    mockDb.__seed('operaciones/p8', paseo({estado: 'PENDIENTE', h3_r8: VECINA}));
    mockDb.__seed('operaciones/p9', {tipo: 'otro', estado: 'PENDIENTE', h3_r8: R8});

    await recalcularOperativa(mockDb, R8, AHORA);

    expect(territorio(R8)).toMatchObject({
      celda: R8,
      res: 8,
      padre_r8: R8,
      operativa: {
        cuidadores_count: 3,
        demanda_total: 2,
        paseos_activos: 2,
        paseos_total: 4,
        estado: 'en_operacion',
        ratio_cobertura: 1.5,
      },
      actualizado_en: AHORA,
    });
  });

  test('demanda sin cuidadores: sin cobertura', async () => {
    mockDb.__seed('operaciones/p1', paseo());
    await recalcularOperativa(mockDb, R8, AHORA);
    expect(territorio(R8)!.operativa).toMatchObject({estado: 'sin_cobertura', cuidadores_count: 0});
  });

  test('una celda vacía queda sin actividad', async () => {
    await recalcularOperativa(mockDb, R8, AHORA);
    expect(territorio(R8)!.operativa).toMatchObject({estado: 'sin_actividad'});
  });

  test('es idempotente y se corrige sola: recontar siempre da el número real', async () => {
    sembrarCuidadores(1);
    mockDb.__seed('operaciones/p1', paseo());
    await recalcularOperativa(mockDb, R8, AHORA);
    await recalcularOperativa(mockDb, R8, AHORA);
    expect(territorio(R8)!.operativa.demanda_total).toBe(1);

    // el contador estaba desajustado (como pasaba con los incrementos a mano)
    mockDb.__seed(`territorio/${R8}`, {
      ...territorio(R8),
      operativa: {...territorio(R8)!.operativa, demanda_total: 99},
    });
    await recalcularOperativa(mockDb, R8, AHORA);
    expect(territorio(R8)!.operativa.demanda_total).toBe(1);
  });

  test('no pisa la narrativa que ya tuviera la celda', async () => {
    mockDb.__seed(`territorio/${R8}`, {celda: R8, narrativa: {total_eventos: 7}});
    await recalcularOperativa(mockDb, R8, AHORA);
    expect(territorio(R8)!.narrativa).toEqual({total_eventos: 7});
  });

  test('solo se calcula en la escala de cobertura', async () => {
    await recalcularOperativa(mockDb, R9, AHORA);
    await recalcularOperativa(mockDb, 'no-es-una-celda', AHORA);
    expect(territorio(R9)).toBeUndefined();
  });
});

describe('celdaDePaseo', () => {
  test('usa la celda guardada al crear el paseo', () => {
    expect(celdaDePaseo(paseo())).toBe(R8);
  });

  test('un paseo viejo, sin celda, la saca de las coordenadas de recogida', () => {
    expect(celdaDePaseo({
      tipo: 'paseo',
      ubicacion_inicio: {coordenadas: {latitude: LAT, longitude: LNG}},
    })).toBe(R8);
  });

  test('sin ubicación, o si no es un paseo, no hay celda', () => {
    expect(celdaDePaseo({tipo: 'paseo'})).toBeUndefined();
    expect(celdaDePaseo({tipo: 'otro', h3_r8: R8})).toBeUndefined();
    expect(celdaDePaseo(undefined)).toBeUndefined();
  });
});

describe('actualizarPorPaseo', () => {
  test('un pedido nuevo suma demanda', async () => {
    mockDb.__seed('operaciones/p1', paseo());
    const celdas = await actualizarPorPaseo(mockDb, undefined, paseo(), AHORA);
    expect(celdas).toEqual([R8]);
    expect(territorio(R8)!.operativa.demanda_total).toBe(1);
  });

  test('al iniciar el paseo la demanda baja y los paseos en curso suben', async () => {
    mockDb.__seed('operaciones/p1', paseo({estado: 'EN_PROGRESO'}));
    await actualizarPorPaseo(
      mockDb, paseo({estado: 'EN_CAMINO'}), paseo({estado: 'EN_PROGRESO'}), AHORA);
    expect(territorio(R8)!.operativa).toMatchObject({
      demanda_total: 0, paseos_activos: 1, estado: 'en_operacion',
    });
  });

  test('cancelar un paseo en curso lo saca de los activos (nada que revertir a mano)', async () => {
    mockDb.__seed('operaciones/p1', paseo({estado: 'CANCELADO'}));
    await actualizarPorPaseo(
      mockDb, paseo({estado: 'EN_PROGRESO'}), paseo({estado: 'CANCELADO'}), AHORA);
    expect(territorio(R8)!.operativa).toMatchObject({paseos_activos: 0, paseos_total: 0});
  });

  test('si no cambió el estado ni la celda, no hace nada', async () => {
    const celdas = await actualizarPorPaseo(
      mockDb, paseo({precio: 1}), paseo({precio: 2}), AHORA);
    expect(celdas).toEqual([]);
    expect(territorio(R8)).toBeUndefined();
  });

  test('si el paseo cambia de celda, recalcula las dos', async () => {
    const celdas = await actualizarPorPaseo(
      mockDb, paseo(), paseo({h3_r8: VECINA}), AHORA);
    expect(celdas.sort()).toEqual([R8, VECINA].sort());
    expect(territorio(R8)).toBeDefined();
    expect(territorio(VECINA)).toBeDefined();
  });

  test('un paseo borrado también se descuenta', async () => {
    await actualizarPorPaseo(mockDb, paseo(), undefined, AHORA);
    expect(territorio(R8)!.operativa.demanda_total).toBe(0);
  });

  test('los documentos que no son paseos se ignoran', async () => {
    expect(await actualizarPorPaseo(
      mockDb, undefined, {tipo: 'cobro', estado: 'PENDIENTE'}, AHORA)).toEqual([]);
  });
});

describe('sumarEventoATerritorio (narrativa)', () => {
  const sembrarEvento = (extra: Record<string, unknown> = {}, id = 'e1') =>
    mockDb.__seed(`operaciones/p1/eventos/${id}`, {
      evento: 'bitacora',
      payload: {accion: 'juego'},
      hechoTerritorial: {h3_r8: R8, h3_r9: R9},
      ...extra,
    });
  const contar = (id = 'e1') => sumarEventoATerritorio(mockDb, 'p1', id, AHORA);

  test('suma el evento a su microzona, con su celda de cobertura y los índices', async () => {
    sembrarEvento();

    await expect(contar()).resolves.toBe(true);

    expect(territorio(R9)).toMatchObject({
      celda: R9,
      res: 9,
      padre_r8: padreDe(R9, 'cobertura'),
      narrativa: {
        total_eventos: 1,
        eventos_por_tipo: {juego: 1},
        indices: {bienestar: 100},
      },
    });
    expect(mockDb.__docs.get('operaciones/p1/eventos/e1').territorio_contado).toBe(true);
  });

  test('un evento se cuenta una sola vez, aunque el aviso llegue repetido', async () => {
    sembrarEvento();
    await contar();
    await expect(contar()).resolves.toBe(false);
    expect(territorio(R9)!.narrativa.total_eventos).toBe(1);
  });

  test('eventos distintos se acumulan por tipo', async () => {
    sembrarEvento({payload: {accion: 'juego'}}, 'e1');
    sembrarEvento({payload: {accion: 'agua'}}, 'e2');
    sembrarEvento({payload: {accion: 'juego'}}, 'e3');
    await contar('e1');
    await contar('e2');
    await contar('e3');
    expect(territorio(R9)!.narrativa).toMatchObject({
      total_eventos: 3, eventos_por_tipo: {juego: 2, agua: 1},
    });
  });

  test('sin acción en el evento se cuenta como "desconocido"', async () => {
    sembrarEvento({payload: {}});
    await contar();
    expect(territorio(R9)!.narrativa.eventos_por_tipo).toEqual({desconocido: 1});
  });

  test('no cuenta otros eventos del paseo, eventos sin ubicación ni celdas inválidas', async () => {
    sembrarEvento({evento: 'INICIAR_PASEO'}, 'a');
    sembrarEvento({hechoTerritorial: undefined}, 'b');
    sembrarEvento({hechoTerritorial: {h3_r9: 'basura'}}, 'c');
    sembrarEvento({hechoTerritorial: {h3_r9: R8}}, 'd'); // R8, no R9
    for (const id of ['a', 'b', 'c', 'd', 'no-existe']) {
      await expect(contar(id)).resolves.toBe(false);
    }
    expect(territorio(R9)).toBeUndefined();
  });

  test('no pisa la oferta y demanda de la celda', async () => {
    mockDb.__seed(`territorio/${R9}`, {celda: R9, operativa: {cuidadores_count: 5}});
    sembrarEvento();
    await contar();
    expect(territorio(R9)!.operativa).toEqual({cuidadores_count: 5});
  });
});

describe('reconstruirTerritorio', () => {
  test('arma el índice de todos los perfiles y la oferta/demanda de sus celdas', async () => {
    mockDb.__seed('perfiles_publicos/c1', perfil());
    mockDb.__seed('perfiles_publicos/c2', perfil({servicios_habilitados: []}));
    mockDb.__seed('perfiles_publicos/c3', {nombre: 'Sin ubicación'});
    mockDb.__seed('operaciones/p1', paseo());

    const resultado = await reconstruirTerritorio(mockDb, AHORA);

    // c2 no está habilitado y c3 no tiene ubicación: solo c1 queda en el índice
    expect(resultado.perfiles).toBe(1);
    expect(resultado.celdas).toBe(19);
    expect(indice(R8, 'c1')).toBeDefined();
    expect(indice(R8, 'c2')).toBeUndefined();
    expect(territorio(R8)!.operativa).toMatchObject({
      cuidadores_count: 1, demanda_total: 1, estado: 'activa',
    });
  });

  test('incluye las celdas con pedidos aunque no haya cuidadores', async () => {
    mockDb.__seed('operaciones/p1', paseo({h3_r8: VECINA}));
    await reconstruirTerritorio(mockDb, AHORA);
    expect(territorio(VECINA)!.operativa.estado).toBe('sin_cobertura');
  });

  test('repetirla no cambia el resultado', async () => {
    mockDb.__seed('perfiles_publicos/c1', perfil());
    await reconstruirTerritorio(mockDb, AHORA);
    const primera = JSON.stringify(territorio(R8));
    await reconstruirTerritorio(mockDb, AHORA);
    expect(JSON.stringify(territorio(R8))).toBe(primera);
  });
});

describe('sumarEventoATerritorio (incidentes y microzona del paseo)', () => {
  const sembrar = (evento: Record<string, unknown>, id = 'e1') =>
    mockDb.__seed(`operaciones/p1/eventos/${id}`, {
      hechoTerritorial: {h3_r8: R8, h3_r9: R9}, ...evento,
    });

  test('un momento con las claves reales produce índices con sentido', async () => {
    mockDb.__seed('operaciones/p1', paseo({estado: 'EN_PROGRESO'}));
    sembrar({evento: 'bitacora', payload: {accion: 'como_esta.jugo'}});

    await sumarEventoATerritorio(mockDb, 'p1', 'e1', AHORA);

    expect(territorio(R9)!.narrativa.indices.bienestar).toBe(100);
    expect(territorio(R9)!.narrativa.eventos_por_tipo).toEqual({'como_esta.jugo': 1});
  });

  test('un incidente se cuenta por gravedad, baja la seguridad y no suma a los momentos', async () => {
    mockDb.__seed('operaciones/p1', paseo({estado: 'EN_PROGRESO'}));
    sembrar({evento: 'incidente', payload: {tipo: 'lesion', severidad: 'critica'}});

    await expect(sumarEventoATerritorio(mockDb, 'p1', 'e1', AHORA)).resolves.toBe(true);

    expect(territorio(R9)!.narrativa).toMatchObject({
      total_eventos: 0, incidentes: {critica: 1},
    });
    expect(territorio(R9)!.narrativa.indices.seguridad).toBe(40);
    expect(mockDb.__docs.get('operaciones/p1/eventos/e1').territorio_contado).toBe(true);
  });

  test('un incidente sin gravedad válida cuenta como media', async () => {
    mockDb.__seed('operaciones/p1', paseo({estado: 'EN_PROGRESO'}));
    sembrar({evento: 'incidente', payload: {tipo: 'otro'}});
    await sumarEventoATerritorio(mockDb, 'p1', 'e1', AHORA);
    expect(territorio(R9)!.narrativa.incidentes).toEqual({media: 1});
  });

  test('cada evento con ubicación deja la microzona actual en el paseo', async () => {
    mockDb.__seed('operaciones/p1', paseo({estado: 'EN_PROGRESO'}));
    sembrar({evento: 'bitacora', payload: {accion: 'como_esta.jugo'}});
    await sumarEventoATerritorio(mockDb, 'p1', 'e1', AHORA);
    expect(mockDb.__docs.get('operaciones/p1').h3_r9).toBe(R9);

    const otraMicro = celdasAlrededor(R9, 1).find((c) => c !== R9) as string;
    sembrar({
      evento: 'incidente', payload: {severidad: 'baja'},
      hechoTerritorial: {h3_r8: R8, h3_r9: otraMicro},
    }, 'e2');
    await sumarEventoATerritorio(mockDb, 'p1', 'e2', AHORA);
    expect(mockDb.__docs.get('operaciones/p1').h3_r9).toBe(otraMicro);
  });

  test('si el paseo no existe, igual cuenta el evento y no crea el paseo', async () => {
    sembrar({evento: 'bitacora', payload: {accion: 'como_esta.jugo'}});
    await expect(sumarEventoATerritorio(mockDb, 'p1', 'e1', AHORA)).resolves.toBe(true);
    expect(mockDb.__docs.get('operaciones/p1')).toBeUndefined();
  });

  test('otros eventos del paseo (estados, llegada) no cuentan', async () => {
    mockDb.__seed('operaciones/p1', paseo());
    sembrar({evento: 'INICIAR_PASEO', payload: {}});
    await expect(sumarEventoATerritorio(mockDb, 'p1', 'e1', AHORA)).resolves.toBe(false);
    expect(mockDb.__docs.get('operaciones/p1').h3_r9).toBeUndefined();
  });
});
