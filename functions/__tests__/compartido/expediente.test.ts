/**
 * Conocer a la mascota: catálogo de momentos, derivación de aprendizajes,
 * resumen y configuración (compartido/expediente.ts).
 */
import {
  CATALOGO_CONFIGURACION,
  validarCambios,
  valoresPorDefecto,
} from '../../src/compartido/configuracion'
import {
  acumularMomento,
  alertasDeLlegada,
  alertasDeMomento,
  CAUSAS_DEL_NERVIOSISMO,
  construirResumen,
  DETALLES_DEL_CONFLICTO,
  DIAS_DE_UNA_ALERTA,
  DOMINIOS,
  edadEnAnios,
  estadoDeAprendizaje,
  FORMAS_DE_CALMARLO,
  GRUPOS_MOMENTO,
  momentoPorClave,
  momentosDelGrupo,
  MOMENTOS,
  quienEs,
  saludDeclarada,
  senalesDeMomento,
  validarMomento,
  type EstadoDeAprendizajes,
  type MomentoRegistrado,
  type OpcionesResumen,
} from '../../src/compartido/expediente'

const DIA = 24 * 3600000
const AHORA = 1_700_000_000_000

const momento = (
  clave: string,
  extra: Partial<MomentoRegistrado> = {}
): MomentoRegistrado => ({
  clave,
  cuidador_id: 'c1',
  paseo_id: 'p1',
  fecha_ms: AHORA,
  ...extra,
})

const OPCIONES: OpcionesResumen = {
  ahora_ms: AHORA,
  dias_vigencia: 360,
  veces_para_firme: 2,
  max_por_seccion: 3,
}

/** Acumula varios momentos en orden (cada uno puede ser de otro paseo). */
const acumular = (...momentos: MomentoRegistrado[]): EstadoDeAprendizajes =>
  momentos.reduce<EstadoDeAprendizajes>((estado, m) => acumularMomento(estado, m), {})

describe('catálogo de momentos', () => {
  test('claves únicas, descriptivas y coherentes con su grupo', () => {
    const claves = MOMENTOS.map(d => d.clave)
    expect(new Set(claves).size).toBe(claves.length)
    for (const d of MOMENTOS) {
      expect(d.clave).toMatch(/^[a-z_]+\.[a-z_]+$/)
      expect(d.clave.split('.')[0]).toBe(d.grupo)
      expect(GRUPOS_MOMENTO).toContain(d.grupo)
      expect(DOMINIOS).toContain(d.dominio)
      expect(d.etiqueta.length).toBeGreaterThan(2)
    }
  })

  test('los cuatro grupos tienen momentos y solo emergencia lleva severidad', () => {
    for (const grupo of GRUPOS_MOMENTO) {
      expect(momentosDelGrupo(grupo).length).toBeGreaterThan(0)
    }
    for (const d of MOMENTOS) {
      expect(d.gravedad !== undefined).toBe(d.grupo === 'emergencia')
    }
    expect(momentoPorClave('emergencia.emergencia')?.gravedad).toBe('critica')
  })

  test('Emergencia agrupa emergencia, lesión, conflicto y contacto al tutor', () => {
    expect(momentosDelGrupo('emergencia').map(d => d.clave).sort()).toEqual([
      'emergencia.conflicto_con_otro_perro',
      'emergencia.contacte_al_tutor',
      'emergencia.emergencia',
      'emergencia.lesion',
    ])
  })

  test('se retiran los recuerdos de foto/video/voz y "hizo necesidades"', () => {
    const claves = MOMENTOS.map(d => d.clave).join(' ')
    expect(claves).not.toMatch(/recuerdo|foto|video|voz|necesidades_|hizo/)
  })

  test('cada opción de seguimiento tiene clave descriptiva', () => {
    for (const o of [
      ...CAUSAS_DEL_NERVIOSISMO, ...FORMAS_DE_CALMARLO, ...DETALLES_DEL_CONFLICTO,
    ]) {
      expect(o.clave).toMatch(/^[a-z_]+$/)
      expect(o.etiqueta.length).toBeGreaterThan(2)
    }
  })
})

describe('validarMomento', () => {
  test('acepta momentos válidos con sus seguimientos', () => {
    expect(validarMomento(momento('como_esta.jugo'))).toEqual([])
    expect(validarMomento(momento('como_esta.se_puso_nervioso', {
      causa: 'motos_o_carros', calmo_con: 'dejandolo_oler',
      lugar: 'lugar_y_ambiente.lugar_parque',
    }))).toEqual([])
    expect(validarMomento(momento('emergencia.conflicto_con_otro_perro', {
      detalle_del_conflicto: 'ladro_o_gruno',
    }))).toEqual([])
  })

  test.each([
    ['clave inexistente', momento('como_esta.inventado')],
    ['causa desconocida', momento('como_esta.se_puso_nervioso', { causa: 'x' })],
    ['calma desconocida', momento('como_esta.se_puso_nervioso', { calmo_con: 'x' })],
    ['causa en un momento que no la admite', momento('como_esta.jugo', { causa: 'motos_o_carros' })],
    ['detalle fuera de un conflicto', momento('como_esta.jugo', { detalle_del_conflicto: 'ladro_o_gruno' })],
    ['lugar que no es un lugar', momento('como_esta.jugo', { lugar: 'como_esta.corrio' })],
    ['clima como lugar', momento('como_esta.jugo', { lugar: 'lugar_y_ambiente.clima_lluvia' })],
  ])('rechaza: %s', (_nombre, dato) => {
    expect(validarMomento(dato).length).toBeGreaterThan(0)
  })

  test('rechaza datos vacíos', () => {
    expect(validarMomento(undefined).length).toBeGreaterThan(0)
  })
})

describe('de momentos a aprendizajes', () => {
  test('nervioso con causa: aprendizaje que dice qué es y con qué', () => {
    const [s] = senalesDeMomento(momento('como_esta.se_puso_nervioso', {
      causa: 'motos_o_carros',
    }))
    expect(s).toMatchObject({
      clave: 'se_pone_nervioso_con_motos_o_carros',
      tipo: 'lo_estresa',
      dominio: 'estado_mental',
      texto: 'Se pone nervioso con motos o carros',
      veces_minimas: 1,
      sensible: false,
    })
  })

  test('nervioso con calma: además enseña cómo manejarlo', () => {
    const senales = senalesDeMomento(momento('como_esta.se_puso_nervioso', {
      causa: 'perro_grande', calmo_con: 'con_voz_suave',
    }))
    expect(senales.map(s => s.clave)).toEqual([
      'se_pone_nervioso_con_perro_grande', 'se_calma_con_voz_suave',
    ])
    expect(senales[1]).toMatchObject({
      tipo: 'como_manejarlo', texto: 'Se calma si le hablas con voz suave',
    })
  })

  test('"aún nada" no enseña cómo calmarlo; sin causa pide verlo 2 veces', () => {
    const senales = senalesDeMomento(momento('como_esta.se_puso_nervioso', {
      calmo_con: 'aun_nada',
    }))
    expect(senales).toHaveLength(1)
    expect(senales[0]).toMatchObject({
      clave: 'se_pone_nervioso_sin_causa_conocida', veces_minimas: 2,
    })
    // "otra causa" tampoco inventa una causa
    expect(senalesDeMomento(momento('como_esta.se_puso_nervioso', {
      causa: 'otra_causa',
    }))[0].clave).toBe('se_pone_nervioso_sin_causa_conocida')
  })

  test('conflicto con otro perro es sensible', () => {
    expect(senalesDeMomento(momento('emergencia.conflicto_con_otro_perro'))[0])
      .toMatchObject({ clave: 'tuvo_un_conflicto_con_otro_perro', sensible: true })
  })

  test('comer del suelo es sensible; pedir agua exige 4 veces en 2 paseos', () => {
    expect(senalesDeMomento(momento('necesidades.comio_algo_del_suelo'))[0].sensible)
      .toBe(true)
    expect(senalesDeMomento(momento('necesidades.tomo_agua'))[0]).toMatchObject({
      clave: 'pide_agua_seguido', veces_minimas: 4, paseos_minimos: 2,
    })
  })

  test('jugar solo enseña dónde disfruta si se sabe el lugar', () => {
    expect(senalesDeMomento(momento('como_esta.jugo'))).toEqual([])
    expect(senalesDeMomento(momento('como_esta.jugo', {
      lugar: 'lugar_y_ambiente.lugar_zona_residencial',
    }))).toEqual([])
    expect(senalesDeMomento(momento('como_esta.jugo', {
      lugar: 'lugar_y_ambiente.lugar_zona_de_perros',
    }))[0]).toMatchObject({
      clave: 'disfruta_jugar_en_zona_de_perros',
      texto: 'Disfruta jugar en la zona de perros',
      veces_minimas: 2,
    })
  })

  test.each([
    ['como_esta.exploro_y_olfateo', 'disfruta_olfatear_y_explorar'],
    ['como_esta.corrio', 'disfruta_correr'],
    ['como_esta.saludo_a_otros_perros', 'disfruta_saludar_a_otros_perros'],
    ['como_esta.saludo_a_personas', 'disfruta_saludar_a_personas'],
    ['como_esta.se_ve_contento', 'suele_verse_contento_durante_el_paseo'],
  ])('%s → %s (se muestra a la tercera vez)', (clave, aprendizaje) => {
    const [s] = senalesDeMomento(momento(clave))
    expect(s.clave).toBe(aprendizaje)
    expect(s.veces_minimas).toBe(3)
  })

  test('lugares, clima y descanso no enseñan nada por sí solos', () => {
    for (const clave of [
      'lugar_y_ambiente.lugar_parque', 'lugar_y_ambiente.clima_lluvia',
      'lugar_y_ambiente.clima_calor_fuerte', 'como_esta.descanso',
      'emergencia.lesion', 'emergencia.emergencia', 'emergencia.contacte_al_tutor',
    ]) {
      expect(senalesDeMomento(momento(clave))).toEqual([])
    }
  })

  test('toda clave derivada es descriptiva y de dominio válido', () => {
    const casos: MomentoRegistrado[] = [
      momento('como_esta.se_puso_nervioso', { causa: 'ruido_fuerte', calmo_con: 'caminando_despacio' }),
      momento('como_esta.jugo', { lugar: 'lugar_y_ambiente.lugar_rio_o_lago' }),
      momento('emergencia.conflicto_con_otro_perro'),
      momento('necesidades.tomo_agua'),
    ]
    for (const c of casos) {
      for (const s of senalesDeMomento(c)) {
        expect(s.clave).toMatch(/^[a-z_]{8,}$/)
        expect(DOMINIOS).toContain(s.dominio)
        expect(s.texto.length).toBeGreaterThan(5)
      }
    }
  })
})

describe('alertas', () => {
  test('lesión y emergencia dejan alerta de salud; el resto no', () => {
    expect(alertasDeMomento(momento('emergencia.lesion'))[0])
      .toMatchObject({ clave: 'tuvo_una_lesion_reciente', dominio: 'salud' })
    expect(alertasDeMomento(momento('emergencia.emergencia'))[0].clave)
      .toBe('tuvo_una_emergencia_reciente')
    expect(alertasDeMomento(momento('como_esta.jugo'))).toEqual([])
  })

  test('llegar con molestia deja alerta; llegar bien no', () => {
    expect(alertasDeLlegada('con_molestia', AHORA, 'p1')[0])
      .toMatchObject({ clave: 'llego_con_molestia_en_el_ultimo_paseo', paseo_id: 'p1' })
    for (const bien of ['tranquilo', 'cansado_bien', 'agitado']) {
      expect(alertasDeLlegada(bien, AHORA, 'p1')).toEqual([])
    }
  })
})

describe('acumularMomento', () => {
  test('cuenta veces, cuidadores y paseos distintos sin modificar el original', () => {
    const base = acumular(momento('como_esta.se_puso_nervioso', { causa: 'motos_o_carros' }))
    const copia = JSON.stringify(base)
    const nuevo = acumularMomento(base, momento('como_esta.se_puso_nervioso', {
      causa: 'motos_o_carros', cuidador_id: 'c2', paseo_id: 'p2', fecha_ms: AHORA + 1000,
    }))

    expect(JSON.stringify(base)).toBe(copia)
    expect(nuevo.se_pone_nervioso_con_motos_o_carros).toMatchObject({
      veces: 2, cuidadores: ['c1', 'c2'], paseos: ['p1', 'p2'], ultima_ms: AHORA + 1000,
    })
  })

  test('el mismo cuidador y paseo no se duplican; la última fecha no retrocede', () => {
    const e = acumular(
      momento('como_esta.exploro_y_olfateo', { fecha_ms: AHORA }),
      momento('como_esta.exploro_y_olfateo', { fecha_ms: AHORA - DIA })
    )
    expect(e.disfruta_olfatear_y_explorar).toMatchObject({
      veces: 2, cuidadores: ['c1'], paseos: ['p1'], ultima_ms: AHORA,
    })
  })

  test('un momento sin enseñanza no cambia el estado', () => {
    expect(acumular(momento('como_esta.descanso'))).toEqual({})
  })
})

describe('estado de un aprendizaje', () => {
  const visto = (extra: Record<string, unknown>) => ({
    ...senalesDeMomento(momento('como_esta.se_puso_nervioso', { causa: 'ruido_fuerte' }))[0],
    veces: 1, cuidadores: ['c1'], paseos: ['p1'], ultima_ms: AHORA, ...extra,
  }) as any

  test('observado con una sola vez de un cuidador', () => {
    expect(estadoDeAprendizaje(visto({}), undefined, 2)).toBe('observado')
  })

  test('firme con las veces configuradas o con dos cuidadores distintos', () => {
    expect(estadoDeAprendizaje(visto({ veces: 2 }), undefined, 2)).toBe('firme')
    expect(estadoDeAprendizaje(visto({ cuidadores: ['c1', 'c2'] }), undefined, 5)).toBe('firme')
    expect(estadoDeAprendizaje(visto({ veces: 2 }), undefined, 3)).toBe('observado')
  })

  test('confirmado por el tutor gana a lo demás', () => {
    expect(estadoDeAprendizaje(visto({}), 'confirmado', 2)).toBe('confirmado')
  })
})

describe('construirResumen', () => {
  const resumen = (
    estado: EstadoDeAprendizajes,
    confirmaciones: Record<string, 'confirmado' | 'rechazado'> = {},
    alertas: ReturnType<typeof alertasDeMomento> = [],
    opciones: Partial<OpcionesResumen> = {}
  ) => construirResumen(estado, confirmaciones, alertas, { ...OPCIONES, ...opciones })

  test('clasifica en qué funciona, qué evitar y ten en cuenta', () => {
    const estado = acumular(
      momento('como_esta.se_puso_nervioso', { causa: 'motos_o_carros', calmo_con: 'dejandolo_oler' }),
      momento('necesidades.comio_algo_del_suelo')
    )
    const r = resumen(estado)
    expect(r.que_evitar.map(i => i.clave)).toEqual(['se_pone_nervioso_con_motos_o_carros'])
    expect(r.que_funciona.map(i => i.clave)).toEqual(['se_calma_dejandolo_oler'])
    expect(r.ten_en_cuenta.map(i => i.clave)).toEqual(['come_cosas_del_suelo'])
  })

  test('no muestra lo que no alcanza su mínimo y sí cuando lo alcanza', () => {
    const una = acumular(momento('como_esta.saludo_a_otros_perros'))
    expect(resumen(una).que_funciona).toEqual([])
    const tres = acumular(
      momento('como_esta.saludo_a_otros_perros', { paseo_id: 'p1' }),
      momento('como_esta.saludo_a_otros_perros', { paseo_id: 'p2' }),
      momento('como_esta.saludo_a_otros_perros', { paseo_id: 'p3' })
    )
    expect(resumen(tres).que_funciona[0]).toMatchObject({
      clave: 'disfruta_saludar_a_otros_perros', estado: 'firme', veces: 3,
    })
  })

  test('pedir agua exige también 2 paseos distintos', () => {
    const mismoPaseo = acumular(...Array.from({ length: 4 }, () => momento('necesidades.tomo_agua')))
    expect(resumen(mismoPaseo).ten_en_cuenta).toEqual([])
    const dosPaseos = acumular(
      ...Array.from({ length: 2 }, () => momento('necesidades.tomo_agua', { paseo_id: 'p1' })),
      ...Array.from({ length: 2 }, () => momento('necesidades.tomo_agua', { paseo_id: 'p2' }))
    )
    expect(resumen(dosPaseos).ten_en_cuenta[0].clave).toBe('pide_agua_seguido')
  })

  test('lo rechazado por el tutor no se muestra', () => {
    const estado = acumular(momento('emergencia.conflicto_con_otro_perro'))
    const r = resumen(estado, { tuvo_un_conflicto_con_otro_perro: 'rechazado' })
    expect(r.que_evitar).toEqual([])
    expect(r.por_confirmar).toEqual([])
  })

  test('lo sensible sin decisión queda por confirmar y se muestra como observado', () => {
    const estado = acumular(momento('emergencia.conflicto_con_otro_perro'))
    const r = resumen(estado)
    expect(r.por_confirmar.map(i => i.clave)).toEqual(['tuvo_un_conflicto_con_otro_perro'])
    expect(r.que_evitar[0].estado).toBe('observado')
  })

  test('lo confirmado se muestra confirmado y deja de estar por confirmar', () => {
    const estado = acumular(momento('emergencia.conflicto_con_otro_perro'))
    const r = resumen(estado, { tuvo_un_conflicto_con_otro_perro: 'confirmado' })
    expect(r.que_evitar[0].estado).toBe('confirmado')
    expect(r.por_confirmar).toEqual([])
  })

  test('lo no sensible nunca se pide confirmar', () => {
    const estado = acumular(momento('como_esta.se_puso_nervioso', { causa: 'ruido_fuerte' }))
    expect(resumen(estado).por_confirmar).toEqual([])
  })

  test('lo que no se ve en la vigencia sale del resumen (sin borrarse)', () => {
    const viejo = acumular(
      momento('como_esta.se_puso_nervioso', { causa: 'ruido_fuerte', fecha_ms: AHORA - 361 * DIA })
    )
    expect(resumen(viejo).que_evitar).toEqual([])
    expect(Object.keys(viejo)).toHaveLength(1)
    expect(resumen(viejo, {}, [], { dias_vigencia: 400 }).que_evitar).toHaveLength(1)
  })

  test('ordena confirmado, firme y observado; luego por veces y recencia', () => {
    const estado = acumular(
      momento('como_esta.se_puso_nervioso', { causa: 'ruido_fuerte' }),
      momento('como_esta.se_puso_nervioso', { causa: 'perro_grande' }),
      momento('como_esta.se_puso_nervioso', { causa: 'perro_grande', paseo_id: 'p2' }),
      momento('como_esta.se_puso_nervioso', { causa: 'motos_o_carros' })
    )
    const r = resumen(estado, { se_pone_nervioso_con_motos_o_carros: 'confirmado' })
    expect(r.que_evitar.map(i => [i.clave, i.estado])).toEqual([
      ['se_pone_nervioso_con_motos_o_carros', 'confirmado'],
      ['se_pone_nervioso_con_perro_grande', 'firme'],
      ['se_pone_nervioso_con_ruido_fuerte', 'observado'],
    ])
  })

  test('respeta la cantidad máxima por sección', () => {
    const estado = acumular(
      ...CAUSAS_DEL_NERVIOSISMO.filter(c => c.clave !== 'otra_causa').map(c =>
        momento('como_esta.se_puso_nervioso', { causa: c.clave }))
    )
    expect(resumen(estado, {}, [], { max_por_seccion: 2 }).que_evitar).toHaveLength(2)
    expect(resumen(estado).que_evitar).toHaveLength(3)
  })

  test('las alertas caducan a los 30 días y salen de la más reciente', () => {
    const alertas = [
      ...alertasDeMomento(momento('emergencia.lesion', { fecha_ms: AHORA - 40 * DIA })),
      ...alertasDeMomento(momento('emergencia.lesion', { fecha_ms: AHORA - 10 * DIA })),
      ...alertasDeLlegada('con_molestia', AHORA - 2 * DIA, 'p9'),
    ]
    const r = resumen({}, {}, alertas)
    expect(DIAS_DE_UNA_ALERTA).toBe(30)
    expect(r.alertas.map(a => a.clave)).toEqual([
      'llego_con_molestia_en_el_ultimo_paseo', 'tuvo_una_lesion_reciente',
    ])
  })

  test('sin datos devuelve un resumen vacío', () => {
    expect(resumen({})).toEqual({
      que_funciona: [], que_evitar: [], ten_en_cuenta: [], por_confirmar: [], alertas: [],
    })
  })
})

describe('ficha declarada por el tutor', () => {
  test('edadEnAnios', () => {
    expect(edadEnAnios(AHORA - 4.5 * 365.25 * DIA, AHORA)).toBe(4)
    expect(edadEnAnios(undefined, AHORA)).toBeUndefined()
    expect(edadEnAnios(AHORA + DIA, AHORA)).toBeUndefined()
  })

  test('quienEs con lo que haya declarado', () => {
    expect(quienEs({ especie: 'perro', tamano: 'mediano', edad_anios: 4, nivel_energia: 'alto' }))
      .toBe('Perro mediano de 4 años, energía alta')
    expect(quienEs({ especie: 'gato', edad_anios: 1 })).toBe('Gato de 1 año')
    expect(quienEs({})).toBe('Mascota')
  })

  test('saludDeclarada lista alergias, medicamentos y condiciones', () => {
    expect(saludDeclarada({
      alergias: ['pollo'], medicamentos: ['antiinflamatorio'], condiciones_salud: ['displasia'],
    })).toEqual([
      'Alergias: pollo', 'Medicamentos: antiinflamatorio', 'Condiciones de salud: displasia',
    ])
    expect(saludDeclarada({})).toEqual([])
  })
})

describe('configuración del expediente (claves cortas y descriptivas)', () => {
  const def = CATALOGO_CONFIGURACION.expediente

  test('cada clave dice qué es y trae título y descripción', () => {
    for (const [clave, valor] of Object.entries(def.valores)) {
      expect(clave.split('_').length).toBeGreaterThanOrEqual(2)
      expect(clave.length).toBeLessThanOrEqual(25)
      expect((valor as any).titulo.length).toBeGreaterThan(10)
      expect((valor as any).descripcion.length).toBeGreaterThan(30)
    }
  })

  test('valores por defecto acordados', () => {
    expect(valoresPorDefecto('expediente')).toEqual({
      dias_vigencia_aprendizaje: 360,
      repeticiones_para_firme: 2,
      aprendizajes_en_resumen: 3,
      priorizar_conocidos: true,
    })
  })

  test('la app puede leerla y se valida el rango', () => {
    expect(def.lectura).toBe('publica')
    expect(validarCambios('expediente', { dias_vigencia_aprendizaje: 180 })).toEqual([])
    expect(validarCambios('expediente', { dias_vigencia_aprendizaje: 0 }).length).toBe(1)
    expect(validarCambios('expediente', { priorizar_conocidos: 'si' }).length)
      .toBe(1)
    expect(validarCambios('expediente', { clave_inventada: 1 }).length).toBe(1)
  })
})
