/* eslint-disable camelcase */
/**
 * Emparejamiento de mascota y cuidador (núcleo puro, sin Firebase).
 *
 * Una sola función de verdad: `evaluarCandidato` decide, para un cuidador y un
 * pedido, en tres pasos:
 *   1. Elegibilidad (sí/no, con motivo): quién PUEDE hacer el paseo.
 *   2. Puntaje: en qué orden mostrar a los que pueden. Solo ordena, nunca excluye.
 *   3. Razones: por qué aparece primero (para explicárselo al tutor).
 *
 * Lo ejecuta el servidor (callable `buscarCuidadores`); vive en `compartido`
 * para poder probarse sin Firestore y para que la app use sus tipos. Debe
 * mantenerse puro: nada de firebase-admin, Firestore ni process.env.
 *
 * Las fechas llegan como reloj de pared de Colombia ("2026-05-12" + "08:00"),
 * que no tiene horario de verano: UTC-5 todo el año.
 */
import type {ConfiguracionAreas} from './configuracion';
import type {EstadoServicio} from './zonas';

export type Tamano = 'pequeño' | 'mediano' | 'grande' | 'gigante';

/** Del más chico al más grande. */
export const TAMANOS: readonly Tamano[] =
  ['pequeño', 'mediano', 'grande', 'gigante'];

/** Reglas fijas de la plataforma (no son operativas: cambian el producto). */
export const REGLAS_EMPAREJAMIENTO = {
  /** Horas de diferencia entre Colombia y UTC (UTC = hora local + 5). */
  HORAS_UTC_COLOMBIA: 5,
  HORA_MINIMA_SERVICIO: '05:30',
  HORA_MAXIMA_SERVICIO: '22:30',
  /** Margen de cortesía sobre el horario del cuidador. */
  MARGEN_HORARIO_MIN: 12,
  /** Antelación mínima para un paseo de hoy. */
  ANTELACION_MIN: 15,
  /** Descanso entre dos paseos del mismo cuidador. */
  DESCANSO_ENTRE_PASEOS_MIN: 5,
  /** A esta distancia (km) o más, la cercanía vale 0. */
  RADIO_CERCANIA_KM: 3,
  /** Calificación que se supone a quien aún no tiene evaluaciones. */
  CALIFICACION_INICIAL: 4,
  /** Hasta esta distancia (km) se dice "cerca". */
  KM_CERCA: 1,
  /** Calificación suavizada desde la que se dice "muy bien calificado". */
  CALIFICACION_DESTACADA: 4.6,
} as const;

export interface MascotaDelPedido {
  id: string
  nombre: string
  tamano?: Tamano
}

export interface Solicitud {
  /** "YYYY-MM-DD", fecha en Colombia. */
  fecha: string
  /** "HH:mm", hora en Colombia. */
  hora: string
  /** Minutos. */
  duracion: number
  /** Momento actual (ms), para descartar horas ya pasadas. */
  ahoraMs: number
  /** Celda H3 R8 donde se recoge a la mascota. */
  celdaTutor: string
  mascotas: MascotaDelPedido[]
}

export interface FranjaDia {
  inicio: string
  fin: string
}

export interface OverrideDia {
  activo: boolean
  inicio?: string
  fin?: string
}

export interface Candidato {
  id: string
  nombre: string
  foto?: string
  /** Insignias para mostrar (de `perfiles_publicos`, que solo escribe el servidor). */
  insignias: string[]
  /**
   * Está habilitado para pasear ahora (la puerta única `ofreceServicio`). Es lo
   * que decide si puede recibir pedidos; las insignias son solo para mostrar.
   */
  habilitado: boolean
  horarioSemanal: Record<string, FranjaDia>
  /** Overrides de la semana del pedido (ver ExcepcionDisponibilidad). */
  overrides?: Record<string, OverrideDia>
  /** Celdas H3 R8 que cubre. */
  celdas: string[]
  /** Distancia en km entre su celda de origen y la del tutor. */
  distanciaKm?: number
  rating?: number
  paseosRealizados?: number
  /** Cuántas mascotas acepta a la vez (si no lo declara, el máximo global). */
  maxMascotas?: number
  /** Tamaños de perro que cuida (si no declara ninguno, todos). */
  tamanosAceptados?: Tamano[]
  /** Paseos ya agendados (ms): inicio y fin. */
  agenda: Array<{inicioMs: number; finMs: number}>
  /** Paseos que lleva con cada mascota del pedido: `mascotaId → paseos`. */
  paseosConMascota: Record<string, number>
}

/** Lo que no se negocia: ni se muestra ni se puede tomar. */
export type MotivoExclusion = 'no_habilitado' | 'fuera_de_zona' | 'cupo';

/**
 * Algo que el cuidador normalmente no hace, pero que SÍ puede decidir hacer:
 * no oculta ni bloquea, se avisa (al tutor al elegir, al cuidador al aceptar).
 */
export type Advertencia =
  | {
      tipo: 'tamano'
      /** Nombres de las mascotas de un tamaño que no suele cuidar. */
      mascotas: string[]
    }
  | {
      tipo: 'cupo'
      /** Con cuántos perros a la vez dice trabajar. */
      cupo: number
    };

export type MotivoAlternativo =
  'hora_pasada' | 'fuera_de_servicio' | 'no_trabaja' | 'horario' | 'ocupado';

export type Razon = 'conoce' | 'cerca' | 'destacado' | 'nuevo';

export interface Continuidad {
  /** "Max" · "Max y Luna" */
  nombres: string
  /** Solo con una mascota conocida: cuántos paseos llevan juntos. */
  paseos?: number
}

export type Resultado =
  | {
      estado: 'excluido'
      motivo: MotivoExclusion
    }
  | {
      estado: 'otro_horario'
      motivo: MotivoAlternativo
      /** Horario del cuidador ese día, si trabaja. */
      franja?: FranjaDia
      advertencias: Advertencia[]
    }
  | {
      estado: 'disponible'
      puntaje: number
      razones: Razon[]
      continuidad?: Continuidad
      advertencias: Advertencia[]
    };

export type AjustesEmparejamiento =
  ConfiguracionAreas['emparejamiento'] & {
    /** `expediente.priorizar_conocidos`: si es falso, conocer a la mascota no suma. */
    priorizar_conocidos: boolean
    /** `paseos.max_mascotas`: tope global de mascotas por paseo. */
    max_mascotas: number
  };

// ---------- Tiempo ----------

/**
 * Minutos desde medianoche de "HH:mm".
 * @param {string} hora Hora.
 * @return {number} Minutos, o NaN si el formato no es válido.
 */
export function minutosDe(hora: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Instante (ms UTC) de una fecha y hora de Colombia.
 * @param {string} fecha "YYYY-MM-DD".
 * @param {string} hora "HH:mm".
 * @return {number} Milisegundos, o NaN si algo no es válido.
 */
export function instanteDe(fecha: string, hora: string): number {
  const f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  const min = minutosDe(hora);
  if (!f || Number.isNaN(min)) return NaN;
  return Date.UTC(Number(f[1]), Number(f[2]) - 1, Number(f[3])) +
    (min + REGLAS_EMPAREJAMIENTO.HORAS_UTC_COLOMBIA * 60) * 60000;
}

/**
 * Día de la semana de una fecha "YYYY-MM-DD" (0 = domingo).
 * @param {string} fecha Fecha.
 * @return {string} "0"–"6", como las claves de `horario_semanal`.
 */
export function diaDeSemana(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return String(new Date(Date.UTC(a, m - 1, d)).getUTCDay());
}

/**
 * Semana ISO de una fecha "YYYY-MM-DD", como "2026-W21" (clave de las
 * excepciones semanales de disponibilidad).
 * @param {string} fecha Fecha.
 * @return {string} Semana ISO.
 */
export function semanaIso(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d));
  const n = dia.getUTCDay() || 7;
  dia.setUTCDate(dia.getUTCDate() + 4 - n);
  const inicioAnio = Date.UTC(dia.getUTCFullYear(), 0, 1);
  const semana = Math.ceil(((dia.getTime() - inicioAnio) / 86400000 + 1) / 7);
  return `${dia.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`;
}

/**
 * Horario del cuidador ese día: el override de la semana manda sobre el base.
 * @param {Candidato} c Cuidador.
 * @param {string} dia "0"–"6".
 * @return {FranjaDia | undefined} Franja, o undefined si no trabaja.
 */
export function franjaDelDia(c: Candidato, dia: string): FranjaDia | undefined {
  const base = c.horarioSemanal[dia];
  const override = c.overrides?.[dia];
  if (!override) return base;
  if (!override.activo) return undefined;
  const inicio = override.inicio ?? base?.inicio;
  const fin = override.fin ?? base?.fin;
  return inicio && fin ? {inicio, fin} : undefined;
}

// ---------- Paso 1: elegibilidad ----------

/**
 * ¿Algún paseo agendado se pisa con el pedido (con descanso entre paseos)?
 * @param {Candidato} c Cuidador.
 * @param {number} inicioMs Inicio del pedido.
 * @param {number} finMs Fin del pedido.
 * @return {boolean} Si hay choque.
 */
export function hayChoqueDeAgenda(
  c: Candidato,
  inicioMs: number,
  finMs: number
): boolean {
  const colchon = REGLAS_EMPAREJAMIENTO.DESCANSO_ENTRE_PASEOS_MIN * 60000;
  return c.agenda.some(
    (p) => inicioMs < p.finMs + colchon && finMs > p.inicioMs - colchon
  );
}

/**
 * Primer requisito innegociable que el cuidador no cumple para este pedido.
 * @param {Candidato} c Cuidador.
 * @param {Solicitud} s Pedido.
 * @param {AjustesEmparejamiento} a Ajustes operativos.
 * @return {MotivoExclusion | null} Motivo, o null si cumple todos.
 */
function motivoDeExclusion(
  c: Candidato,
  s: Solicitud,
  a: AjustesEmparejamiento
): MotivoExclusion | null {
  if (!c.habilitado) return 'no_habilitado';
  if (!c.celdas.includes(s.celdaTutor)) return 'fuera_de_zona';
  // Tope de la plataforma (el de cada cuidador es solo una advertencia)
  if (s.mascotas.length > a.max_mascotas) return 'cupo';
  return null;
}

/**
 * Lo que el cuidador normalmente no hace en este pedido (tamaño de las
 * mascotas, cantidad de perros). No excluye: se avisa y él decide.
 * @param {Candidato} c Cuidador.
 * @param {Solicitud} s Pedido.
 * @param {AjustesEmparejamiento} a Ajustes operativos.
 * @return {Advertencia[]} Advertencias (vacío si todo encaja con lo que hace).
 */
export function advertenciasDe(
  c: Candidato,
  s: Solicitud,
  a: AjustesEmparejamiento
): Advertencia[] {
  const avisos: Advertencia[] = [];

  const aceptados = c.tamanosAceptados;
  if (aceptados && aceptados.length > 0) {
    const fuera = s.mascotas.filter(
      (m) => m.tamano !== undefined && !aceptados.includes(m.tamano)
    );
    if (fuera.length > 0) {
      avisos.push({tipo: 'tamano', mascotas: fuera.map((m) => m.nombre)});
    }
  }

  const cupo = Math.min(c.maxMascotas ?? a.max_mascotas, a.max_mascotas);
  if (s.mascotas.length > cupo) avisos.push({tipo: 'cupo', cupo});

  return avisos;
}

/**
 * Por qué el cuidador no está a esa hora (reloj, horario o agenda).
 * @param {Candidato} c Cuidador.
 * @param {Solicitud} s Pedido.
 * @return {object | null} Motivo (y su franja del día), o null si está libre.
 */
function motivoDeHorario(
  c: Candidato,
  s: Solicitud
): {motivo: MotivoAlternativo; franja?: FranjaDia} | null {
  const R = REGLAS_EMPAREJAMIENTO;
  const inicioMs = instanteDe(s.fecha, s.hora);
  const inicio = minutosDe(s.hora);
  const fin = inicio + s.duracion;
  const finMs = inicioMs + s.duracion * 60000;

  if (inicioMs < s.ahoraMs + R.ANTELACION_MIN * 60000) {
    return {motivo: 'hora_pasada'};
  }
  if (inicio < minutosDe(R.HORA_MINIMA_SERVICIO) ||
    fin > minutosDe(R.HORA_MAXIMA_SERVICIO)) {
    return {motivo: 'fuera_de_servicio'};
  }

  const franja = franjaDelDia(c, diaDeSemana(s.fecha));
  if (!franja) return {motivo: 'no_trabaja'};
  const dentro = inicio >= minutosDe(franja.inicio) - R.MARGEN_HORARIO_MIN &&
    fin <= minutosDe(franja.fin) + R.MARGEN_HORARIO_MIN;
  if (!dentro) return {motivo: 'horario', franja};

  if (hayChoqueDeAgenda(c, inicioMs, finMs)) return {motivo: 'ocupado', franja};
  return null;
}

// ---------- Pasos 2 y 3: puntaje y razones ----------

const unir = (nombres: string[]): string =>
  nombres.length <= 1 ?
    (nombres[0] ?? '') :
    `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;

/**
 * Qué mascotas del pedido ya conoce el cuidador.
 * @param {Candidato} c Cuidador.
 * @param {MascotaDelPedido[]} mascotas Mascotas del pedido.
 * @return {Continuidad | undefined} Nombres (y paseos si es una), o undefined.
 */
export function continuidadDe(
  c: Candidato,
  mascotas: MascotaDelPedido[]
): Continuidad | undefined {
  const conocidas = mascotas.filter((m) => (c.paseosConMascota[m.id] ?? 0) > 0);
  if (conocidas.length === 0) return undefined;
  const nombres = unir(conocidas.map((m) => m.nombre).filter(Boolean));
  return conocidas.length === 1 ?
    {nombres, paseos: c.paseosConMascota[conocidas[0].id]} :
    {nombres};
}

/**
 * Calificación suavizada (0–1): con pocos paseos pesa más la calificación
 * inicial, así un cuidador nuevo no queda enterrado ni sobrevalorado.
 * @param {number | undefined} rating Calificación (1–5).
 * @param {number} paseos Paseos realizados.
 * @param {number} paseosParaConfiar Paseos desde los que se confía en la nota.
 * @return {number} Valor entre 0 y 1.
 */
export function calificacionSuavizada(
  rating: number | undefined,
  paseos: number,
  paseosParaConfiar: number
): number {
  const nota = rating !== undefined && rating > 0 ? rating : undefined;
  const n = nota === undefined ? 0 : paseos;
  const inicial = REGLAS_EMPAREJAMIENTO.CALIFICACION_INICIAL;
  const suave = ((nota ?? inicial) * n + inicial * paseosParaConfiar) /
    (n + paseosParaConfiar);
  return Math.min(1, Math.max(0, (suave - 1) / 4));
}

/**
 * Puntaje (suma ponderada) y razones de un cuidador que ya puede hacer el paseo.
 * @param {Candidato} c Cuidador.
 * @param {Solicitud} s Pedido.
 * @param {AjustesEmparejamiento} a Ajustes operativos.
 * @param {Advertencia[]} advertencias Avisos del pedido: restan puntaje.
 * @return {object} Puntaje, razones y a qué mascotas conoce.
 */
function puntuar(
  c: Candidato,
  s: Solicitud,
  a: AjustesEmparejamiento,
  advertencias: Advertencia[]
) {
  const R = REGLAS_EMPAREJAMIENTO;
  const continuidad = continuidadDe(c, s.mascotas);
  const conocidas = s.mascotas.filter(
    (m) => (c.paseosConMascota[m.id] ?? 0) > 0
  ).length;

  const delPedido = s.mascotas.length === 0 ? 0 : conocidas / s.mascotas.length;
  const dePasadas = c.paseosRealizados ?? 0;
  const nota = calificacionSuavizada(c.rating, dePasadas, a.paseos_para_confiar);
  const cerca = c.distanciaKm === undefined ?
    0 : 1 - Math.min(c.distanciaKm, R.RADIO_CERCANIA_KM) / R.RADIO_CERCANIA_KM;

  const pesoConocer = a.priorizar_conocidos ? a.peso_continuidad : 0;
  const puntaje = pesoConocer * delPedido +
    a.peso_calificacion * nota +
    a.peso_cercania * cerca -
    a.penalizacion_por_aviso * advertencias.length;

  const razones: Razon[] = [];
  if (continuidad) razones.push('conoce');
  if (c.distanciaKm !== undefined && c.distanciaKm <= R.KM_CERCA) {
    razones.push('cerca');
  }
  if (dePasadas < a.paseos_para_confiar) razones.push('nuevo');
  else if (nota * 4 + 1 >= R.CALIFICACION_DESTACADA) razones.push('destacado');

  return {puntaje, razones, continuidad};
}

/**
 * Evalúa a un cuidador para un pedido.
 * @param {Candidato} c Cuidador.
 * @param {Solicitud} s Pedido.
 * @param {AjustesEmparejamiento} a Ajustes operativos.
 * @return {Resultado} Excluido, disponible en otro horario, o disponible.
 */
export function evaluarCandidato(
  c: Candidato,
  s: Solicitud,
  a: AjustesEmparejamiento
): Resultado {
  const exclusion = motivoDeExclusion(c, s, a);
  if (exclusion) return {estado: 'excluido', motivo: exclusion};

  const advertencias = advertenciasDe(c, s, a);
  const horario = motivoDeHorario(c, s);
  if (horario) return {estado: 'otro_horario', ...horario, advertencias};

  return {estado: 'disponible', ...puntuar(c, s, a, advertencias), advertencias};
}

/**
 * ¿Este resultado impide que el cuidador tome un paseo concreto? Es lo que se
 * exige al crear o aceptar. Salirse del horario que declaró NO bloquea: él
 * decide si lo acepta (y el tutor ya puede coordinar otro horario). Sí bloquean
 * las exclusiones, un choque con otro paseo suyo y las horas fuera de servicio.
 * Las advertencias (tamaño, cupo propio) tampoco bloquean: el cuidador decide.
 * @param {Resultado} r Resultado de evaluar al cuidador.
 * @return {boolean} true si no puede tomar el paseo.
 */
export function esBloqueante(r: Resultado): boolean {
  if (r.estado === 'excluido') return true;
  if (r.estado === 'disponible') return false;
  return r.motivo === 'ocupado' || r.motivo === 'hora_pasada' ||
    r.motivo === 'fuera_de_servicio';
}

export interface Evaluado {
  candidato: Candidato
  resultado: Exclude<Resultado, {estado: 'excluido'}>
}

/**
 * Evalúa a todos, descarta los excluidos y ordena: primero los disponibles
 * (mejor puntaje arriba; empate por nombre para que el orden sea estable) y
 * después los de otro horario.
 * @param {Candidato[]} candidatos Cuidadores.
 * @param {Solicitud} s Pedido.
 * @param {AjustesEmparejamiento} a Ajustes operativos.
 * @return {Evaluado[]} Lista ordenada, sin excluidos.
 */
export function emparejar(
  candidatos: Candidato[],
  s: Solicitud,
  a: AjustesEmparejamiento
): Evaluado[] {
  const evaluados: Evaluado[] = [];
  for (const candidato of candidatos) {
    const resultado = evaluarCandidato(candidato, s, a);
    if (resultado.estado !== 'excluido') evaluados.push({candidato, resultado});
  }
  const puntaje = (e: Evaluado) =>
    e.resultado.estado === 'disponible' ? e.resultado.puntaje : -1;
  return evaluados.sort((x, y) =>
    Number(y.resultado.estado === 'disponible') -
      Number(x.resultado.estado === 'disponible') ||
    puntaje(y) - puntaje(x) ||
    x.candidato.nombre.localeCompare(y.candidato.nombre) ||
    x.candidato.id.localeCompare(y.candidato.id)
  );
}

// ---------- Lo que recibe y devuelve el callable `buscarCuidadores` ----------

export interface PeticionBusqueda {
  /** "YYYY-MM-DD" (fecha en Colombia). */
  fecha: string
  /** "HH:mm" (hora en Colombia). */
  hora: string
  duracion: number
  /** Celda H3 R8 del punto de recogida. */
  celda: string
  mascotaIds: string[]
}

export interface CuidadorEncontrado {
  id: string
  nombre: string
  foto?: string
  calificacion: number
  /** Distancia en km entre las celdas de origen (si se conoce). */
  distanciaKm?: number
  insignias: string[]
  estado: 'disponible' | 'otro_horario'
  /** Solo si `estado` es `otro_horario`. */
  motivo?: MotivoAlternativo
  franja?: FranjaDia
  razones: Razon[]
  continuidad?: Continuidad
  /** Lo que normalmente no hace: se muestra al tutor, que decide. */
  advertencias: Advertencia[]
}

export interface RespuestaBusqueda {
  /** Si no se atiende ese sector, no hay cuidadores y aquí está el motivo. */
  servicio: EstadoServicio
  cuidadores: CuidadorEncontrado[]
}

/** Respuesta de `aceptarPaseo`. */
export type RespuestaAceptacion =
  | {aceptado: true; id_cuidador: string}
  | {
      /** Hay avisos: no se aceptó; se repite con `confirmo: true` si decide seguir. */
      aceptado: false
      requiereConfirmacion: true
      advertencias: Advertencia[]
    };
