/**
 * Habilitación: estados, evaluación de requisitos, verificaciones reutilizadas
 * y la puerta única.
 */
import {
  ESTADOS_REQUISITO,
  aplicarVerificaciones,
  DESTINO_DECISION,
  decisionesPosibles,
  resumenParaPerfil,
  ESTADOS_HABILITACION,
  camposFaltantes,
  estadoDelRequisito,
  evaluarServicio,
  ofreceServicio,
  puedeAprobarse,
  transicionExigeMotivo,
  transicionRequisitoValida,
  transicionHabilitacionValida,
  venceEnDe,
  vigenciaDe,
  type ProgresoHabilitacion,
} from '../../src/compartido/habilitacion';
import {requisitoDe} from '../../src/compartido/servicios';

const AHORA = Date.UTC(2026, 9, 25, 12);
const DIA = 86400000;

const PERFIL = {
  biografia: 'Amo a los perros',
  horario_semanal: {'1': {inicio: '08:00', fin: '18:00'}},
  h3_r8: '88aaaaaaaaaaaaa',
  celular: '3001234567',
};

const requisito = (id: string) => {
  const r = requisitoDe('paseo', id);
  if (!r) throw new Error(`falta ${id}`);
  return r;
};

const TODO_VERIFICADO: ProgresoHabilitacion = {
  email: {estado: 'VERIFICADO'},
  identidad: {estado: 'VERIFICADO'},
  antecedentes: {estado: 'VERIFICADO', venceEnMs: AHORA + 30 * DIA},
};

describe('decisionesPosibles (lo que puede hacer el equipo)', () => {
  test('desde cada estado, solo lo que lleva a una transición válida', () => {
    expect(decisionesPosibles('BORRADOR')).toEqual([]);
    expect(decisionesPosibles('EN_REVISION')).toEqual(['RECHAZAR', 'REABRIR']);
    expect(decisionesPosibles('APROBADA')).toEqual(['SUSPENDER']);
    expect(decisionesPosibles('SUSPENDIDA')).toEqual(['REACTIVAR']);
    expect(decisionesPosibles('RECHAZADA')).toEqual(['REABRIR']);
  });

  test('todo lo que se ofrece lleva a una transición válida', () => {
    for (const estado of ESTADOS_HABILITACION) {
      for (const decision of decisionesPosibles(estado)) {
        expect(transicionHabilitacionValida(estado, DESTINO_DECISION[decision])).toBe(true);
      }
    }
  });
});

describe('estados de la habilitación', () => {
  test('desde cada estado solo se llega a lo previsto', () => {
    const permitidas: [string, string][] = [
      ['BORRADOR', 'EN_REVISION'],
      ['EN_REVISION', 'APROBADA'],
      ['EN_REVISION', 'RECHAZADA'],
      ['EN_REVISION', 'BORRADOR'],
      ['APROBADA', 'SUSPENDIDA'],
      ['APROBADA', 'BORRADOR'],
      ['SUSPENDIDA', 'APROBADA'],
      ['RECHAZADA', 'BORRADOR'],
    ];
    let validas = 0;
    for (const a of ESTADOS_HABILITACION) {
      for (const b of ESTADOS_HABILITACION) {
        const esperado = permitidas.some(([x, y]) => x === a && y === b);
        expect(transicionHabilitacionValida(a, b)).toBe(esperado);
        if (esperado) validas++;
      }
    }
    expect(validas).toBe(permitidas.length);
  });

  test('no se aprueba sin pasar por revisión, ni se salta de rechazada a aprobada', () => {
    expect(transicionHabilitacionValida('BORRADOR', 'APROBADA')).toBe(false);
    expect(transicionHabilitacionValida('RECHAZADA', 'APROBADA')).toBe(false);
    expect(transicionHabilitacionValida('SUSPENDIDA', 'EN_REVISION')).toBe(false);
  });

  test('devolver, rechazar y suspender exigen motivo; aprobar o enviar no', () => {
    expect(transicionExigeMotivo('EN_REVISION', 'BORRADOR')).toBe(true);
    expect(transicionExigeMotivo('EN_REVISION', 'RECHAZADA')).toBe(true);
    expect(transicionExigeMotivo('APROBADA', 'SUSPENDIDA')).toBe(true);
    expect(transicionExigeMotivo('BORRADOR', 'EN_REVISION')).toBe(false);
    expect(transicionExigeMotivo('EN_REVISION', 'APROBADA')).toBe(false);
    // renovar por vencimiento lo hace el sistema: sin motivo del equipo
    expect(transicionExigeMotivo('APROBADA', 'BORRADOR')).toBe(false);
    expect(transicionExigeMotivo('RECHAZADA', 'BORRADOR')).toBe(false);
  });
});

describe('estados de un requisito', () => {
  test('corregir y reenviar un rechazo o un vencimiento es válido', () => {
    expect(transicionRequisitoValida('RECHAZADO', 'EN_REVISION')).toBe(true);
    expect(transicionRequisitoValida('EXPIRADO', 'EN_REVISION')).toBe(true);
  });

  test('un requisito no se aprueba sin revisión salvo el que valida el sistema', () => {
    // PENDIENTE → VERIFICADO existe para lo que registra el sistema (el correo)
    expect(transicionRequisitoValida('PENDIENTE', 'VERIFICADO')).toBe(true);
    expect(transicionRequisitoValida('PENDIENTE', 'RECHAZADO')).toBe(false);
    expect(transicionRequisitoValida('RECHAZADO', 'VERIFICADO')).toBe(false);
    expect(transicionRequisitoValida('VERIFICADO', 'RECHAZADO')).toBe(false);
  });

  test('todos los estados tienen transiciones definidas', () => {
    for (const e of ESTADOS_REQUISITO) {
      expect(() => transicionRequisitoValida(e, 'PENDIENTE')).not.toThrow();
    }
  });
});

describe('camposFaltantes', () => {
  test('vacíos, nulos, listas y objetos vacíos faltan; lo demás cuenta', () => {
    expect(camposFaltantes(undefined, ['a'])).toEqual(['a']);
    expect(camposFaltantes({a: '  ', b: null, c: [], d: {}, e: undefined},
      ['a', 'b', 'c', 'd', 'e'])).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(camposFaltantes({a: 'x', b: ['x'], c: {k: 1}, d: 0, e: false},
      ['a', 'b', 'c', 'd', 'e'])).toEqual([]);
  });
});

describe('venceEnDe', () => {
  test('suma la vigencia en meses calendario', () => {
    const venceEn = venceEnDe(requisito('antecedentes'), Date.UTC(2026, 0, 31));
    expect(new Date(venceEn as number).toISOString()).toBe('2027-01-31T00:00:00.000Z');
  });

  test('no vence si no tiene vigencia', () => {
    expect(venceEnDe(requisito('identidad'), AHORA)).toBeNull();
  });

  test('usa la vigencia configurada por el equipo', () => {
    const venceEn = venceEnDe(requisito('antecedentes'), Date.UTC(2026, 0, 31),
      {antecedentes_vigencia_meses: 6});
    expect(new Date(venceEn as number).toISOString()).toBe('2026-07-31T00:00:00.000Z');
  });
});

describe('vigenciaDe', () => {
  test('sin configuración o con un valor inválido, la del catálogo', () => {
    expect(vigenciaDe(requisito('antecedentes'))).toBe(12);
    expect(vigenciaDe(requisito('antecedentes'), {})).toBe(12);
    for (const malo of [0, -3, 1.5, '6', null, undefined]) {
      expect(vigenciaDe(requisito('antecedentes'), {antecedentes_vigencia_meses: malo})).toBe(12);
    }
  });

  test('un requisito que no vence no empieza a vencer por una configuración', () => {
    expect(vigenciaDe(requisito('identidad'), {identidad_vigencia_meses: 6})).toBeNull();
  });
});

describe('estadoDelRequisito', () => {
  test('el perfil se calcula con sus datos', () => {
    expect(estadoDelRequisito(requisito('perfil'), undefined, PERFIL, AHORA)).toBe('VERIFICADO');
    expect(estadoDelRequisito(requisito('perfil'), undefined, {...PERFIL, biografia: ''}, AHORA))
      .toBe('PENDIENTE');
    expect(estadoDelRequisito(requisito('perfil'), undefined, null, AHORA)).toBe('PENDIENTE');
  });

  test('sin avance es PENDIENTE', () => {
    expect(estadoDelRequisito(requisito('identidad'), undefined, PERFIL, AHORA)).toBe('PENDIENTE');
  });

  test('un avance guardado se respeta', () => {
    for (const estado of ['EN_REVISION', 'RECHAZADO', 'VERIFICADO'] as const) {
      expect(estadoDelRequisito(requisito('identidad'), {estado}, PERFIL, AHORA)).toBe(estado);
    }
  });

  test('una aprobación vencida cuenta como EXPIRADO aunque nadie la haya marcado', () => {
    const r = requisito('antecedentes');
    expect(estadoDelRequisito(r, {estado: 'VERIFICADO', venceEnMs: AHORA + 1}, PERFIL, AHORA))
      .toBe('VERIFICADO');
    expect(estadoDelRequisito(r, {estado: 'VERIFICADO', venceEnMs: AHORA}, PERFIL, AHORA))
      .toBe('EXPIRADO');
    expect(estadoDelRequisito(r, {estado: 'VERIFICADO', venceEnMs: null}, PERFIL, AHORA))
      .toBe('VERIFICADO');
  });
});

describe('evaluarServicio', () => {
  test('cumple cuando todo lo obligatorio está verificado y vigente', () => {
    const r = evaluarServicio('paseo', TODO_VERIFICADO, PERFIL, AHORA);
    expect(r.cumple).toBe(true);
    expect(r.pendientes).toEqual([]);
    expect(r.requisitos.map((x) => x.estado)).toEqual(
      ['VERIFICADO', 'VERIFICADO', 'VERIFICADO', 'VERIFICADO']);
  });

  test('sin nada, faltan todos menos lo que el perfil ya cumple', () => {
    const r = evaluarServicio('paseo', {}, PERFIL, AHORA);
    expect(r.cumple).toBe(false);
    expect(r.pendientes).toEqual(['email', 'identidad', 'antecedentes']);
  });

  test('un requisito en revisión, rechazado o vencido no cumple', () => {
    for (const identidad of [
      {estado: 'EN_REVISION'}, {estado: 'RECHAZADO'}, {estado: 'EXPIRADO'},
    ] as const) {
      const r = evaluarServicio('paseo', {...TODO_VERIFICADO, identidad}, PERFIL, AHORA);
      expect(r.cumple).toBe(false);
      expect(r.pendientes).toEqual(['identidad']);
    }
  });

  test('si vencen los antecedentes deja de cumplir sin que nadie lo marque', () => {
    const vencido = {
      ...TODO_VERIFICADO,
      antecedentes: {estado: 'VERIFICADO', venceEnMs: AHORA - 1},
    } as ProgresoHabilitacion;
    const r = evaluarServicio('paseo', vencido, PERFIL, AHORA);
    expect(r.cumple).toBe(false);
    expect(r.pendientes).toEqual(['antecedentes']);
  });

  test('un perfil incompleto no cumple', () => {
    const r = evaluarServicio('paseo', TODO_VERIFICADO, {...PERFIL, h3_r8: undefined}, AHORA);
    expect(r.cumple).toBe(false);
    expect(r.pendientes).toEqual(['perfil']);
  });
});

describe('puedeAprobarse', () => {
  const cumple = evaluarServicio('paseo', TODO_VERIFICADO, PERFIL, AHORA);
  const noCumple = evaluarServicio('paseo', {}, PERFIL, AHORA);

  test('solo desde EN_REVISION y cumpliendo todo', () => {
    expect(puedeAprobarse('EN_REVISION', cumple)).toBe(true);
    expect(puedeAprobarse('EN_REVISION', noCumple)).toBe(false);
    for (const estado of ['BORRADOR', 'APROBADA', 'RECHAZADA', 'SUSPENDIDA'] as const) {
      expect(puedeAprobarse(estado, cumple)).toBe(false);
    }
  });
});

describe('aplicarVerificaciones', () => {
  const identidad = {id: 'v1', tipo: 'IDENTIDAD', venceEnMs: null};
  const antecedentes = {id: 'v2', tipo: 'ANTECEDENTES', venceEnMs: AHORA + 30 * DIA};

  test('lo que la persona ya tiene verificado cuenta, sin repetirlo', () => {
    const r = aplicarVerificaciones('paseo', {}, [identidad, antecedentes], AHORA);
    expect(r.identidad).toEqual({estado: 'VERIFICADO', venceEnMs: null, verificacionId: 'v1'});
    expect(r.antecedentes).toEqual({
      estado: 'VERIFICADO', venceEnMs: AHORA + 30 * DIA, verificacionId: 'v2',
    });
  });

  test('una verificación vencida no cuenta', () => {
    const vencida = {id: 'v3', tipo: 'ANTECEDENTES', venceEnMs: AHORA};
    expect(aplicarVerificaciones('paseo', {}, [vencida], AHORA).antecedentes).toBeUndefined();
  });

  test('de varias del mismo tipo gana la que vence más tarde (o no vence)', () => {
    const r = aplicarVerificaciones('paseo', {}, [
      {id: 'a', tipo: 'ANTECEDENTES', venceEnMs: AHORA + DIA},
      {id: 'b', tipo: 'ANTECEDENTES', venceEnMs: AHORA + 90 * DIA},
    ], AHORA);
    expect(r.antecedentes?.verificacionId).toBe('b');
    const sinVencer = aplicarVerificaciones('paseo', {}, [
      {id: 'a', tipo: 'IDENTIDAD', venceEnMs: AHORA + DIA}, identidad,
    ], AHORA);
    expect(sinVencer.identidad?.verificacionId).toBe('v1');
  });

  test('sube un requisito en revisión o vencido, pero no toca uno ya verificado', () => {
    const progreso: ProgresoHabilitacion = {
      identidad: {estado: 'EN_REVISION'},
      antecedentes: {estado: 'VERIFICADO', venceEnMs: AHORA + 5 * DIA},
    };
    const r = aplicarVerificaciones('paseo', progreso, [identidad, antecedentes], AHORA);
    expect(r.identidad?.estado).toBe('VERIFICADO');
    expect(r.antecedentes).toEqual(progreso.antecedentes);
  });

  test('las verificaciones de otro tipo o del perfil no se mezclan', () => {
    const r = aplicarVerificaciones('paseo', {}, [{id: 'x', tipo: 'EMAIL', venceEnMs: null}], AHORA);
    expect(Object.keys(r)).toEqual(['email']);
    expect(r.perfil).toBeUndefined();
  });

  test('no modifica el avance recibido', () => {
    const progreso: ProgresoHabilitacion = {};
    aplicarVerificaciones('paseo', progreso, [identidad], AHORA);
    expect(progreso).toEqual({});
  });
});

describe('resumenParaPerfil', () => {
  const aprobada = {
    servicio: 'paseo' as const,
    estado: 'APROBADA' as const,
    progreso: {
      email: {estado: 'VERIFICADO' as const},
      identidad: {estado: 'VERIFICADO' as const},
      antecedentes: {estado: 'VERIFICADO' as const, venceEnMs: AHORA + 30 * DIA},
    },
  };

  test('solo las aprobadas figuran, con su vencimiento más cercano', () => {
    expect(resumenParaPerfil([aprobada])).toEqual({
      servicios_habilitados: ['paseo'],
      servicios_vencen: {paseo: AHORA + 30 * DIA},
    });
  });

  test('sin vencimientos, no hay entrada en servicios_vencen', () => {
    const sinVencer = {...aprobada, progreso: {...aprobada.progreso, antecedentes: {estado: 'VERIFICADO' as const}}};
    expect(resumenParaPerfil([sinVencer]))
      .toEqual({servicios_habilitados: ['paseo'], servicios_vencen: {}});
  });

  test('en revisión, suspendida, rechazada o en borrador no habilitan', () => {
    for (const estado of ['BORRADOR', 'EN_REVISION', 'RECHAZADA', 'SUSPENDIDA'] as const) {
      expect(resumenParaPerfil([{...aprobada, estado}]))
        .toEqual({servicios_habilitados: [], servicios_vencen: {}});
    }
  });
});

describe('ofreceServicio (la puerta única)', () => {
  test('solo si el servidor lo dejó en servicios_habilitados', () => {
    expect(ofreceServicio({servicios_habilitados: ['paseo']}, 'paseo', AHORA)).toBe(true);
    expect(ofreceServicio({servicios_habilitados: []}, 'paseo', AHORA)).toBe(false);
    expect(ofreceServicio({}, 'paseo', AHORA)).toBe(false);
    expect(ofreceServicio(null, 'paseo', AHORA)).toBe(false);
    expect(ofreceServicio(undefined, 'paseo', AHORA)).toBe(false);
  });

  test('una habilitación vencida deja de valer sola, sin que nadie la marque', () => {
    const perfil = {servicios_habilitados: ['paseo'], servicios_vencen: {paseo: AHORA}};
    expect(ofreceServicio(perfil, 'paseo', AHORA - 1)).toBe(true);
    expect(ofreceServicio(perfil, 'paseo', AHORA)).toBe(false);
    expect(ofreceServicio(perfil, 'paseo', AHORA + DIA)).toBe(false);
  });

  test('un valor mal formado no abre la puerta', () => {
    expect(ofreceServicio({servicios_habilitados: 'paseo'}, 'paseo', AHORA)).toBe(false);
    expect(ofreceServicio({servicios_habilitados: {paseo: true}}, 'paseo', AHORA)).toBe(false);
  });
});
