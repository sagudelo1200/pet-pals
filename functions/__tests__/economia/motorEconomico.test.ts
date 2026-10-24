/**
 * Tests del motor económico (servidor): política, cobro por tutor al
 * finalizar, pago del tutor, cobranza/bloqueo y liquidación a cuidadores.
 */
import * as mockFirestore from '../helpers/mockFirestore'

jest.mock('firebase-admin/firestore', () => ({
  Timestamp: mockFirestore.MOCK_TIMESTAMP,
  FieldValue: mockFirestore.MOCK_FIELD_VALUE,
}))

import { calcularPrecioPaseo, desglosarCobro, horaColombia } from '../../src/economia/calculo'
import { validarPolitica } from '../../src/compartido/politicaComercial'
import { publicarVersion } from '../../src/comun/versionado'
import { sembrarVersion } from '../helpers/versionado'
import { fijarPoliticaDePaseo, generarCobrosDePaseo } from '../../src/economia/cobroPaseo'
import { iniciarPagoTutor, confirmarPagoTutor } from '../../src/economia/pagoTutor'
import { MockAdaptadorPago } from '../../src/economia/pagos'
import { MockAdaptadorContable } from '../../src/economia/contabilidad'
import { debeRecordar, revisarCobro, siguienteRevision } from '../../src/economia/cobranza'
import {
  generarLiquidaciones,
  proximoCorte,
  registrarPagoLiquidacion,
} from '../../src/economia/liquidacion'
import type { PoliticaComercial } from '../../src/economia/tipos'
import { pagarObligacion, cerrarSiCompleta } from '../../src/economia/motor'

const db = mockFirestore.crearMockDb()
const HORA = 60 * 60 * 1000
// Lunes 19-oct-2026 10:00 en Colombia (15:00 UTC)
const LUNES_10AM = Date.UTC(2026, 9, 19, 15)
const ts = (ms: number) => mockFirestore.MOCK_TIMESTAMP.fromMillis(ms) as any
const AHORA = ts(LUNES_10AM)

const DATOS_POLITICA = {
  por_tipo: {
    paseo: {
      precio: { base_por_hora: 18000, mascota_adicional: 5000 },
      comision: { porcentaje_plataforma: 10 },
    },
  },
  cobro: {
    plazo_pago_horas: 24,
    bloqueo_tras_horas: 72,
    max_recordatorios: 3,
    intervalo_recordatorios_horas: 24,
    horario_recordatorios: { desde: 8, hasta: 19 },
  },
  liquidacion: {
    frecuencia: 'SEMANAL' as const,
    dia_corte: 0,
    dia_pago: 2,
    monto_minimo: 20000,
    solo_recaudadas: true,
  },
  impuestos: {
    iva_comision: { aplica: true, porcentaje: 19, incluido_en_precio: true },
  },
  contabilidad: { documento_soporte_cuidador: true },
  entrega: {
    ventana_reclamo_horas: 48, cobrar_si_cierra_equipo: true,
    cierre_automatico_horas: 0, cierre_automatico_requiere_evidencia: true,
  },
}
const POLITICA: PoliticaComercial = { ...DATOS_POLITICA, version: 1 }
const TIPO_POLITICA = 'politica_comercial'
const publicar = (contenido: unknown, motivo = 'Cambio de tarifas') =>
  publicarVersion(db, TIPO_POLITICA, contenido, { motivo, autor: 'admin', ahora: AHORA })

const doc = (path: string) => db.__docs.get(path)
const docsDe = (coleccion: string) =>
  [...db.__docs.entries()]
    .filter(([p]: [string]) => p.startsWith(`${coleccion}/`) && p.split('/').length === 2)
    .map(([, d]: [string, any]) => d)

function sembrarPolitica(): void {
  sembrarVersion(db, TIPO_POLITICA, 1, DATOS_POLITICA)
}

// Paseo compartido: t1 con 2 mascotas, t2 con 1; 90 minutos
function sembrarPaseoFinalizado(): Record<string, unknown> {
  const paseo = {
    tipo: 'paseo',
    estado: 'FINALIZADO',
    id_cuidador: 'c1',
    duracion_estimada: 90,
    politica_version: 1,
  }
  db.__seed('operaciones/p1', paseo)
  db.__seed('operaciones/p1/mascotas/m1', { id_usuario: 't1' })
  db.__seed('operaciones/p1/mascotas/m2', { id_usuario: 't1' })
  db.__seed('operaciones/p1/mascotas/m3', { id_usuario: 't2' })
  db.__seed('usuarios/t1', { roles: ['tutor'] })
  db.__seed('usuarios/t2', { roles: ['tutor'] })
  return paseo
}

beforeEach(() => db.__reset())

describe('cálculo comercial', () => {
  const tarifas = POLITICA.por_tipo.paseo

  test('precio por mascotas y duración', () => {
    expect(calcularPrecioPaseo(tarifas, 1, 60)).toBe(18000)
    expect(calcularPrecioPaseo(tarifas, 2, 90)).toBe(34500)
    expect(calcularPrecioPaseo(tarifas, 0, 60)).toBe(0)
  })

  const IVA = (aplica: boolean, incluido: boolean) =>
    ({ iva_comision: { aplica, porcentaje: 19, incluido_en_precio: incluido } })

  test('IVA incluido: sale de la comisión, el tutor paga el precio publicado', () => {
    expect(desglosarCobro(tarifas, IVA(true, true), 18000)).toEqual({
      valor_acordado: 18000,
      remuneracion_mandatario: 1800,
      recursos_administrados: 16200,
      comision_base: 1513,
      iva_comision: 287,
    })
  })

  test('IVA no incluido: se suma al precio; el cuidador recibe lo mismo', () => {
    expect(desglosarCobro(tarifas, IVA(true, false), 18000)).toEqual({
      valor_acordado: 18342,
      remuneracion_mandatario: 2142,
      recursos_administrados: 16200,
      comision_base: 1800,
      iva_comision: 342,
    })
  })

  test('sin IVA y en cualquier caso cumple I1', () => {
    expect(desglosarCobro(tarifas, IVA(false, true), 18000).iva_comision).toBe(0)
    for (const precio of [1, 999, 18333, 34500]) {
      for (const iva of [IVA(true, true), IVA(true, false), IVA(false, true)]) {
        const d = desglosarCobro(tarifas, iva, precio)
        expect(d.remuneracion_mandatario + d.recursos_administrados).toBe(d.valor_acordado)
        expect(d.comision_base + d.iva_comision).toBe(d.remuneracion_mandatario)
      }
    }
  })

  test('hora de Colombia (UTC-5)', () => {
    expect(horaColombia(LUNES_10AM)).toBe(10)
  })
})

describe('política comercial', () => {
  test('valida datos correctos e incorrectos', () => {
    expect(validarPolitica(DATOS_POLITICA)).toEqual([])
    const mala = {
      ...DATOS_POLITICA,
      cobro: { ...DATOS_POLITICA.cobro, bloqueo_tras_horas: 12 },
      por_tipo: { paseo: { ...DATOS_POLITICA.por_tipo.paseo, comision: { porcentaje_plataforma: 150 } } },
    }
    const errores = validarPolitica(mala)
    expect(errores.join(' ')).toMatch(/Bloqueo/)
    expect(errores.join(' ')).toMatch(/Comisión/)
    expect(validarPolitica(undefined).length).toBeGreaterThan(5)
  })

  test('publicar versiona y archiva la anterior', async () => {
    const cambiada = {
      ...DATOS_POLITICA,
      cobro: { ...DATOS_POLITICA.cobro, plazo_pago_horas: 12 },
    }
    expect((await publicar(DATOS_POLITICA, 'Versión inicial')).version).toBe(1)
    expect((await publicar(cambiada)).version).toBe(2)
    expect(doc(`versionados/${TIPO_POLITICA}`).version_vigente).toBe(2)
    expect(doc(`versionados/${TIPO_POLITICA}/versiones/v1`).estado).toBe('HISTORICA')
    expect(doc(`versionados/${TIPO_POLITICA}/versiones/v2`)).toMatchObject({
      estado: 'ACTIVA', motivo: 'Cambio de tarifas', esquema: 1,
    })
  })

  test('el paseo fija la versión vigente al crearse', async () => {
    sembrarPolitica()
    db.__seed('operaciones/p9', { tipo: 'paseo' })
    expect(await fijarPoliticaDePaseo(db, 'p9', { tipo: 'paseo' })).toBe(1)
    expect(doc('operaciones/p9').politica_version).toBe(1)
    expect(await fijarPoliticaDePaseo(db, 'p9', { politica_version: 1 })).toBeNull()
  })

  test('sin política publicada falla (no hay valores por defecto)', async () => {
    db.__seed('operaciones/p9', { tipo: 'paseo' })
    await expect(fijarPoliticaDePaseo(db, 'p9', {})).rejects.toThrow(/versión vigente de politica_comercial/)
  })
})

describe('cobro al finalizar el paseo', () => {
  test('una operación por tutor con sus dos obligaciones', async () => {
    sembrarPolitica()
    const paseo = sembrarPaseoFinalizado()

    const tutores = await generarCobrosDePaseo(db, 'p1', paseo, AHORA)
    expect(tutores.sort()).toEqual(['t1', 't2'])

    const op1 = doc('operaciones_economicas/p1_t1')
    expect(op1).toMatchObject({
      estado: 'EJECUTADA',
      tutor_id: 't1',
      cuidador_id: 'c1',
      operacion_servicio_id: 'p1',
      valor_acordado: 34500, // 2 mascotas, 90 min
      remuneracion_mandatario: 3450,
      recursos_administrados: 31050,
      politica_version: 1,
    })
    expect(doc('operaciones_economicas/p1_t2').valor_acordado).toBe(27000)

    // Cada obligación lleva los términos de su política (no los vigentes)
    expect(doc('obligaciones/p1_t1_cobro')).toMatchObject({
      tipo: 'COBRO_TUTOR', deudor: 't1', acreedor: 'paw-path', valor: 34500, estado: 'PENDIENTE',
      politica_version: 1,
    })
    expect(doc('obligaciones/p1_t1_cobro').bloquear_desde.toMillis())
      .toBe(AHORA.toMillis() + 72 * HORA)
    expect(doc('obligaciones/p1_t1_cuidador')).toMatchObject({
      tipo: 'PAGO_CUIDADOR', deudor: 'paw-path', acreedor: 'c1', valor: 31050, cobro_recaudado: false,
      politica_version: 1, requiere_recaudo: true, documento_soporte: true,
    })
    expect(docsDe('obligaciones')).toHaveLength(4)
  })

  test('es idempotente', async () => {
    sembrarPolitica()
    const paseo = sembrarPaseoFinalizado()
    await generarCobrosDePaseo(db, 'p1', paseo, AHORA)
    expect(await generarCobrosDePaseo(db, 'p1', paseo, AHORA)).toEqual([])
    expect(docsDe('obligaciones')).toHaveLength(4)
  })

  test('usa la versión fijada aunque haya una más nueva', async () => {
    sembrarPolitica()
    sembrarVersion(db, TIPO_POLITICA, 2, {
      ...DATOS_POLITICA,
      por_tipo: { paseo: { ...DATOS_POLITICA.por_tipo.paseo, precio: { base_por_hora: 99000, mascota_adicional: 0 } } },
    })
    const paseo = sembrarPaseoFinalizado()
    await generarCobrosDePaseo(db, 'p1', paseo, AHORA)
    expect(doc('operaciones_economicas/p1_t2').valor_acordado).toBe(27000)
  })

  test('sin cuidador falla', async () => {
    sembrarPolitica()
    await expect(generarCobrosDePaseo(db, 'p1', { tipo: 'paseo' }, AHORA)).rejects.toThrow(/sin cuidador/)
  })
})

describe('pago del tutor', () => {
  const deps = () => ({
    pasarela: new MockAdaptadorPago(),
    contabilidad: new MockAdaptadorContable(),
  })

  async function prepararOperacion(): Promise<void> {
    sembrarPolitica()
    await generarCobrosDePaseo(db, 'p1', sembrarPaseoFinalizado(), AHORA)
  }

  test('solo el tutor de la operación puede pagar', async () => {
    await prepararOperacion()
    await expect(
      iniciarPagoTutor(db, 'p1_t1', 't2', new MockAdaptadorPago(), AHORA)
    ).rejects.toMatchObject({ codigo: 'permission-denied' })
  })

  test('pago aprobado: recaudo, cobro cumplido, recibo de caja y desbloqueo', async () => {
    await prepararOperacion()
    db.__seed('usuarios/t1', { roles: ['tutor'], bloqueo_financiero: { activo: true } })

    const inicio = await iniciarPagoTutor(db, 'p1_t1', 't1', new MockAdaptadorPago(), AHORA)
    expect(inicio.monto).toBe(34500)
    expect(doc('operaciones_economicas/p1_t1').pago_pendiente.referencia).toBe(inicio.referencia)

    const res = await confirmarPagoTutor(db, 'p1_t1', 't1', false, deps(), AHORA)
    expect(res.estado).toBe('APROBADO')

    const op = doc('operaciones_economicas/p1_t1')
    expect(op.estado).toBe('RECAUDADA')
    expect(op.pago_pendiente).toBeUndefined()
    expect(doc('documentos_contables/RC-p1_t1')).toMatchObject({
      tipo: 'RECIBO_CAJA', total: 34500,
      referencias: { operacion_id: 'p1_t1', documento_relacionado: 'FV-p1_t1' },
      envio: { estado: 'ENVIADO', numero_proveedor: 'MOCK-RC-RC-p1_t1' },
    })
    expect(doc('obligaciones/p1_t1_cobro').estado).toBe('CUMPLIDA')
    expect(doc('obligaciones/p1_t1_cuidador').cobro_recaudado).toBe(true)
    expect(doc('usuarios/t1').bloqueo_financiero).toBeUndefined()

    const movimientos = docsDe('movimientos_financieros')
    expect(movimientos).toHaveLength(1)
    expect(movimientos[0]).toMatchObject({ tipo: 'RECAUDO', sentido: 'ENTRADA', valor: 34500 })

    // Reconfirmar no duplica dinero
    await confirmarPagoTutor(db, 'p1_t1', 't1', false, deps(), AHORA)
    expect(docsDe('movimientos_financieros')).toHaveLength(1)
  })

  test('pago rechazado no registra dinero y permite reintentar', async () => {
    await prepararOperacion()
    const primero = await iniciarPagoTutor(db, 'p1_t1', 't1', new MockAdaptadorPago(), AHORA)
    const pasarela = new MockAdaptadorPago()
    jest.spyOn(pasarela, 'consultarPago').mockResolvedValue({ estado: 'RECHAZADO', mensaje: 'Fondos insuficientes' })

    const res = await confirmarPagoTutor(db, 'p1_t1', 't1', false, { ...deps(), pasarela }, AHORA)
    expect(res.estado).toBe('RECHAZADO')
    expect(doc('operaciones_economicas/p1_t1').estado).toBe('EJECUTADA')
    expect(doc('operaciones_economicas/p1_t1').pago_pendiente).toBeUndefined()
    expect(docsDe('movimientos_financieros')).toHaveLength(0)

    // Reintentar crea un intento nuevo con otra referencia
    const segundo = await iniciarPagoTutor(db, 'p1_t1', 't1', new MockAdaptadorPago(), AHORA)
    expect(segundo.referencia).not.toBe(primero.referencia)
  })

  test('si el sistema contable falla, el recaudo se mantiene y el documento queda en Paw-Path', async () => {
    await prepararOperacion()
    await iniciarPagoTutor(db, 'p1_t1', 't1', new MockAdaptadorPago(), AHORA)
    const contabilidad = new MockAdaptadorContable()
    jest.spyOn(contabilidad, 'registrarReciboCaja').mockRejectedValue(new Error('Siigo caído'))

    await confirmarPagoTutor(db, 'p1_t1', 't1', false, { ...deps(), contabilidad }, AHORA)
    expect(doc('operaciones_economicas/p1_t1').estado).toBe('RECAUDADA')
    expect(doc('documentos_contables/RC-p1_t1')).toMatchObject({
      total: 34500, envio: { estado: 'ERROR', error: 'Siigo caído' },
    })
  })

  test('no se puede iniciar pago de una operación ya recaudada', async () => {
    await prepararOperacion()
    await iniciarPagoTutor(db, 'p1_t1', 't1', new MockAdaptadorPago(), AHORA)
    await confirmarPagoTutor(db, 'p1_t1', 't1', false, deps(), AHORA)
    await expect(
      iniciarPagoTutor(db, 'p1_t1', 't1', new MockAdaptadorPago(), AHORA)
    ).rejects.toMatchObject({ codigo: 'failed-precondition' })
  })
})

describe('cobranza y bloqueo', () => {
  const cobro = POLITICA.cobro
  const cobroCreadoHace = (horas: number, extra: Record<string, unknown> = {}) => ({
    id: 'o1', deudor: 't1', valor: 18000, operacion_id: 'p1_t1',
    creado_en: ts(LUNES_10AM - horas * HORA),
    bloquear_desde: ts(LUNES_10AM - horas * HORA + 72 * HORA), ...extra,
  })

  test('recordatorio: después del plazo, con intervalo y en horario', () => {
    expect(debeRecordar(cobroCreadoHace(10), cobro, LUNES_10AM)).toBe(false)
    expect(debeRecordar(cobroCreadoHace(25), cobro, LUNES_10AM)).toBe(true)
    expect(debeRecordar(cobroCreadoHace(25, { recordatorios_enviados: 3 }), cobro, LUNES_10AM)).toBe(false)
    expect(debeRecordar(
      cobroCreadoHace(50, { recordatorios_enviados: 1, ultimo_recordatorio_en: ts(LUNES_10AM - 2 * HORA) }),
      cobro, LUNES_10AM
    )).toBe(false)
    // 21:00 en Colombia: fuera de horario
    expect(debeRecordar(cobroCreadoHace(25), cobro, LUNES_10AM + 11 * HORA)).toBe(false)
  })

  test('próxima revisión: plazo, horario permitido y fin de la cadena', () => {
    // Creado a las 10:00: primer aviso 24 h después (dentro de horario)
    expect(siguienteRevision(cobroCreadoHace(0), cobro)).toBe(LUNES_10AM + 24 * HORA)
    // Creado a las 21:00: a las 24 h está fuera de horario → miércoles 08:00
    const nocturno = { ...cobroCreadoHace(0), creado_en: ts(LUNES_10AM + 11 * HORA) }
    expect(siguienteRevision(nocturno, cobro)).toBe(Date.UTC(2026, 9, 21, 13))
    // Pagado, o sin avisos ni bloqueo pendientes: no hay más tareas
    expect(siguienteRevision(cobroCreadoHace(0, { estado: 'CUMPLIDA' }), cobro)).toBeNull()
    expect(siguienteRevision(
      cobroCreadoHace(100, { recordatorios_enviados: 3, bloqueo_aplicado: true }), cobro
    )).toBeNull()
  })

  function sembrarCobro(id: string, deudor: string, horas: number, estado = 'PENDIENTE'): void {
    db.__seed(`obligaciones/${id}`, {
      ...cobroCreadoHace(horas), id, deudor,
      tipo: 'COBRO_TUTOR', estado, acreedor: 'paw-path',
    })
    db.__seed(`usuarios/${deudor}`, { roles: ['tutor'] })
  }
  const notificaciones = () =>
    [...db.__docs.keys()].filter((p: string) => p.includes('/notificaciones/'))

  test('vencido: avisa, bloquea y agenda solo el siguiente aviso', async () => {
    sembrarCobro('o1', 't1', 80)
    const siguiente = await revisarCobro(db, 'o1', cobro, AHORA)

    expect(doc('usuarios/t1').bloqueo_financiero).toMatchObject({ activo: true, obligacion_ids: ['o1'] })
    expect(doc('obligaciones/o1')).toMatchObject({ recordatorios_enviados: 1, bloqueo_aplicado: true })
    expect(notificaciones()).toHaveLength(1)
    expect(siguiente).toBe(LUNES_10AM + 24 * HORA)
  })

  test('en plazo de aviso: avisa sin bloquear', async () => {
    sembrarCobro('o2', 't2', 30)
    const siguiente = await revisarCobro(db, 'o2', cobro, AHORA)

    expect(doc('usuarios/t2').bloqueo_financiero).toBeUndefined()
    expect(doc('obligaciones/o2').recordatorios_enviados).toBe(1)
    expect(siguiente).toBe(LUNES_10AM + 24 * HORA)
  })

  test('el bloqueo usa el plazo fijado en el cobro, no el de la política', async () => {
    // Nació con 72 h; aunque la política diga otra cosa, a las 30 h no bloquea
    sembrarCobro('o4', 't4', 30)
    await revisarCobro(db, 'o4', { ...cobro, bloqueo_tras_horas: 24 }, AHORA)
    expect(doc('usuarios/t4').bloqueo_financiero).toBeUndefined()
  })

  test('pagado: no hace nada y termina la cadena', async () => {
    sembrarCobro('o3', 't3', 80, 'CUMPLIDA')
    expect(await revisarCobro(db, 'o3', cobro, AHORA)).toBeNull()
    expect(notificaciones()).toHaveLength(0)
  })
})

describe('liquidación a cuidadores', () => {
  const liq = POLITICA.liquidacion

  function sembrarPagoCuidador(id: string, valor: number, extra: Record<string, unknown> = {}): void {
    db.__seed(`obligaciones/${id}`, {
      id, tipo: 'PAGO_CUIDADOR', estado: 'PENDIENTE', deudor: 'paw-path',
      acreedor: 'c1', valor, operacion_id: `op-${id}`,
      creado_en: ts(LUNES_10AM - 48 * HORA), cobro_recaudado: true,
      requiere_recaudo: true, ...extra,
    })
  }

  test('agrupa por cuidador solo lo recaudado y es idempotente', async () => {
    sembrarPagoCuidador('a', 16200)
    sembrarPagoCuidador('b', 16200)
    sembrarPagoCuidador('c', 16200, { cobro_recaudado: false }) // tutor no ha pagado

    const { creadas } = await generarLiquidaciones(db, liq, LUNES_10AM, AHORA)
    expect(creadas).toEqual(['c1_2026-10-19'])
    expect(doc('liquidaciones/c1_2026-10-19')).toMatchObject({
      cuidador_id: 'c1', total: 32400, estado: 'BORRADOR', obligacion_ids: ['a', 'b'],
    })
    expect(doc('obligaciones/c').liquidacion_id).toBeUndefined()

    expect(await generarLiquidaciones(db, liq, LUNES_10AM, AHORA)).toEqual({ creadas: [], aplazadas: 0 })
  })

  test('si su política no exigía recaudo se liquida aunque el tutor no haya pagado', async () => {
    sembrarPagoCuidador('a', 16200, { cobro_recaudado: false, requiere_recaudo: false })
    sembrarPagoCuidador('b', 16200, { cobro_recaudado: false })
    const { creadas } = await generarLiquidaciones(db, { ...liq, monto_minimo: 0 }, LUNES_10AM, AHORA)
    expect(doc(`liquidaciones/${creadas[0]}`).obligacion_ids).toEqual(['a'])
  })

  test('por debajo del monto mínimo se aplaza al siguiente corte', async () => {
    sembrarPagoCuidador('a', 16200)
    expect(await generarLiquidaciones(db, liq, LUNES_10AM, AHORA)).toEqual({ creadas: [], aplazadas: 1 })
  })

  test('próximo corte: medianoche del día siguiente al de corte (hora Colombia)', () => {
    // Lunes 19: corte de domingo → lunes 26 00:00 (05:00 UTC)
    expect(proximoCorte(liq, LUNES_10AM)).toBe(Date.UTC(2026, 9, 26, 5))
    // Corte de miércoles → jueves 22 00:00
    expect(proximoCorte({ ...liq, dia_corte: 3 }, LUNES_10AM)).toBe(Date.UTC(2026, 9, 22, 5))
  })

  test('pagar la liquidación cumple las obligaciones y cierra las operaciones', async () => {
    db.__seed('operaciones_economicas/op-a', { estado: 'RECAUDADA' })
    db.__seed('operaciones_economicas/op-b', { estado: 'RECAUDADA' })
    sembrarPagoCuidador('a', 16200)
    sembrarPagoCuidador('b', 16200)
    const { creadas: [liqId] } = await generarLiquidaciones(db, liq, LUNES_10AM, AHORA)

    await registrarPagoLiquidacion(db, liqId, 'TRF-123', 'admin', AHORA)

    expect(doc(`liquidaciones/${liqId}`)).toMatchObject({ estado: 'PAGADA', referencia_pago: 'TRF-123' })
    expect(doc('obligaciones/a').estado).toBe('CUMPLIDA')
    expect(doc('obligaciones/b').estado).toBe('CUMPLIDA')
    expect(doc('operaciones_economicas/op-a').estado).toBe('CERRADA')
    // Una sola transferencia, un movimiento por obligación (sin colisión de deduplicación)
    const movimientos = docsDe('movimientos_financieros')
    expect(movimientos).toHaveLength(2)
    expect(movimientos.every((m: any) => m.tipo === 'PAGO' && m.sentido === 'SALIDA')).toBe(true)

    await expect(
      registrarPagoLiquidacion(db, liqId, 'TRF-123', 'admin', AHORA)
    ).rejects.toThrow(/ya está pagada/)
  })
})

describe('idempotencia: repetir una acción nunca duplica nada', () => {
  const eventos = (opId: string, tipo: string) =>
    [...db.__docs.entries()].filter(([p, d]: [string, any]) =>
      p.startsWith(`operaciones_economicas/${opId}/eventos_economicos/`) && d.tipo === tipo)
  const deps = () => ({
    pasarela: new MockAdaptadorPago(),
    contabilidad: new MockAdaptadorContable(),
  })

  async function prepararOperacion(): Promise<void> {
    sembrarPolitica()
    await generarCobrosDePaseo(db, 'p1', sembrarPaseoFinalizado(), AHORA)
  }

  test('iniciar el pago dos veces devuelve el mismo cobro (doble toque)', async () => {
    await prepararOperacion()
    const pasarela = new MockAdaptadorPago()
    const espia = jest.spyOn(pasarela, 'iniciarPago')

    const a = await iniciarPagoTutor(db, 'p1_t1', 't1', pasarela, AHORA)
    const b = await iniciarPagoTutor(db, 'p1_t1', 't1', pasarela, AHORA)

    expect(b.referencia).toBe(a.referencia)
    expect(espia).toHaveBeenCalledTimes(1)
    expect(eventos('p1_t1', 'PAGO_INICIADO')).toHaveLength(1)
  })

  test('confirmar dos veces (en paralelo) registra un solo recaudo y un recibo', async () => {
    await prepararOperacion()
    await iniciarPagoTutor(db, 'p1_t1', 't1', new MockAdaptadorPago(), AHORA)
    const d = deps()
    const recibo = jest.spyOn(d.contabilidad, 'registrarReciboCaja')

    await Promise.all([
      confirmarPagoTutor(db, 'p1_t1', 't1', false, d, AHORA),
      confirmarPagoTutor(db, 'p1_t1', 't1', false, d, AHORA),
    ])

    expect(docsDe('movimientos_financieros')).toHaveLength(1)
    expect(eventos('p1_t1', 'RECAUDO')).toHaveLength(1)
    expect(recibo).toHaveBeenCalledTimes(1)
  })

  test('pagar la misma obligación dos veces (aun con otra referencia) paga una sola vez', async () => {
    db.__seed('operaciones_economicas/op-a', { estado: 'RECAUDADA' })
    db.__seed('obligaciones/a', {
      id: 'a', tipo: 'PAGO_CUIDADOR', estado: 'PENDIENTE', deudor: 'paw-path',
      acreedor: 'c1', valor: 16200, operacion_id: 'op-a', creado_en: AHORA,
    })

    const primero = await pagarObligacion(db, 'a', { origen: 'TRANSFERENCIA', referencia: 'TRF-1:a' }, AHORA)
    const segundo = await pagarObligacion(db, 'a', { origen: 'TRANSFERENCIA', referencia: 'TRF-2:a' }, AHORA)

    expect(primero).not.toBeNull()
    expect(segundo).toBeNull()
    expect(docsDe('movimientos_financieros')).toHaveLength(1)
    expect(eventos('op-a', 'PAGO_TERCERO')).toHaveLength(1)
    expect(eventos('op-a', 'OPERACION_CERRADA')).toHaveLength(1)
  })

  test('un pago ya hecho cuyo cierre quedó pendiente se cierra al reintentar', async () => {
    db.__seed('operaciones_economicas/op-b', { estado: 'RECAUDADA' })
    db.__seed('obligaciones/b', {
      id: 'b', tipo: 'PAGO_CUIDADOR', estado: 'CUMPLIDA', deudor: 'paw-path',
      acreedor: 'c1', valor: 16200, operacion_id: 'op-b', creado_en: AHORA,
    })
    expect(await pagarObligacion(db, 'b', { origen: 'TRANSFERENCIA', referencia: 'TRF-1:b' }, AHORA))
      .toBeNull()
    expect(doc('operaciones_economicas/op-b').estado).toBe('CERRADA')
    expect(await cerrarSiCompleta(db, 'op-b', AHORA)).toBe(false)
    expect(eventos('op-b', 'OPERACION_CERRADA')).toHaveLength(1)
  })

  test('revisar el mismo cobro dos veces envía un solo recordatorio', async () => {
    db.__seed('usuarios/t1', { roles: ['tutor'] })
    db.__seed('obligaciones/o1', {
      id: 'o1', tipo: 'COBRO_TUTOR', estado: 'PENDIENTE', deudor: 't1', acreedor: 'paw-path',
      valor: 18000, operacion_id: 'p1_t1', creado_en: ts(LUNES_10AM - 30 * HORA),
      bloquear_desde: ts(LUNES_10AM + 42 * HORA),
    })

    await Promise.all([
      revisarCobro(db, 'o1', POLITICA.cobro, AHORA),
      revisarCobro(db, 'o1', POLITICA.cobro, AHORA),
    ])

    const avisos = [...db.__docs.keys()].filter((k: string) => k.includes('/notificaciones/'))
    expect(avisos).toEqual(['usuarios/t1/notificaciones/o1_recordatorio_1'])
    expect(doc('obligaciones/o1').recordatorios_enviados).toBe(1)
  })

  test('publicar la misma política dos veces no crea otra versión', async () => {
    expect(await publicar(DATOS_POLITICA)).toMatchObject({ version: 1, nueva: true })
    expect(await publicar(DATOS_POLITICA, 'Doble toque')).toMatchObject({ version: 1, nueva: false })
    expect(doc(`versionados/${TIPO_POLITICA}/versiones/v2`)).toBeUndefined()
    // Los campos desconocidos no se guardan
    await publicar({ ...DATOS_POLITICA, extra: 'x', cobro: { ...DATOS_POLITICA.cobro, plazo_pago_horas: 12 } })
    expect(doc(`versionados/${TIPO_POLITICA}/versiones/v2`).contenido).not.toHaveProperty('extra')
  })
})
