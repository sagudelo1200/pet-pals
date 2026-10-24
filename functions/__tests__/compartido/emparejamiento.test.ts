/**
 * Núcleo del emparejamiento: elegibilidad, puntaje, razones y orden.
 */
import {
  calificacionSuavizada,
  continuidadDe,
  diaDeSemana,
  emparejar,
  esBloqueante,
  evaluarCandidato,
  instanteDe,
  semanaIso,
  type AjustesEmparejamiento,
  type Candidato,
  type Solicitud,
} from '../../src/compartido/emparejamiento';
import {valoresPorDefecto} from '../../src/compartido/configuracion';

const CELDA = '88283082e1fffff';
const HORARIO_LUN_A_VIE = Object.fromEntries(
  ['1', '2', '3', '4', '5'].map((d) => [d, {inicio: '08:00', fin: '18:00'}])
);

// Martes 2030-03-12, 10:00 en Colombia
const FECHA = '2030-03-12';
const AHORA = instanteDe('2030-03-01', '08:00');

const AJUSTES: AjustesEmparejamiento = {
  ...valoresPorDefecto('emparejamiento'),
  priorizar_conocidos: true,
  max_mascotas: 4,
};

const solicitud = (cambios: Partial<Solicitud> = {}): Solicitud => ({
  fecha: FECHA,
  hora: '10:00',
  duracion: 60,
  ahoraMs: AHORA,
  celdaTutor: CELDA,
  mascotas: [{id: 'm1', nombre: 'Max', tamano: 'mediano'}],
  ...cambios,
});

const cuidador = (cambios: Partial<Candidato> = {}): Candidato => ({
  id: 'c1',
  nombre: 'Ana',
  insignias: ['EMAIL', 'IDENTIDAD'],
  horarioSemanal: HORARIO_LUN_A_VIE,
  celdas: [CELDA],
  distanciaKm: 1.5,
  rating: 4.5,
  paseosRealizados: 20,
  agenda: [],
  paseosConMascota: {},
  ...cambios,
});

describe('tiempo', () => {
  test('hora de Colombia a instante UTC (UTC-5)', () => {
    expect(new Date(instanteDe('2030-03-12', '10:00')).toISOString())
      .toBe('2030-03-12T15:00:00.000Z');
  });

  test('formatos inválidos dan NaN', () => {
    expect(instanteDe('12/03/2030', '10:00')).toBeNaN();
    expect(instanteDe('2030-03-12', '10h')).toBeNaN();
  });

  test('día de la semana y semana ISO', () => {
    expect(diaDeSemana('2030-03-12')).toBe('2'); // martes
    expect(diaDeSemana('2030-03-17')).toBe('0'); // domingo
    expect(semanaIso('2030-03-12')).toBe('2030-W11');
    expect(semanaIso('2026-01-01')).toBe('2026-W01');
    expect(semanaIso('2025-12-31')).toBe('2026-W01');
  });
});

describe('elegibilidad', () => {
  const estado = (c: Candidato, s = solicitud()) =>
    evaluarCandidato(c, s, AJUSTES);

  test('un cuidador que cumple todo está disponible', () => {
    expect(estado(cuidador()).estado).toBe('disponible');
  });

  test('sin identidad verificada se excluye', () => {
    expect(estado(cuidador({insignias: ['EMAIL']})))
      .toEqual({estado: 'excluido', motivo: 'no_verificado'});
  });

  test('si no cubre la celda del tutor se excluye', () => {
    expect(estado(cuidador({celdas: ['otra']})))
      .toEqual({estado: 'excluido', motivo: 'fuera_de_zona'});
  });

  test('más perros que el tope del servicio: se excluye, sin importar al cuidador', () => {
    const cinco = solicitud({
      mascotas: Array.from({length: 5}, (_, i) => ({id: `m${i}`, nombre: 'x'})),
    });
    expect(estado(cuidador({maxMascotas: 9}), cinco))
      .toEqual({estado: 'excluido', motivo: 'cupo'});
  });

  test('más perros de los que el cuidador prefiere: aviso, no exclusión', () => {
    const dos = solicitud({
      mascotas: [{id: 'm1', nombre: 'A'}, {id: 'm2', nombre: 'B'}],
    });
    const r = estado(cuidador({maxMascotas: 1}), dos);
    expect(r.estado).toBe('disponible');
    expect(r).toMatchObject({advertencias: [{tipo: 'cupo', cupo: 1}]});

    const justo = estado(cuidador({maxMascotas: 2}), dos);
    expect(justo).toMatchObject({estado: 'disponible', advertencias: []});
  });

  test('un cupo propio mayor al del servicio no cuenta: manda el del servicio', () => {
    const tres = solicitud({
      mascotas: Array.from({length: 3}, (_, i) => ({id: `m${i}`, nombre: 'x'})),
    });
    const bajo = {...AJUSTES, max_mascotas: 2};
    expect(evaluarCandidato(cuidador({maxMascotas: 9}), tres, bajo))
      .toEqual({estado: 'excluido', motivo: 'cupo'});
  });

  test('lo que no cuida habitualmente se avisa, nunca se oculta', () => {
    const grande = solicitud({
      mascotas: [{id: 'm1', nombre: 'Rocky', tamano: 'grande'}],
    });
    const pequeno = solicitud({
      mascotas: [{id: 'm1', nombre: 'Toby', tamano: 'pequeño'}],
    });
    // no suele cuidar grandes
    const sinGrandes = cuidador({tamanosAceptados: ['pequeño', 'mediano']});
    expect(estado(sinGrandes, grande)).toMatchObject({
      estado: 'disponible',
      advertencias: [{tipo: 'tamano', mascotas: ['Rocky']}],
    });
    expect(estado(sinGrandes, pequeno)).toMatchObject({advertencias: []});
    // no suele cuidar pequeños
    const sinPequenos = cuidador({tamanosAceptados: ['mediano', 'grande']});
    expect(estado(sinPequenos, pequeno)).toMatchObject({
      estado: 'disponible',
      advertencias: [{tipo: 'tamano', mascotas: ['Toby']}],
    });
    expect(estado(sinPequenos, grande)).toMatchObject({advertencias: []});
    expect(estado(sinPequenos)).toMatchObject({advertencias: []}); // mediano
    // solo extremos, con hueco
    const soloExtremos = cuidador({tamanosAceptados: ['pequeño', 'gigante']});
    expect(estado(soloExtremos)).toMatchObject({
      advertencias: [{tipo: 'tamano', mascotas: ['Max']}],
    });
  });

  test('con varias mascotas solo se nombran las que no encajan', () => {
    const mixto = solicitud({mascotas: [
      {id: 'm1', nombre: 'Toby', tamano: 'pequeño'},
      {id: 'm2', nombre: 'Rocky', tamano: 'grande'},
      {id: 'm3', nombre: 'Luna', tamano: 'grande'},
    ]});
    expect(estado(cuidador({tamanosAceptados: ['pequeño']}), mixto)).toMatchObject({
      advertencias: [{tipo: 'tamano', mascotas: ['Rocky', 'Luna']}],
    });
    expect(estado(cuidador({tamanosAceptados: ['pequeño', 'grande']}), mixto))
      .toMatchObject({advertencias: []});
  });

  test('tamaño y cupo juntos dan dos avisos', () => {
    const s = solicitud({mascotas: [
      {id: 'm1', nombre: 'Rocky', tamano: 'grande'},
      {id: 'm2', nombre: 'Luna', tamano: 'grande'},
    ]});
    const r = estado(cuidador({tamanosAceptados: ['pequeño'], maxMascotas: 1}), s);
    expect(r).toMatchObject({advertencias: [
      {tipo: 'tamano', mascotas: ['Rocky', 'Luna']},
      {tipo: 'cupo', cupo: 1},
    ]});
  });

  test('un cuidador con aviso también lo lleva si está en otro horario', () => {
    const grande = solicitud({
      hora: '19:00',
      mascotas: [{id: 'm1', nombre: 'Rocky', tamano: 'grande'}],
    });
    const r = estado(cuidador({tamanosAceptados: ['pequeño']}), grande);
    expect(r).toMatchObject({
      estado: 'otro_horario',
      motivo: 'horario',
      advertencias: [{tipo: 'tamano', mascotas: ['Rocky']}],
    });
  });

  test('sin tamaño declarado (cuidador o mascota) no se exige nada', () => {
    const sinTamano = solicitud({mascotas: [{id: 'm1', nombre: 'Max'}]});
    expect(estado(cuidador({tamanosAceptados: ['pequeño']}), sinTamano).estado)
      .toBe('disponible');
    expect(estado(cuidador({tamanosAceptados: undefined})).estado)
      .toBe('disponible');
    expect(estado(cuidador({tamanosAceptados: []})).estado).toBe('disponible');
  });
});

describe('horario', () => {
  const alternativo = (c: Candidato, s = solicitud()) => {
    const r = evaluarCandidato(c, s, AJUSTES);
    return r.estado === 'otro_horario' ? r : undefined;
  };

  test('día que no trabaja', () => {
    expect(alternativo(cuidador(), solicitud({fecha: '2030-03-17'}))?.motivo)
      .toBe('no_trabaja');
  });

  test('fuera de su franja, con la franja del día', () => {
    const r = alternativo(cuidador(), solicitud({hora: '19:00'}));
    expect(r).toMatchObject({
      motivo: 'horario', franja: {inicio: '08:00', fin: '18:00'},
    });
  });

  test('margen de cortesía de 12 minutos', () => {
    expect(alternativo(cuidador(), solicitud({hora: '07:48'}))).toBeUndefined();
    expect(alternativo(cuidador(), solicitud({hora: '07:47'}))?.motivo)
      .toBe('horario');
    // termina 18:12 (permitido) o 18:13 (no)
    expect(alternativo(cuidador(), solicitud({hora: '17:12'}))).toBeUndefined();
    expect(alternativo(cuidador(), solicitud({hora: '17:13'}))?.motivo)
      .toBe('horario');
  });

  test('una excepción semanal manda sobre el horario base', () => {
    const libre = cuidador({overrides: {'2': {activo: false}}});
    expect(alternativo(libre)?.motivo).toBe('no_trabaja');
    const tarde = cuidador({
      overrides: {'2': {activo: true, inicio: '14:00', fin: '20:00'}},
    });
    expect(alternativo(tarde)?.motivo).toBe('horario');
    expect(alternativo(tarde, solicitud({hora: '15:00'}))).toBeUndefined();
    // abre un día que el horario base no trabaja
    const domingo = cuidador({
      overrides: {'0': {activo: true, inicio: '09:00', fin: '12:00'}},
    });
    expect(alternativo(domingo, solicitud({fecha: '2030-03-17'})))
      .toBeUndefined();
  });

  test('límites del servicio: 05:30 a 22:30', () => {
    const todoElDia = cuidador({
      horarioSemanal: {'2': {inicio: '00:00', fin: '23:59'}},
    });
    expect(alternativo(todoElDia, solicitud({hora: '05:00'}))?.motivo)
      .toBe('fuera_de_servicio');
    expect(alternativo(todoElDia, solicitud({hora: '22:00'}))?.motivo)
      .toBe('fuera_de_servicio');
    expect(alternativo(todoElDia, solicitud({hora: '05:30'}))).toBeUndefined();
  });

  test('una hora que ya pasó, o con menos de 15 minutos, no sirve', () => {
    const ahora = instanteDe(FECHA, '09:50');
    expect(alternativo(cuidador(), solicitud({ahoraMs: ahora}))?.motivo)
      .toBe('hora_pasada');
    const justo = solicitud({ahoraMs: instanteDe(FECHA, '09:45')});
    expect(alternativo(cuidador(), justo)).toBeUndefined();
  });

  test('agenda: choque, con 5 minutos de descanso entre paseos', () => {
    const paseo = (desde: string, hasta: string) =>
      ({inicioMs: instanteDe(FECHA, desde), finMs: instanteDe(FECHA, hasta)});
    expect(alternativo(cuidador({agenda: [paseo('10:30', '11:30')]}))?.motivo)
      .toBe('ocupado');
    // el paseo previo termina 9:56 y el pedido empieza 10:00: falta descanso
    expect(alternativo(cuidador({agenda: [paseo('09:00', '09:56')]}))?.motivo)
      .toBe('ocupado');
    expect(alternativo(cuidador({agenda: [paseo('09:00', '09:55')]})))
      .toBeUndefined();
    expect(alternativo(cuidador({agenda: [paseo('11:06', '12:00')]})))
      .toBeUndefined();
  });
});

describe('puntaje y razones', () => {
  const evaluado = (c: Candidato, ajustes = AJUSTES, s = solicitud()) => {
    const r = evaluarCandidato(c, s, ajustes);
    if (r.estado !== 'disponible') throw new Error('debía estar disponible');
    return r;
  };

  test('conocer a la mascota suma y lo explica', () => {
    const conoce = evaluado(cuidador({paseosConMascota: {m1: 5}}));
    const no = evaluado(cuidador());
    expect(conoce.puntaje).toBeGreaterThan(no.puntaje);
    expect(conoce.razones).toContain('conoce');
    expect(conoce.continuidad).toEqual({nombres: 'Max', paseos: 5});
    expect(no.continuidad).toBeUndefined();
  });

  test('si el admin apaga "priorizar conocidos" no suma, pero se informa', () => {
    const apagado = {...AJUSTES, priorizar_conocidos: false};
    const conoce = evaluado(cuidador({paseosConMascota: {m1: 5}}), apagado);
    expect(conoce.puntaje).toBe(evaluado(cuidador(), apagado).puntaje);
    expect(conoce.continuidad).toBeDefined();
  });

  test('más cerca puntúa más; a 3 km o más la cercanía vale cero', () => {
    const cerca = evaluado(cuidador({distanciaKm: 0.3}));
    const lejos = evaluado(cuidador({distanciaKm: 2.5}));
    expect(cerca.puntaje).toBeGreaterThan(lejos.puntaje);
    expect(cerca.razones).toContain('cerca');
    expect(lejos.razones).not.toContain('cerca');
    expect(evaluado(cuidador({distanciaKm: 3})).puntaje)
      .toBe(evaluado(cuidador({distanciaKm: 10})).puntaje);
  });

  test('un cuidador nuevo no queda en cero ni se sobrevalora', () => {
    const nuevo = evaluado(cuidador({rating: undefined, paseosRealizados: 0}));
    const tipico = evaluado(cuidador({rating: 4, paseosRealizados: 50}));
    expect(nuevo.razones).toContain('nuevo');
    expect(nuevo.puntaje).toBeCloseTo(tipico.puntaje, 5);
    // una sola evaluación de 5 no lo catapulta
    const suerte = evaluado(cuidador({rating: 5, paseosRealizados: 1}));
    const probado = evaluado(cuidador({rating: 4.8, paseosRealizados: 40}));
    expect(probado.puntaje).toBeGreaterThan(suerte.puntaje);
  });

  test('"destacado" solo con paseos suficientes y buena nota', () => {
    expect(evaluado(cuidador({rating: 4.9, paseosRealizados: 30})).razones)
      .toContain('destacado');
    expect(evaluado(cuidador({rating: 3.5, paseosRealizados: 30})).razones)
      .not.toContain('destacado');
  });

  test('calificación suavizada: sin nota equivale a la inicial', () => {
    expect(calificacionSuavizada(undefined, 0, 5)).toBeCloseTo(0.75);
    expect(calificacionSuavizada(5, 1000, 5)).toBeGreaterThan(0.99);
    expect(calificacionSuavizada(0, 10, 5)).toBeCloseTo(0.75); // 0 = sin nota
  });

  test('continuidad con varias mascotas junta los nombres sin contar paseos', () => {
    const c = cuidador({paseosConMascota: {m1: 3, m2: 1, m3: 9}});
    const mascotas = [
      {id: 'm1', nombre: 'Max'}, {id: 'm2', nombre: 'Luna'},
      {id: 'm3', nombre: 'Rocky'}, {id: 'm4', nombre: 'Kira'},
    ];
    expect(continuidadDe(c, mascotas)).toEqual({nombres: 'Max, Luna y Rocky'});
  });
});

describe('emparejar', () => {
  test('descarta excluidos, ordena por puntaje y deja al final a los de otro horario', () => {
    const lista = emparejar([
      cuidador({id: 'ocupado', nombre: 'Zoe', agenda: [{
        inicioMs: instanteDe(FECHA, '10:00'), finMs: instanteDe(FECHA, '11:00'),
      }]}),
      cuidador({id: 'sin_id', nombre: 'Eva', insignias: ['EMAIL']}),
      cuidador({id: 'lejos', nombre: 'Bea', distanciaKm: 2.8}),
      cuidador({id: 'conoce', nombre: 'Tito', paseosConMascota: {m1: 2}}),
      cuidador({id: 'cerca', nombre: 'Ana', distanciaKm: 0.2}),
    ], solicitud(), AJUSTES);

    expect(lista.map((e) => e.candidato.id))
      .toEqual(['conoce', 'cerca', 'lejos', 'ocupado']);
    expect(lista[3].resultado.estado).toBe('otro_horario');
  });

  test('un aviso baja al cuidador en la lista, pero no lo oculta', () => {
    const grande = solicitud({
      mascotas: [{id: 'm1', nombre: 'Rocky', tamano: 'grande'}],
    });
    const candidatos = [
      cuidador({id: 'a', nombre: 'Ana', tamanosAceptados: ['pequeño']}),
      cuidador({id: 'z', nombre: 'Zoe'}),
    ];
    // Ana saldría primero por nombre; el aviso la manda después de Zoe
    expect(emparejar(candidatos, grande, AJUSTES).map((e) => e.candidato.id))
      .toEqual(['z', 'a']);
    // con el descuento en 0 solo decide el nombre
    const sinDescuento = {...AJUSTES, penalizacion_por_aviso: 0};
    expect(emparejar(candidatos, grande, sinDescuento).map((e) => e.candidato.id))
      .toEqual(['a', 'z']);
  });

  test('el empate se resuelve por nombre, siempre en el mismo orden', () => {
    const lista = emparejar([
      cuidador({id: 'b', nombre: 'Bea'}),
      cuidador({id: 'a', nombre: 'Ana'}),
    ], solicitud(), AJUSTES);
    expect(lista.map((e) => e.candidato.id)).toEqual(['a', 'b']);
  });
});

describe('esBloqueante (lo que se exige al crear o aceptar)', () => {
  const ver = (c: Candidato, s = solicitud()) =>
    esBloqueante(evaluarCandidato(c, s, AJUSTES));
  const paseo = (desde: string, hasta: string) =>
    ({inicioMs: instanteDe(FECHA, desde), finMs: instanteDe(FECHA, hasta)});

  test('disponible no bloquea', () => {
    expect(ver(cuidador())).toBe(false);
  });

  test('toda exclusión bloquea', () => {
    const seis = solicitud({
      mascotas: Array.from({length: 5}, (_, i) => ({id: `m${i}`, nombre: 'x'})),
    });
    expect(ver(cuidador({insignias: []}))).toBe(true);
    expect(ver(cuidador({celdas: []}))).toBe(true);
    expect(ver(cuidador(), seis)).toBe(true); // más que el tope del servicio
  });

  test('tamaño y cupo propio NO bloquean: se avisa y el cuidador decide', () => {
    const dos = solicitud({mascotas: [
      {id: 'm1', nombre: 'Rocky', tamano: 'grande'},
      {id: 'm2', nombre: 'Luna', tamano: 'grande'},
    ]});
    expect(ver(cuidador({tamanosAceptados: ['pequeño']}), dos)).toBe(false);
    expect(ver(cuidador({maxMascotas: 1}), dos)).toBe(false);
  });

  test('chocar con otro paseo suyo, o una hora ya pasada o fuera de servicio, bloquea', () => {
    expect(ver(cuidador({agenda: [paseo('10:00', '11:00')]}))).toBe(true);
    expect(ver(cuidador(), solicitud({ahoraMs: instanteDe(FECHA, '10:00')})))
      .toBe(true);
    expect(ver(cuidador({horarioSemanal: {'2': {inicio: '00:00', fin: '23:59'}}}),
      solicitud({hora: '23:00'}))).toBe(true);
  });

  test('salirse del horario que declaró NO bloquea: él decide', () => {
    expect(ver(cuidador(), solicitud({hora: '19:00'}))).toBe(false); // fuera de franja
    expect(ver(cuidador(), solicitud({fecha: '2030-03-17'}))).toBe(false); // no trabaja
  });
});
