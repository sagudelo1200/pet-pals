/**
 * Expediente de la mascota (lado servidor): momentos, vínculos, llegada,
 * confirmaciones y ficha.
 */
import * as mockFirestore from '../helpers/mockFirestore'

const mockDb = mockFirestore.crearMockDb()

jest.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
  initializeApp: jest.fn(),
}))
jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }))
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
  Timestamp: mockFirestore.MOCK_TIMESTAMP,
  FieldValue: mockFirestore.MOCK_FIELD_VALUE,
}))

import {
  actualizarPorEstadoDePaseo,
  borrarExpediente,
  confirmarAprendizaje,
  datosDeFicha,
  procesarMomentoDeEvento,
  registrarLlegada,
  sincronizarFicha,
} from '../../src/expediente/expediente'
import { limpiarCacheConfiguracion } from '../../src/comun/configuracion'

const DIA = 24 * 3600000
const T = (ms: number) => mockFirestore.MOCK_TIMESTAMP.fromMillis(ms)
const AHORA = T(1_700_000_000_000)

const PASEO = {
  tipo: 'paseo',
  estado: 'EN_PROGRESO',
  creado_por: 't1',
  id_cuidador: 'c1',
  mascota_ids: ['m1'],
}

const exp = (id = 'm1') => mockDb.__docs.get(`expedientes/${id}`)
const interno = (id = 'm1') => mockDb.__docs.get(`expedientes/${id}/interno/estado`)
const evento = (paseo = 'p1', id = 'e1') =>
  mockDb.__docs.get(`operaciones/${paseo}/eventos/${id}`)

function sembrarEvento(
  payload: Record<string, unknown>,
  extra: Record<string, unknown> = {},
  paseo = 'p1',
  id = 'e1'
) {
  mockDb.__seed(`operaciones/${paseo}/eventos/${id}`, {
    evento: 'bitacora',
    actor: 'c1',
    payload: { timestamp: AHORA.toMillis(), ...payload },
    ...extra,
  })
}

beforeEach(() => {
  mockDb.__reset()
  limpiarCacheConfiguracion()
  jest.spyOn(console, 'warn').mockImplementation(() => undefined)
  mockDb.__seed('operaciones/p1', { ...PASEO })
  mockDb.__seed('mascotas/m1', {
    creado_por: 't1',
    ids_tutores: ['t2'],
    especie: 'perro',
    tamano: 'mediano',
    nivel_energia: 'alto',
    fecha_nacimiento: T(AHORA.toMillis() - 4.5 * 365.25 * DIA),
    alergias: ['pollo'],
  })
})

describe('datosDeFicha', () => {
  test('tutores sin repetir, quién es y salud declarada', () => {
    const d = datosDeFicha(
      { creado_por: 't1', ids_tutores: ['t2', 't1'], especie: 'perro', tamano: 'mediano',
        nivel_energia: 'alto', fecha_nacimiento: T(AHORA.toMillis() - 4.5 * 365.25 * DIA),
        medicamentos: ['antiinflamatorio'] },
      AHORA.toMillis()
    )
    expect(d.tutores).toEqual(['t1', 't2'])
    expect(d.quien_es).toBe('Perro mediano de 4 años, energía alta')
    expect(d.salud_declarada).toEqual(['Medicamentos: antiinflamatorio'])
  })

  test('con una ficha casi vacía no falla', () => {
    expect(datosDeFicha({}, AHORA.toMillis())).toEqual({
      tutores: [], quien_es: 'Mascota', salud_declarada: [],
    })
  })
})

describe('procesarMomentoDeEvento', () => {
  test('el primer momento crea el expediente y arma el resumen', async () => {
    sembrarEvento({
      clave: 'como_esta.se_puso_nervioso', causa: 'motos_o_carros',
      calmo_con: 'dejandolo_oler', mascota_ids: ['m1'],
    })

    expect(await procesarMomentoDeEvento(mockDb, 'p1', 'e1', AHORA)).toEqual(['m1'])

    expect(exp()).toMatchObject({
      mascota_id: 'm1',
      tutores: ['t1', 't2'],
      cuidadores_autorizados: [],
      quien_es: 'Perro mediano de 4 años, energía alta',
      salud_declarada: ['Alergias: pollo'],
    })
    expect(exp().resumen.que_evitar.map((i: any) => i.clave)).toEqual([
      'se_pone_nervioso_con_motos_o_carros',
    ])
    expect(exp().resumen.que_funciona.map((i: any) => i.clave)).toEqual([
      'se_calma_dejandolo_oler',
    ])
    expect(interno().senales.se_pone_nervioso_con_motos_o_carros).toMatchObject({
      veces: 1, cuidadores: ['c1'], paseos: ['p1'],
    })
    expect(evento().expediente_procesado_en).toBeDefined()
  })

  test('es idempotente: el mismo evento no cuenta dos veces', async () => {
    sembrarEvento({ clave: 'como_esta.se_puso_nervioso', causa: 'ruido_fuerte' })
    await procesarMomentoDeEvento(mockDb, 'p1', 'e1', AHORA)
    expect(await procesarMomentoDeEvento(mockDb, 'p1', 'e1', AHORA)).toEqual([])
    expect(interno().senales.se_pone_nervioso_con_ruido_fuerte.veces).toBe(1)
  })

  test('sin mascota_ids aplica a todas las del paseo; con ids, solo a esas', async () => {
    mockDb.__seed('operaciones/p1', { ...PASEO, mascota_ids: ['m1', 'm2'] })
    mockDb.__seed('mascotas/m2', { creado_por: 't1', especie: 'perro' })
    sembrarEvento({ clave: 'como_esta.se_puso_nervioso', causa: 'perro_grande' }, {}, 'p1', 'e1')
    sembrarEvento(
      { clave: 'como_esta.se_puso_nervioso', causa: 'ruido_fuerte', mascota_ids: ['m2'] },
      {}, 'p1', 'e2'
    )

    expect((await procesarMomentoDeEvento(mockDb, 'p1', 'e1', AHORA)).sort()).toEqual(['m1', 'm2'])
    expect(await procesarMomentoDeEvento(mockDb, 'p1', 'e2', AHORA)).toEqual(['m2'])
    expect(Object.keys(interno('m1').senales)).toEqual(['se_pone_nervioso_con_perro_grande'])
    expect(Object.keys(interno('m2').senales).sort()).toEqual([
      'se_pone_nervioso_con_perro_grande', 'se_pone_nervioso_con_ruido_fuerte',
    ])
  })

  test('lesión y emergencia dejan alerta; el conflicto queda por confirmar', async () => {
    sembrarEvento({ clave: 'emergencia.lesion', tipo: 'lesion' }, { evento: 'incidente' }, 'p1', 'e1')
    sembrarEvento({ clave: 'emergencia.conflicto_con_otro_perro' }, { evento: 'incidente' }, 'p1', 'e2')
    await procesarMomentoDeEvento(mockDb, 'p1', 'e1', AHORA)
    await procesarMomentoDeEvento(mockDb, 'p1', 'e2', AHORA)

    expect(exp().resumen.alertas.map((a: any) => a.clave)).toEqual(['tuvo_una_lesion_reciente'])
    expect(exp().resumen.por_confirmar.map((i: any) => i.clave)).toEqual([
      'tuvo_un_conflicto_con_otro_perro',
    ])
  })

  test('dos cuidadores distintos vuelven firme un aprendizaje', async () => {
    sembrarEvento({ clave: 'como_esta.se_puso_nervioso', causa: 'ruido_fuerte' })
    await procesarMomentoDeEvento(mockDb, 'p1', 'e1', AHORA)
    expect(exp().resumen.que_evitar[0].estado).toBe('observado')

    mockDb.__seed('operaciones/p2', { ...PASEO, id_cuidador: 'c2' })
    sembrarEvento({ clave: 'como_esta.se_puso_nervioso', causa: 'ruido_fuerte' },
      { actor: 'c2' }, 'p2', 'e1')
    await procesarMomentoDeEvento(mockDb, 'p2', 'e1', AHORA)

    expect(exp().resumen.que_evitar[0]).toMatchObject({ estado: 'firme', veces: 2 })
  })

  test('respeta la configuración del admin', async () => {
    mockDb.__seed('configuracion/expediente', { repeticiones_para_firme: 1 })
    sembrarEvento({ clave: 'como_esta.se_puso_nervioso', causa: 'ruido_fuerte' })
    await procesarMomentoDeEvento(mockDb, 'p1', 'e1', AHORA)
    expect(exp().resumen.que_evitar[0].estado).toBe('firme')
  })

  test.each([
    ['clave que no es del catálogo', { clave: 'como_esta.inventado' }, {}, {}],
    ['seguimiento inválido', { clave: 'como_esta.jugo', causa: 'motos_o_carros' }, {}, {}],
    ['evento de otro cuidador', { clave: 'como_esta.jugo' }, { actor: 'intruso' }, {}],
    ['evento que no es un momento', { clave: 'como_esta.jugo' }, { evento: 'llegada' }, {}],
    ['paseo aún pendiente', { clave: 'como_esta.jugo' }, {}, { estado: 'PENDIENTE' }],
    ['mascota que no es del paseo', { clave: 'como_esta.jugo', mascota_ids: ['ajena'] }, {}, {}],
  ])('ignora: %s', async (_nombre, payload, extraEvento, extraPaseo) => {
    mockDb.__seed('operaciones/p1', { ...PASEO, ...extraPaseo })
    sembrarEvento(payload, extraEvento)

    expect(await procesarMomentoDeEvento(mockDb, 'p1', 'e1', AHORA)).toEqual([])
    expect(exp()).toBeUndefined()
    expect(evento().expediente_procesado_en).toBeUndefined()
  })

  test('evento o paseo inexistentes no hacen nada', async () => {
    expect(await procesarMomentoDeEvento(mockDb, 'p1', 'nada', AHORA)).toEqual([])
    expect(await procesarMomentoDeEvento(mockDb, 'nada', 'e1', AHORA)).toEqual([])
  })

  test('el momento no cambia el expediente de una mascota que no existe', async () => {
    mockDb.__seed('operaciones/p1', { ...PASEO, mascota_ids: ['fantasma'] })
    sembrarEvento({ clave: 'como_esta.se_puso_nervioso', causa: 'ruido_fuerte' })
    await procesarMomentoDeEvento(mockDb, 'p1', 'e1', AHORA)
    expect(exp('fantasma')).toBeUndefined()
  })
})

describe('actualizarPorEstadoDePaseo', () => {
  test('al confirmarse, el cuidador queda autorizado una sola vez', async () => {
    expect(await actualizarPorEstadoDePaseo(mockDb, 'p1', 'CONFIRMADO', AHORA)).toEqual(['m1'])
    await actualizarPorEstadoDePaseo(mockDb, 'p1', 'CONFIRMADO', AHORA)
    expect(exp().cuidadores_autorizados).toEqual(['c1'])
  })

  test('al finalizar cuenta el vínculo una vez por paseo', async () => {
    await actualizarPorEstadoDePaseo(mockDb, 'p1', 'FINALIZADO', AHORA)
    await actualizarPorEstadoDePaseo(mockDb, 'p1', 'FINALIZADO', AHORA)
    expect(exp().vinculos.c1.paseos).toBe(1)

    mockDb.__seed('operaciones/p2', { ...PASEO })
    await actualizarPorEstadoDePaseo(mockDb, 'p2', 'FINALIZADO', T(AHORA.toMillis() + DIA))
    expect(exp().vinculos.c1).toEqual({ paseos: 2, ultimo_en: AHORA.toMillis() + DIA })
    expect(interno().paseos_contados).toEqual(['p1', 'p2'])
  })

  test('con varias mascotas actualiza a todas', async () => {
    mockDb.__seed('operaciones/p1', { ...PASEO, mascota_ids: ['m1', 'm2'] })
    mockDb.__seed('mascotas/m2', { creado_por: 't1', especie: 'perro' })
    await actualizarPorEstadoDePaseo(mockDb, 'p1', 'FINALIZADO', AHORA)
    expect(exp('m1').vinculos.c1.paseos).toBe(1)
    expect(exp('m2').vinculos.c1.paseos).toBe(1)
  })

  test('sin cuidador, otra operación o sin mascotas no hace nada', async () => {
    mockDb.__seed('operaciones/p1', { ...PASEO, id_cuidador: '' })
    expect(await actualizarPorEstadoDePaseo(mockDb, 'p1', 'CONFIRMADO', AHORA)).toEqual([])
    mockDb.__seed('operaciones/p1', { ...PASEO, tipo: 'otro' })
    expect(await actualizarPorEstadoDePaseo(mockDb, 'p1', 'CONFIRMADO', AHORA)).toEqual([])
    mockDb.__seed('operaciones/p1', { ...PASEO, mascota_ids: [] })
    expect(await actualizarPorEstadoDePaseo(mockDb, 'p1', 'CONFIRMADO', AHORA)).toEqual([])
    expect(exp()).toBeUndefined()
  })
})

describe('registrarLlegada', () => {
  const finalizado = () => mockDb.__seed('operaciones/p1', { ...PASEO, estado: 'FINALIZADO' })

  test('queda en el expediente y en el historial del paseo', async () => {
    finalizado()
    expect(await registrarLlegada(mockDb, 't1', { paseoId: 'p1', llegada: 'cansado_bien' }, AHORA))
      .toEqual(['m1'])

    expect(exp().ultimas_llegadas).toEqual([
      { llegada: 'cansado_bien', paseo_id: 'p1', fecha_ms: AHORA.toMillis() },
    ])
    expect(exp().resumen.alertas).toEqual([])
    expect(evento('p1', 'llegada')).toMatchObject({
      evento: 'llegada', actor: 't1', payload: { llegada: 'cansado_bien', mascota_ids: ['m1'] },
    })
  })

  test('llegar con molestia deja alerta; cambiar la respuesta la quita', async () => {
    finalizado()
    await registrarLlegada(mockDb, 't1', { paseoId: 'p1', llegada: 'con_molestia' }, AHORA)
    expect(exp().resumen.alertas.map((a: any) => a.clave)).toEqual([
      'llego_con_molestia_en_el_ultimo_paseo',
    ])

    await registrarLlegada(mockDb, 't1', { paseoId: 'p1', llegada: 'tranquilo' }, AHORA)
    expect(exp().resumen.alertas).toEqual([])
    // una sola llegada por paseo
    expect(exp().ultimas_llegadas).toHaveLength(1)
    expect(exp().ultimas_llegadas[0].llegada).toBe('tranquilo')
  })

  test('conserva solo las últimas 5 llegadas', async () => {
    for (let i = 1; i <= 7; i++) {
      mockDb.__seed(`operaciones/p${i}`, { ...PASEO, estado: 'COMPLETADO' })
      await registrarLlegada(mockDb, 't1', { paseoId: `p${i}`, llegada: 'tranquilo' },
        T(AHORA.toMillis() + i * 1000))
    }
    expect(exp().ultimas_llegadas.map((l: any) => l.paseo_id)).toEqual(['p3', 'p4', 'p5', 'p6', 'p7'])
  })

  test('puede indicarse solo una de las mascotas', async () => {
    mockDb.__seed('operaciones/p1', { ...PASEO, estado: 'FINALIZADO', mascota_ids: ['m1', 'm2'] })
    mockDb.__seed('mascotas/m2', { creado_por: 't1', especie: 'perro' })
    await registrarLlegada(mockDb, 't1', { paseoId: 'p1', llegada: 'agitado', mascotaIds: ['m2'] }, AHORA)
    expect(exp('m2').ultimas_llegadas).toHaveLength(1)
    expect(exp('m1')).toBeUndefined()
  })

  test.each([
    ['respuesta inválida', { paseoId: 'p1', llegada: 'feliz' }, 't1', 'invalid-argument'],
    ['quien no es el tutor del paseo', { paseoId: 'p1', llegada: 'tranquilo' }, 'otro', 'not-found'],
    ['paseo inexistente', { paseoId: 'nada', llegada: 'tranquilo' }, 't1', 'not-found'],
    ['mascota que no es del paseo', { paseoId: 'p1', llegada: 'tranquilo', mascotaIds: ['ajena'] }, 't1', 'invalid-argument'],
  ])('rechaza: %s', async (_nombre, datos, uid, codigo) => {
    finalizado()
    await expect(registrarLlegada(mockDb, uid, datos, AHORA)).rejects.toMatchObject({ codigo })
    expect(exp()).toBeUndefined()
  })

  test('rechaza si el paseo aún no termina', async () => {
    await expect(registrarLlegada(mockDb, 't1', { paseoId: 'p1', llegada: 'tranquilo' }, AHORA))
      .rejects.toMatchObject({ codigo: 'failed-precondition' })
  })
})

describe('confirmarAprendizaje', () => {
  async function conConflicto() {
    sembrarEvento({ clave: 'emergencia.conflicto_con_otro_perro' }, { evento: 'incidente' })
    await procesarMomentoDeEvento(mockDb, 'p1', 'e1', AHORA)
  }
  const clave = 'tuvo_un_conflicto_con_otro_perro'

  test('confirmar lo deja confirmado y ya no queda por confirmar', async () => {
    await conConflicto()
    await confirmarAprendizaje(mockDb, 't1', { mascotaId: 'm1', clave, decision: 'confirmado' }, AHORA)

    expect(interno().confirmaciones[clave]).toBe('confirmado')
    expect(exp().resumen.que_evitar[0].estado).toBe('confirmado')
    expect(exp().resumen.por_confirmar).toEqual([])
  })

  test('rechazar lo oculta del resumen; el otro tutor también puede decidir', async () => {
    await conConflicto()
    await confirmarAprendizaje(mockDb, 't2', { mascotaId: 'm1', clave, decision: 'rechazado' }, AHORA)

    expect(exp().resumen.que_evitar).toEqual([])
    expect(exp().resumen.por_confirmar).toEqual([])
  })

  test.each([
    ['decisión inválida', { clave, decision: 'quizas' }, 't1', 'invalid-argument'],
    ['quien no es tutor', { clave, decision: 'confirmado' }, 'intruso', 'not-found'],
    ['aprendizaje inexistente', { clave: 'no_existe', decision: 'confirmado' }, 't1', 'not-found'],
  ])('rechaza: %s', async (_nombre, datos, uid, codigo) => {
    await conConflicto()
    await expect(confirmarAprendizaje(mockDb, uid, { mascotaId: 'm1', ...datos }, AHORA))
      .rejects.toMatchObject({ codigo })
    expect(interno().confirmaciones).toEqual({})
  })

  test('mascota sin expediente ni ficha', async () => {
    await expect(confirmarAprendizaje(mockDb, 't1', { mascotaId: 'nada', clave, decision: 'confirmado' }, AHORA))
      .rejects.toMatchObject({ codigo: 'not-found' })
  })
})

describe('ficha y supresión', () => {
  test('editar la ficha actualiza el expediente existente, sin crear uno', async () => {
    expect(await sincronizarFicha(mockDb, 'm1', { creado_por: 't1' }, AHORA)).toBe(false)
    expect(exp()).toBeUndefined()

    await actualizarPorEstadoDePaseo(mockDb, 'p1', 'CONFIRMADO', AHORA)
    expect(await sincronizarFicha(mockDb, 'm1', {
      creado_por: 't1', ids_tutores: ['t3'], especie: 'gato', alergias: ['atún'],
    }, AHORA)).toBe(true)
    expect(exp()).toMatchObject({
      tutores: ['t1', 't3'], quien_es: 'Gato', salud_declarada: ['Alergias: atún'],
      cuidadores_autorizados: ['c1'],
    })
  })

  test('borrar la mascota borra su expediente y su estado interno', async () => {
    await actualizarPorEstadoDePaseo(mockDb, 'p1', 'CONFIRMADO', AHORA)
    expect(exp()).toBeDefined()
    await borrarExpediente(mockDb, 'm1')
    expect(exp()).toBeUndefined()
    expect(interno()).toBeUndefined()
  })
})
