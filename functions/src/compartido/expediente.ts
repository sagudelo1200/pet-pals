/* eslint-disable camelcase */
/**
 * CONOCER A LA MASCOTA: catálogo de momentos, reglas de derivación y resumen.
 *
 * Compartido por la app y las Cloud Functions (TypeScript puro, sin
 * dependencias). Lo que el cuidador registra durante el paseo ("momentos")
 * se convierte en APRENDIZAJES sobre la mascota ("se pone nervioso con motos
 * o carros") y estos arman el resumen que lee el siguiente cuidador.
 *
 * Todas las claves dicen qué son por sí solas (`grupo.accion`,
 * `se_pone_nervioso_con_motos_o_carros`): nadie debe leerlas "a ciegas".
 *
 * Cada momento lleva su dominio de bienestar animal (los cinco de la Ley
 * Kiara, art. 3), así el expediente queda alineado con la ley sin que el
 * cuidador tenga que pensar en ella.
 */

// ---------- Dominios de bienestar (Ley 2480 de 2025, art. 3) ----------

export const DOMINIOS = [
  'nutricion',
  'ambiente',
  'salud',
  'comportamiento',
  'estado_mental',
] as const;

export type Dominio = typeof DOMINIOS[number];

// ---------- Catálogo de momentos ----------

export const GRUPOS_MOMENTO = [
  'como_esta',
  'necesidades',
  'lugar_y_ambiente',
  'emergencia',
] as const;

export type GrupoMomento = typeof GRUPOS_MOMENTO[number];

export type Gravedad = 'baja' | 'media' | 'critica';

/** Pregunta opcional que sigue a ciertos momentos. */
export type Seguimiento = 'causa_y_calma' | 'detalle_del_conflicto';

export interface DefinicionMomento {
  /** `grupo.accion`: dice qué es por sí sola. */
  clave: string
  grupo: GrupoMomento
  /** Texto legible (la app lo traduce con i18n; este es el de respaldo). */
  etiqueta: string
  dominio: Dominio
  seguimiento?: Seguimiento
  /** Solo en el grupo emergencia: son incidentes con severidad. */
  gravedad?: Gravedad
}

const m = (
  clave: string,
  etiqueta: string,
  dominio: Dominio,
  extra: Pick<DefinicionMomento, 'seguimiento' | 'gravedad'> = {}
): DefinicionMomento => ({
  clave,
  grupo: clave.split('.')[0] as GrupoMomento,
  etiqueta,
  dominio,
  ...extra,
});

export const MOMENTOS: readonly DefinicionMomento[] = [
  // Cómo está
  m('como_esta.se_ve_contento', 'Se ve contento', 'estado_mental'),
  m('como_esta.jugo', 'Jugó', 'comportamiento'),
  m('como_esta.exploro_y_olfateo', 'Exploró y olfateó', 'comportamiento'),
  m('como_esta.corrio', 'Corrió', 'comportamiento'),
  m('como_esta.descanso', 'Descansó', 'estado_mental'),
  m('como_esta.saludo_a_otros_perros', 'Saludó a otros perros', 'comportamiento'),
  m('como_esta.saludo_a_personas', 'Saludó a personas', 'comportamiento'),
  m('como_esta.se_puso_nervioso', 'Se puso nervioso', 'estado_mental',
    {seguimiento: 'causa_y_calma'}),
  // Necesidades
  m('necesidades.tomo_agua', 'Tomó agua', 'nutricion'),
  m('necesidades.comio_algo_del_suelo', 'Comió algo del suelo', 'nutricion'),
  // Lugar y ambiente
  m('lugar_y_ambiente.lugar_parque', 'Parque', 'ambiente'),
  m('lugar_y_ambiente.lugar_sendero', 'Sendero', 'ambiente'),
  m('lugar_y_ambiente.lugar_zona_residencial', 'Zona residencial', 'ambiente'),
  m('lugar_y_ambiente.lugar_zona_de_perros', 'Zona de perros', 'ambiente'),
  m('lugar_y_ambiente.lugar_pet_friendly', 'Lugar pet-friendly', 'ambiente'),
  m('lugar_y_ambiente.lugar_rio_o_lago', 'Río o lago', 'ambiente'),
  m('lugar_y_ambiente.lugar_en_el_carro', 'En el carro', 'ambiente'),
  m('lugar_y_ambiente.lugar_otro', 'Otro lugar', 'ambiente'),
  m('lugar_y_ambiente.clima_lluvia', 'Lluvia', 'ambiente'),
  m('lugar_y_ambiente.clima_calor_fuerte', 'Calor fuerte', 'ambiente'),
  m('lugar_y_ambiente.camino_cerrado', 'Camino cerrado', 'ambiente'),
  // Emergencia (incidentes con severidad)
  m('emergencia.emergencia', 'Emergencia', 'salud', {gravedad: 'critica'}),
  m('emergencia.lesion', 'Lesión', 'salud', {gravedad: 'media'}),
  m('emergencia.conflicto_con_otro_perro', 'Conflicto con otro perro',
    'comportamiento', {gravedad: 'media', seguimiento: 'detalle_del_conflicto'}),
  m('emergencia.contacte_al_tutor', 'Contacté al tutor', 'salud',
    {gravedad: 'baja'}),
];

/**
 * Definición de un momento por su clave.
 * @param {string} clave Clave `grupo.accion`.
 * @return {DefinicionMomento | undefined} Definición, o undefined si no existe.
 */
export function momentoPorClave(clave: string): DefinicionMomento | undefined {
  return MOMENTOS.find((d) => d.clave === clave);
}

/**
 * Momentos de un grupo, en el orden del catálogo.
 * @param {GrupoMomento} grupo Grupo.
 * @return {DefinicionMomento[]} Momentos del grupo.
 */
export function momentosDelGrupo(grupo: GrupoMomento): DefinicionMomento[] {
  return MOMENTOS.filter((d) => d.grupo === grupo);
}

// ---------- Seguimientos opcionales ----------

export interface OpcionSeguimiento {
  clave: string
  etiqueta: string
  /** Fragmento para armar el aprendizaje ("motos o carros", "si lo dejas oler"). */
  texto: string
}

export const CAUSAS_DEL_NERVIOSISMO: readonly OpcionSeguimiento[] = [
  {clave: 'motos_o_carros', etiqueta: 'Motos o carros', texto: 'motos o carros'},
  {clave: 'ruido_fuerte', etiqueta: 'Ruido fuerte', texto: 'ruidos fuertes'},
  {clave: 'perro_grande', etiqueta: 'Perro grande', texto: 'perros grandes'},
  {clave: 'perro_sin_correa', etiqueta: 'Perro sin correa',
    texto: 'perros sin correa'},
  {clave: 'personas_desconocidas', etiqueta: 'Personas desconocidas',
    texto: 'personas desconocidas'},
  {clave: 'ninos_o_bicicletas', etiqueta: 'Niños o bicicletas',
    texto: 'niños o bicicletas'},
  {clave: 'otra_causa', etiqueta: 'Otra causa', texto: 'algo que aún no se identifica'},
];

export const FORMAS_DE_CALMARLO: readonly OpcionSeguimiento[] = [
  {clave: 'con_voz_suave', etiqueta: 'Hablándole', texto: 'si le hablas con voz suave'},
  {clave: 'alejandose_del_estimulo', etiqueta: 'Alejándonos',
    texto: 'si te alejas de lo que lo asusta'},
  {clave: 'dejandolo_oler', etiqueta: 'Dejándolo oler', texto: 'si lo dejas oler'},
  {clave: 'caminando_despacio', etiqueta: 'Caminando despacio',
    texto: 'si caminas despacio'},
  {clave: 'aun_nada', etiqueta: 'Aún nada', texto: ''},
];

export const DETALLES_DEL_CONFLICTO: readonly OpcionSeguimiento[] = [
  {clave: 'ladro_o_gruno', etiqueta: 'Ladró o gruñó', texto: 'ladró o gruñó'},
  {clave: 'se_tenso_sin_pelear', etiqueta: 'Se tensó sin pelear',
    texto: 'se tensó sin pelear'},
  {clave: 'hubo_contacto', etiqueta: 'Hubo contacto', texto: 'hubo contacto'},
];

const LUGARES_DONDE_DISFRUTA: Record<string, string> = {
  'lugar_y_ambiente.lugar_parque': 'el parque',
  'lugar_y_ambiente.lugar_sendero': 'el sendero',
  'lugar_y_ambiente.lugar_zona_de_perros': 'la zona de perros',
  'lugar_y_ambiente.lugar_pet_friendly': 'el lugar pet-friendly',
  'lugar_y_ambiente.lugar_rio_o_lago': 'el río o lago',
};

// ---------- Momento registrado ----------

/** Lo que llega de la app cuando el cuidador registra un momento. */
export interface MomentoRegistrado {
  clave: string
  /** Seguimiento de `se_puso_nervioso`: clave de CAUSAS_DEL_NERVIOSISMO. */
  causa?: string
  /** Seguimiento de `se_puso_nervioso`: clave de FORMAS_DE_CALMARLO. */
  calmo_con?: string
  /** Seguimiento de `conflicto_con_otro_perro`: clave de DETALLES_DEL_CONFLICTO. */
  detalle_del_conflicto?: string
  /** Último lugar registrado en el paseo (clave de un momento de lugar). */
  lugar?: string
  cuidador_id: string
  paseo_id: string
  fecha_ms: number
}

const existe = (lista: readonly OpcionSeguimiento[], clave: string) =>
  lista.some((o) => o.clave === clave);

/**
 * Valida un momento recibido de la app.
 * @param {unknown} datos Datos recibidos.
 * @return {string[]} Errores encontrados (vacío si es válido).
 */
export function validarMomento(datos: unknown): string[] {
  const d = datos as Partial<MomentoRegistrado> | undefined;
  const errores: string[] = [];
  const def = typeof d?.clave === 'string' ? momentoPorClave(d.clave) : undefined;
  if (!def) errores.push('clave: no es un momento conocido');
  if (d?.causa !== undefined && !existe(CAUSAS_DEL_NERVIOSISMO, d.causa)) {
    errores.push('causa: opción desconocida');
  }
  if (d?.calmo_con !== undefined && !existe(FORMAS_DE_CALMARLO, d.calmo_con)) {
    errores.push('calmo_con: opción desconocida');
  }
  if (d?.detalle_del_conflicto !== undefined &&
      !existe(DETALLES_DEL_CONFLICTO, d.detalle_del_conflicto)) {
    errores.push('detalle_del_conflicto: opción desconocida');
  }
  if (def && def.seguimiento !== 'causa_y_calma' && (d?.causa || d?.calmo_con)) {
    errores.push('causa y calmo_con solo aplican a "se puso nervioso"');
  }
  if (def && def.seguimiento !== 'detalle_del_conflicto' &&
      d?.detalle_del_conflicto) {
    errores.push('detalle_del_conflicto solo aplica a un conflicto con otro perro');
  }
  if (d?.lugar !== undefined) {
    const lugar = momentoPorClave(d.lugar);
    if (!lugar || !d.lugar.startsWith('lugar_y_ambiente.lugar_')) {
      errores.push('lugar: no es un momento de lugar');
    }
  }
  return errores;
}

// ---------- Aprendizajes ----------

export type TipoAprendizaje =
  'le_gusta' | 'lo_estresa' | 'como_manejarlo' | 'dato_util';

/** Lo que una regla deduce de un momento. */
export interface SenalDerivada {
  /** Dice qué es: `se_pone_nervioso_con_motos_o_carros`. */
  clave: string
  tipo: TipoAprendizaje
  dominio: Dominio
  /** Frase lista para mostrar. */
  texto: string
  /** Pide confirmación del tutor antes de darse por firme. */
  sensible: boolean
  /** Veces que debe verse para mostrarse. */
  veces_minimas: number
  /** Paseos distintos en que debe verse para mostrarse. */
  paseos_minimos: number
}

const senal = (
  clave: string,
  tipo: TipoAprendizaje,
  dominio: Dominio,
  texto: string,
  extra: Partial<Pick<SenalDerivada,
    'sensible' | 'veces_minimas' | 'paseos_minimos'>> = {}
): SenalDerivada => ({
  clave,
  tipo,
  dominio,
  texto,
  sensible: false,
  veces_minimas: 1,
  paseos_minimos: 1,
  ...extra,
});

/**
 * Aprendizajes que se deducen de UN momento (reglas del diseño). Un momento
 * puede alimentar varios aprendizajes.
 * @param {MomentoRegistrado} momento Momento registrado.
 * @return {SenalDerivada[]} Señales derivadas (vacío si no enseña nada).
 */
export function senalesDeMomento(momento: MomentoRegistrado): SenalDerivada[] {
  const senales: SenalDerivada[] = [];
  const dondeDisfruta = momento.lugar ?
    LUGARES_DONDE_DISFRUTA[momento.lugar] : undefined;

  switch (momento.clave) {
  case 'como_esta.se_puso_nervioso': {
    const causa = CAUSAS_DEL_NERVIOSISMO.find((o) => o.clave === momento.causa);
    if (causa && causa.clave !== 'otra_causa') {
      senales.push(senal(`se_pone_nervioso_con_${causa.clave}`, 'lo_estresa',
        'estado_mental', `Se pone nervioso con ${causa.texto}`));
    } else {
      senales.push(senal('se_pone_nervioso_sin_causa_conocida', 'lo_estresa',
        'estado_mental',
        'Se pone nervioso durante los paseos; aún no se sabe con qué',
        {veces_minimas: 2}));
    }
    const calma = FORMAS_DE_CALMARLO.find((o) => o.clave === momento.calmo_con);
    if (calma && calma.clave !== 'aun_nada') {
      senales.push(senal(`se_calma_${calma.clave}`, 'como_manejarlo',
        'comportamiento', `Se calma ${calma.texto}`));
    }
    break;
  }
  case 'emergencia.conflicto_con_otro_perro':
    senales.push(senal('tuvo_un_conflicto_con_otro_perro', 'lo_estresa',
      'comportamiento', 'Tuvo un conflicto con otro perro', {sensible: true}));
    break;
  case 'como_esta.jugo':
    if (dondeDisfruta) {
      senales.push(senal(
        `disfruta_jugar_en_${momento.lugar!.split('.')[1].replace('lugar_', '')}`,
        'le_gusta', 'comportamiento', `Disfruta jugar en ${dondeDisfruta}`,
        {veces_minimas: 2}));
    }
    break;
  case 'como_esta.exploro_y_olfateo':
    senales.push(senal('disfruta_olfatear_y_explorar', 'le_gusta',
      'comportamiento', 'Disfruta olfatear y explorar', {veces_minimas: 3}));
    break;
  case 'como_esta.corrio':
    senales.push(senal('disfruta_correr', 'le_gusta', 'comportamiento',
      'Disfruta correr', {veces_minimas: 3}));
    break;
  case 'como_esta.saludo_a_otros_perros':
    senales.push(senal('disfruta_saludar_a_otros_perros', 'le_gusta',
      'comportamiento', 'Disfruta saludar a otros perros', {veces_minimas: 3}));
    break;
  case 'como_esta.saludo_a_personas':
    senales.push(senal('disfruta_saludar_a_personas', 'le_gusta',
      'comportamiento', 'Disfruta saludar a personas', {veces_minimas: 3}));
    break;
  case 'como_esta.se_ve_contento':
    senales.push(senal('suele_verse_contento_durante_el_paseo', 'dato_util',
      'estado_mental', 'Suele verse contento durante el paseo',
      {veces_minimas: 3}));
    break;
  case 'necesidades.tomo_agua':
    senales.push(senal('pide_agua_seguido', 'dato_util', 'nutricion',
      'Pide agua seguido: ofrécele durante el paseo',
      {veces_minimas: 4, paseos_minimos: 2}));
    break;
  case 'necesidades.comio_algo_del_suelo':
    senales.push(senal('come_cosas_del_suelo', 'dato_util', 'nutricion',
      'Come cosas del suelo: mantén atención', {sensible: true}));
    break;
  default:
    break;
  }
  return senales;
}

// ---------- Alertas (no son aprendizajes) ----------

export const DIAS_DE_UNA_ALERTA = 30;

export interface Alerta {
  clave: string
  texto: string
  dominio: Dominio
  fecha_ms: number
  paseo_id?: string
}

/**
 * Alertas que deja un momento (lesiones y emergencias).
 * @param {MomentoRegistrado} momento Momento registrado.
 * @return {Alerta[]} Alertas (vacío si no corresponde ninguna).
 */
export function alertasDeMomento(momento: MomentoRegistrado): Alerta[] {
  const alerta = (clave: string, texto: string): Alerta => ({
    clave, texto, dominio: 'salud', fecha_ms: momento.fecha_ms,
    paseo_id: momento.paseo_id,
  });
  if (momento.clave === 'emergencia.emergencia') {
    return [alerta('tuvo_una_emergencia_reciente',
      'Tuvo una emergencia en un paseo reciente')];
  }
  if (momento.clave === 'emergencia.lesion') {
    return [alerta('tuvo_una_lesion_reciente',
      'Tuvo una lesión en un paseo reciente')];
  }
  return [];
}

export const LLEGADAS = [
  'tranquilo',
  'cansado_bien',
  'agitado',
  'con_molestia',
] as const;

export type Llegada = typeof LLEGADAS[number];

/**
 * Alerta que deja "¿cómo llegó?" cuando la mascota llegó con molestia.
 * @param {string} llegada Respuesta del tutor.
 * @param {number} fechaMs Momento de la respuesta.
 * @param {string} paseoId Paseo.
 * @return {Alerta[]} Alertas (vacío si llegó bien).
 */
export function alertasDeLlegada(
  llegada: string,
  fechaMs: number,
  paseoId: string
): Alerta[] {
  return llegada === 'con_molestia' ? [{
    clave: 'llego_con_molestia_en_el_ultimo_paseo',
    texto: 'Llegó con molestia después de un paseo reciente',
    dominio: 'salud',
    fecha_ms: fechaMs,
    paseo_id: paseoId,
  }] : [];
}

// ---------- Acumulación por mascota ----------

/** Lo acumulado de un aprendizaje: lo que guarda el expediente. */
export interface AprendizajeAcumulado extends SenalDerivada {
  veces: number
  cuidadores: string[]
  paseos: string[]
  ultima_ms: number
}

export type EstadoDeAprendizajes = Record<string, AprendizajeAcumulado>;

/**
 * Suma un momento a lo ya acumulado de una mascota (no modifica el original).
 * @param {EstadoDeAprendizajes} previo Estado anterior.
 * @param {MomentoRegistrado} momento Momento nuevo.
 * @return {EstadoDeAprendizajes} Estado actualizado.
 */
export function acumularMomento(
  previo: EstadoDeAprendizajes,
  momento: MomentoRegistrado
): EstadoDeAprendizajes {
  const siguiente: EstadoDeAprendizajes = {...previo};
  for (const s of senalesDeMomento(momento)) {
    const antes = siguiente[s.clave];
    siguiente[s.clave] = {
      ...s,
      veces: (antes?.veces ?? 0) + 1,
      cuidadores: unir(antes?.cuidadores, momento.cuidador_id),
      paseos: unir(antes?.paseos, momento.paseo_id),
      ultima_ms: Math.max(antes?.ultima_ms ?? 0, momento.fecha_ms),
    };
  }
  return siguiente;
}

const unir = (lista: string[] | undefined, valor: string): string[] =>
  lista?.includes(valor) ? lista : [...(lista ?? []), valor];

// ---------- Resumen ----------

export type EstadoAprendizaje = 'confirmado' | 'firme' | 'observado';
export type Confirmacion = 'confirmado' | 'rechazado';

export interface OpcionesResumen {
  ahora_ms: number
  /** `expediente.dias_vigencia_aprendizaje` */
  dias_vigencia: number
  /** `expediente.repeticiones_para_firme` */
  veces_para_firme: number
  /** `expediente.aprendizajes_en_resumen` (por sección) */
  max_por_seccion: number
}

export interface ItemResumen {
  clave: string
  texto: string
  tipo: TipoAprendizaje
  dominio: Dominio
  estado: EstadoAprendizaje
  sensible: boolean
  veces: number
}

export interface ResumenDeMascota {
  /** Le gusta y lo que funciona para manejarla. */
  que_funciona: ItemResumen[]
  /** Lo que la estresa. */
  que_evitar: ItemResumen[]
  /** Datos útiles a tener en cuenta. */
  ten_en_cuenta: ItemResumen[]
  /** Aprendizajes sensibles que el tutor aún no confirma ni rechaza. */
  por_confirmar: ItemResumen[]
  alertas: Alerta[]
}

const DIA_MS = 24 * 60 * 60 * 1000;

type ItemConFecha = ItemResumen & {ultima_ms: number};

/**
 * Item del resumen sin la fecha interna usada para ordenar.
 * @param {ItemConFecha} i Item con fecha.
 * @return {ItemResumen} Item para mostrar.
 */
const aItem = (i: ItemConFecha): ItemResumen => ({
  clave: i.clave,
  texto: i.texto,
  tipo: i.tipo,
  dominio: i.dominio,
  estado: i.estado,
  sensible: i.sensible,
  veces: i.veces,
});

const ORDEN_ESTADO: Record<EstadoAprendizaje, number> = {
  confirmado: 0, firme: 1, observado: 2,
};

/**
 * Estado de un aprendizaje: confirmado por el tutor, firme (visto varias
 * veces o por varios cuidadores) u observado.
 * @param {AprendizajeAcumulado} a Aprendizaje acumulado.
 * @param {Confirmacion | undefined} confirmacion Decisión del tutor.
 * @param {number} vecesParaFirme Veces para considerarlo firme.
 * @return {EstadoAprendizaje} Estado.
 */
export function estadoDeAprendizaje(
  a: AprendizajeAcumulado,
  confirmacion: Confirmacion | undefined,
  vecesParaFirme: number
): EstadoAprendizaje {
  if (confirmacion === 'confirmado') return 'confirmado';
  if (a.veces >= vecesParaFirme || a.cuidadores.length >= 2) return 'firme';
  return 'observado';
}

/**
 * Arma el resumen que lee el cuidador antes del paseo (y la ficha del tutor).
 * Descarta lo rechazado, lo que no alcanza su mínimo y lo que no se ve desde
 * hace más de la vigencia. Orden: confirmado, firme, observado; luego más
 * veces y más reciente.
 * @param {EstadoDeAprendizajes} estado Aprendizajes acumulados.
 * @param {Record<string, Confirmacion>} confirmaciones Decisiones del tutor.
 * @param {Alerta[]} alertas Alertas registradas.
 * @param {OpcionesResumen} opciones Parámetros (vienen de la configuración).
 * @return {ResumenDeMascota} Resumen.
 */
export function construirResumen(
  estado: EstadoDeAprendizajes,
  confirmaciones: Record<string, Confirmacion>,
  alertas: Alerta[],
  opciones: OpcionesResumen
): ResumenDeMascota {
  const limiteVigencia = opciones.ahora_ms - opciones.dias_vigencia * DIA_MS;
  const items = Object.values(estado)
    .filter((a) => confirmaciones[a.clave] !== 'rechazado')
    .filter((a) => a.veces >= a.veces_minimas &&
      a.paseos.length >= a.paseos_minimos)
    .filter((a) => a.ultima_ms >= limiteVigencia)
    .map((a) => ({
      clave: a.clave,
      texto: a.texto,
      tipo: a.tipo,
      dominio: a.dominio,
      estado: estadoDeAprendizaje(a, confirmaciones[a.clave], opciones.veces_para_firme),
      sensible: a.sensible,
      veces: a.veces,
      ultima_ms: a.ultima_ms,
    }));

  const ordenar = (lista: ItemConFecha[]) =>
    [...lista].sort((x, y) =>
      ORDEN_ESTADO[x.estado] - ORDEN_ESTADO[y.estado] ||
      y.veces - x.veces || y.ultima_ms - x.ultima_ms);
  const seccion = (tipos: TipoAprendizaje[]) =>
    ordenar(items.filter((i) => tipos.includes(i.tipo)))
      .slice(0, opciones.max_por_seccion)
      .map(aItem);

  const limiteAlerta = opciones.ahora_ms - DIAS_DE_UNA_ALERTA * DIA_MS;
  return {
    que_funciona: seccion(['le_gusta', 'como_manejarlo']),
    que_evitar: seccion(['lo_estresa']),
    ten_en_cuenta: seccion(['dato_util']),
    por_confirmar: items
      .filter((i) => i.sensible && confirmaciones[i.clave] === undefined)
      .map(aItem),
    alertas: alertas
      .filter((a) => a.fecha_ms >= limiteAlerta)
      .sort((x, y) => y.fecha_ms - x.fecha_ms),
  };
}

// ---------- Ficha declarada por el tutor ----------

/** Lo mínimo de la ficha de la mascota que usa el resumen. */
export interface FichaDeMascota {
  especie?: string
  tamano?: string
  nivel_energia?: string
  edad_anios?: number
  alergias?: string[]
  medicamentos?: string[]
  condiciones_salud?: string[]
}

/**
 * Edad en años cumplidos.
 * @param {number | undefined} nacimientoMs Fecha de nacimiento (ms).
 * @param {number} ahoraMs Momento actual (ms).
 * @return {number | undefined} Años, o undefined si no hay fecha válida.
 */
export function edadEnAnios(
  nacimientoMs: number | undefined,
  ahoraMs: number
): number | undefined {
  if (typeof nacimientoMs !== 'number' || nacimientoMs > ahoraMs) return undefined;
  return Math.floor((ahoraMs - nacimientoMs) / (365.25 * DIA_MS));
}

/**
 * Frase corta de quién es la mascota, con lo que declaró el tutor.
 * @param {FichaDeMascota} ficha Ficha de la mascota.
 * @return {string} Frase ("Perro mediano de 4 años, energía alta").
 */
export function quienEs(ficha: FichaDeMascota): string {
  const especie = ficha.especie ? ficha.especie.toLowerCase() : 'mascota';
  const nombreEspecie = especie.charAt(0).toUpperCase() + especie.slice(1);
  const partes = [ficha.tamano ? `${nombreEspecie} ${ficha.tamano}` : nombreEspecie];
  if (ficha.edad_anios !== undefined) {
    partes[0] += ` de ${ficha.edad_anios} ${ficha.edad_anios === 1 ? 'año' : 'años'}`;
  }
  if (ficha.nivel_energia) {
    partes.push(`energía ${ficha.nivel_energia.replace(/o$/, 'a')}`);
  }
  return partes.join(', ');
}

/**
 * Datos de salud declarados que el cuidador debe tener presentes.
 * @param {FichaDeMascota} ficha Ficha de la mascota.
 * @return {string[]} Frases cortas (vacío si no declaró nada).
 */
export function saludDeclarada(ficha: FichaDeMascota): string[] {
  const frases: string[] = [];
  if (ficha.alergias?.length) frases.push(`Alergias: ${ficha.alergias.join(', ')}`);
  if (ficha.medicamentos?.length) {
    frases.push(`Medicamentos: ${ficha.medicamentos.join(', ')}`);
  }
  if (ficha.condiciones_salud?.length) {
    frases.push(`Condiciones de salud: ${ficha.condiciones_salud.join(', ')}`);
  }
  return frases;
}
