/**
 * Cierre de la entrega sin confirmar (paseos/entrega.ts) y reclamo del tutor
 * (economia/reclamo.ts), con la cobranza pausada mientras hay reclamo.
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
jest.mock('../../src/economia/tareas', () => ({
  programarTarea: jest.fn().mockResolvedValue(true),
}))

import {
  abrirDisputaDeEntrega,
  avisarEntregaPendiente,
  cerrarEntregaAutomatico,
  cerrarEntregaPorEquipo,
  CLAVE_CHAT_ENTREGA_PENDIENTE,
  entregaPendiente,
  marcarParaRevision,
  programarSeguimientoEntrega,
  tutoresPendientesDeEntrega,
} from '../../src/paseos/entrega'
import {
  abrirReclamoCobro,
  ORIGEN_CIERRE_EQUIPO,
  resolverReclamoCobro,
} from '../../src/economia/reclamo'
import { debeRecordar, enReclamo, siguienteRevision } from '../../src/economia/cobranza'
import { programarTarea } from '../../src/economia/tareas'
import { limpiarCacheConfiguracion } from '../../src/comun/configuracion'
import { sembrarVersion } from '../helpers/versionado'

const HORA = 3600000
const AHORA = mockFirestore.MOCK_TIMESTAMP.fromMillis(1_700_000_000_000)
const ts = (ms: number) => mockFirestore.MOCK_TIMESTAMP.fromMillis(ms)

const POLITICA = {
  por_tipo: {
    paseo: {
      precio: { base_por_hora: 18000, mascota_adicional: 5000 },
      comision: { porcentaje_plataforma: 10 },
    },
  },
  cobro: {
    plazo_pago_horas: 24, bloqueo_tras_horas: 72, max_recordatorios: 3,
    intervalo_recordatorios_horas: 24, horario_recordatorios: { desde: 8, hasta: 19 },
  },
  liquidacion: {
    frecuencia: 'SEMANAL', dia_corte: 0, dia_pago: 2, monto_minimo: 0, solo_recaudadas: true,
  },
  impuestos: { iva_comision: { aplica: true, porcentaje: 19, incluido_en_precio: true } },
  contabilidad: { documento_soporte_cuidador: true },
  entrega: {
    ventana_reclamo_horas: 48, cobrar_si_cierra_equipo: true,
    cierre_automatico_horas: 0, cierre_automatico_requiere_evidencia: true,
  },
}

const PASEO = {
  tipo: 'paseo',
  estado: 'FINALIZADO',
  id_cuidador: 'c1',
  politica_version: 1,
  codigos_entrega_por_tutor: { t1: '123456' },
  codigo_entrega_validado_por_tutor: {},
}

const paseo = (id = 'p1') => mockDb.__docs.get(`operaciones/${id}`)

beforeEach(() => {
  jest.clearAllMocks()
  mockDb.__reset()
  limpiarCacheConfiguracion()
  jest.spyOn(console, 'warn').mockImplementation(() => undefined)
  sembrarVersion(mockDb, 'politica_comercial', 1, POLITICA)
  mockDb.__seed('operaciones/p1', { ...PASEO })
})

describe('estado de la entrega', () => {
  test('pendiente solo si el paseo está FINALIZADO con códigos sin validar', () => {
    expect(entregaPendiente(PASEO)).toBe(true)
    expect(entregaPendiente({ ...PASEO, estado: 'COMPLETADO' })).toBe(false)
    expect(entregaPendiente({ ...PASEO, estado: 'EN_PROGRESO' })).toBe(false)
    expect(entregaPendiente({
      ...PASEO, codigo_entrega_validado_por_tutor: { t1: true },
    })).toBe(false)
    expect(entregaPendiente(undefined)).toBe(false)
  })

  test('lista los tutores que faltan por validar', () => {
    expect(tutoresPendientesDeEntrega({
      ...PASEO,
      codigos_entrega_por_tutor: { t1: 'a', t2: 'b' },
      codigo_entrega_validado_por_tutor: { t1: true },
    })).toEqual(['t2'])
  })
})

describe('programarSeguimientoEntrega', () => {
  test('agenda aviso (3 h) y revisión (12 h) con nombres deterministas', async () => {
    await programarSeguimientoEntrega(mockDb, 'p1', PASEO, 1_000_000)

    expect(programarTarea).toHaveBeenCalledTimes(2)
    expect(programarTarea).toHaveBeenCalledWith(
      'avisarEntregaPendiente', { paseoId: 'p1' }, 1_000_000 + 3 * HORA, 'entrega-aviso-p1')
    expect(programarTarea).toHaveBeenCalledWith(
      'revisarEntregaPendiente', { paseoId: 'p1' }, 1_000_000 + 12 * HORA, 'entrega-revision-p1')
  })

  test('respeta los tiempos de la configuración', async () => {
    mockDb.__seed('configuracion/paseos', { entrega_aviso_horas: 1, entrega_revision_horas: 6 })
    await programarSeguimientoEntrega(mockDb, 'p1', PASEO, 0)

    expect(programarTarea).toHaveBeenCalledWith(
      'avisarEntregaPendiente', expect.anything(), 1 * HORA, expect.any(String))
    expect(programarTarea).toHaveBeenCalledWith(
      'revisarEntregaPendiente', expect.anything(), 6 * HORA, expect.any(String))
  })

  test('el cierre automático solo se agenda si la política lo activa', async () => {
    sembrarVersion(mockDb, 'politica_comercial', 2, {
      ...POLITICA, entrega: { ...POLITICA.entrega, cierre_automatico_horas: 24 },
    })
    await programarSeguimientoEntrega(mockDb, 'p1', { ...PASEO, politica_version: 2 }, 0)

    expect(programarTarea).toHaveBeenCalledTimes(3)
    expect(programarTarea).toHaveBeenCalledWith(
      'cerrarEntregaAutomatico', { paseoId: 'p1' }, 24 * HORA, 'entrega-cierre-p1')
  })
})

describe('avisarEntregaPendiente', () => {
  test('deja un único mensaje del sistema en el chat del paseo', async () => {
    mockDb.__seed('conversaciones/p1', { participantes: ['t1', 'c1'] })

    expect(await avisarEntregaPendiente(mockDb, 'p1', AHORA)).toBe(true)
    expect(mockDb.__docs.get('conversaciones/p1/mensajes/entrega-aviso')).toMatchObject({
      contenido: CLAVE_CHAT_ENTREGA_PENDIENTE,
      tipo_mensaje: 'sistema',
    })
    // Repetir no duplica el aviso
    expect(await avisarEntregaPendiente(mockDb, 'p1', AHORA)).toBe(false)
  })

  test('no avisa si ya se confirmó o si no hay chat', async () => {
    expect(await avisarEntregaPendiente(mockDb, 'p1', AHORA)).toBe(false) // sin chat

    mockDb.__seed('conversaciones/p1', { participantes: ['t1', 'c1'] })
    mockDb.__seed('operaciones/p1', { ...PASEO, estado: 'COMPLETADO' })
    expect(await avisarEntregaPendiente(mockDb, 'p1', AHORA)).toBe(false)
  })
})

describe('marcarParaRevision', () => {
  test('marca el paseo si el tutor sigue sin confirmar', async () => {
    expect(await marcarParaRevision(mockDb, 'p1', AHORA)).toBe(true)
    expect(paseo()).toMatchObject({
      requiere_revision: true, motivo_revision: 'ENTREGA_SIN_CONFIRMAR',
    })
  })

  test('no marca un paseo ya confirmado, ya marcado o en disputa', async () => {
    mockDb.__seed('operaciones/p1', { ...PASEO, estado: 'COMPLETADO' })
    expect(await marcarParaRevision(mockDb, 'p1', AHORA)).toBe(false)

    mockDb.__seed('operaciones/p1', { ...PASEO, requiere_revision: true })
    expect(await marcarParaRevision(mockDb, 'p1', AHORA)).toBe(false)

    mockDb.__seed('operaciones/p1', { ...PASEO, en_disputa: { por: 'a1' } })
    expect(await marcarParaRevision(mockDb, 'p1', AHORA)).toBe(false)
  })
})

describe('cerrarEntregaPorEquipo', () => {
  const opciones = { por: 'admin1', motivo: 'GPS y chat respaldan al cuidador', ahora: AHORA }

  test('valida el código de los tutores pendientes y completa el paseo', async () => {
    const res = await cerrarEntregaPorEquipo(mockDb, 'p1', opciones)

    expect(res).toEqual({ tutores: ['t1'], completado: true })
    expect(paseo()).toMatchObject({
      estado: 'COMPLETADO',
      codigo_entrega_validado_por_tutor: { t1: true },
      cierre_por_equipo: { por: 'admin1', motivo: opciones.motivo },
      requiere_revision: false,
      actualizado_por: 'admin1',
    })
  })

  test('respeta lo que ya validaron otros tutores (paseo compartido)', async () => {
    mockDb.__seed('operaciones/p1', {
      ...PASEO,
      codigos_entrega_por_tutor: { t1: 'a', t2: 'b' },
      codigo_entrega_validado_por_tutor: { t1: true },
    })
    const res = await cerrarEntregaPorEquipo(mockDb, 'p1', opciones)

    expect(res.tutores).toEqual(['t2'])
    expect(paseo().codigo_entrega_validado_por_tutor).toEqual({ t1: true, t2: true })
  })

  test('rechaza si la entrega no está pendiente', async () => {
    mockDb.__seed('operaciones/p1', { ...PASEO, estado: 'EN_PROGRESO' })
    await expect(cerrarEntregaPorEquipo(mockDb, 'p1', opciones))
      .rejects.toMatchObject({ codigo: 'failed-precondition' })
  })

  test('rechaza si la política del paseo no permite cerrar y cobrar', async () => {
    sembrarVersion(mockDb, 'politica_comercial', 2, {
      ...POLITICA, entrega: { ...POLITICA.entrega, cobrar_si_cierra_equipo: false },
    })
    mockDb.__seed('operaciones/p1', { ...PASEO, politica_version: 2 })

    await expect(cerrarEntregaPorEquipo(mockDb, 'p1', opciones))
      .rejects.toMatchObject({ codigo: 'failed-precondition' })
    expect(paseo().estado).toBe('FINALIZADO')
  })

  test('paseo inexistente', async () => {
    await expect(cerrarEntregaPorEquipo(mockDb, 'nada', opciones))
      .rejects.toMatchObject({ codigo: 'not-found' })
  })
})

describe('abrirDisputaDeEntrega', () => {
  test('detiene la entrega sin cerrarla ni cobrar', async () => {
    await abrirDisputaDeEntrega(mockDb, 'p1', { por: 'admin1', motivo: 'Hay dudas', ahora: AHORA })

    expect(paseo()).toMatchObject({
      estado: 'FINALIZADO',
      en_disputa: { por: 'admin1', motivo: 'Hay dudas' },
      requiere_revision: false,
    })
  })
})

describe('cerrarEntregaAutomatico', () => {
  const conCierre = (extra: Record<string, unknown> = {}) => {
    sembrarVersion(mockDb, 'politica_comercial', 2, {
      ...POLITICA,
      entrega: { ...POLITICA.entrega, cierre_automatico_horas: 24, ...extra },
    })
    mockDb.__seed('operaciones/p1', { ...PASEO, politica_version: 2 })
  }

  test('apagado por defecto: no cierra', async () => {
    expect(await cerrarEntregaAutomatico(mockDb, 'p1', AHORA)).toBeNull()
    expect(paseo().estado).toBe('FINALIZADO')
  })

  test('sin evidencia no cierra solo y deja el paseo para el equipo', async () => {
    conCierre()
    expect(await cerrarEntregaAutomatico(mockDb, 'p1', AHORA)).toBeNull()
    expect(paseo()).toMatchObject({ estado: 'FINALIZADO', requiere_revision: true })
  })

  test('con evidencia (foto del grupo) cierra a favor del cuidador', async () => {
    conCierre()
    mockDb.__seed('operaciones/p1', {
      ...PASEO, politica_version: 2, foto_entrega_grupo: 'https://foto',
    })
    const res = await cerrarEntregaAutomatico(mockDb, 'p1', AHORA)

    expect(res).toEqual({ tutores: ['t1'], completado: true })
    expect(paseo().cierre_por_equipo).toMatchObject({ por: 'sistema' })
  })

  test('sin exigir evidencia cierra directamente', async () => {
    conCierre({ cierre_automatico_requiere_evidencia: false })
    expect((await cerrarEntregaAutomatico(mockDb, 'p1', AHORA))?.completado).toBe(true)
  })

  test('no cierra un paseo en disputa', async () => {
    conCierre({ cierre_automatico_requiere_evidencia: false })
    mockDb.__seed('operaciones/p1', {
      ...PASEO, politica_version: 2, en_disputa: { por: 'admin1' },
    })
    expect(await cerrarEntregaAutomatico(mockDb, 'p1', AHORA)).toBeNull()
  })
})

describe('reclamo del tutor', () => {
  const COBRO = 'p1_t1_cobro'
  const cobro = (extra: Record<string, unknown> = {}) => {
    mockDb.__seed(`obligaciones/${COBRO}`, {
      id: COBRO, tipo: 'COBRO_TUTOR', deudor: 't1', estado: 'PENDIENTE', valor: 18000,
      operacion_id: 'p1_t1', politica_version: 1,
      creado_en: AHORA,
      bloquear_desde: ts(AHORA.toMillis() + 72 * HORA),
      origen: ORIGEN_CIERRE_EQUIPO,
      reclamo_hasta: ts(AHORA.toMillis() + 48 * HORA),
      ...extra,
    })
    mockDb.__seed('usuarios/t1', { roles: ['tutor'] })
  }

  test('abre el reclamo dentro de la ventana', async () => {
    cobro()
    await abrirReclamoCobro(mockDb, 't1', COBRO, 'No me entregaron a Max', AHORA)

    expect(mockDb.__docs.get(`obligaciones/${COBRO}`).reclamo).toMatchObject({
      estado: 'ABIERTO', motivo: 'No me entregaron a Max',
    })
  })

  test.each([
    ['otro tutor', () => cobro(), 'otro', 'not-found'],
    ['cobro confirmado con código (sin origen de cierre)', () => cobro({ origen: undefined }), 't1', 'failed-precondition'],
    ['cobro ya pagado', () => cobro({ estado: 'CUMPLIDA' }), 't1', 'failed-precondition'],
    ['ventana vencida', () => cobro({ reclamo_hasta: ts(AHORA.toMillis() - 1) }), 't1', 'failed-precondition'],
    ['reclamo ya existente', () => cobro({ reclamo: { estado: 'ABIERTO' } }), 't1', 'failed-precondition'],
  ])('rechaza: %s', async (_nombre, preparar, uid, codigo) => {
    preparar()
    await expect(abrirReclamoCobro(mockDb, uid, COBRO, 'motivo', AHORA))
      .rejects.toMatchObject({ codigo })
  })

  test('exige motivo', async () => {
    cobro()
    await expect(abrirReclamoCobro(mockDb, 't1', COBRO, '  ', AHORA))
      .rejects.toMatchObject({ codigo: 'invalid-argument' })
  })

  test('mientras hay reclamo se pausa la cobranza: sin recordatorios, bloqueo ni revisión', async () => {
    cobro()
    await abrirReclamoCobro(mockDb, 't1', COBRO, 'motivo', AHORA)
    const o = { ...mockDb.__docs.get(`obligaciones/${COBRO}`), id: COBRO }

    expect(enReclamo(o)).toBe(true)
    expect(debeRecordar(o, POLITICA.cobro, AHORA.toMillis() + 30 * HORA)).toBe(false)
    expect(siguienteRevision(o, POLITICA.cobro)).toBeNull()
  })

  test('un cobro en reclamo no bloquea al tutor aunque esté vencido', async () => {
    cobro({ bloquear_desde: ts(AHORA.toMillis() - HORA) })
    mockDb.__seed('usuarios/t1', {
      roles: ['tutor'], bloqueo_financiero: { activo: true, desde: AHORA, obligacion_ids: [COBRO] },
    })
    await abrirReclamoCobro(mockDb, 't1', COBRO, 'motivo', AHORA)

    expect(mockDb.__docs.get('usuarios/t1').bloqueo_financiero).toBeUndefined()
  })

  test('el equipo mantiene el cobro: el reclamo se rechaza y el cobro sigue pendiente', async () => {
    cobro()
    await abrirReclamoCobro(mockDb, 't1', COBRO, 'motivo', AHORA)
    await resolverReclamoCobro(mockDb, COBRO, 'mantener', {
      por: 'admin1', motivo: 'La evidencia respalda el servicio', ahora: AHORA,
    })

    const o = mockDb.__docs.get(`obligaciones/${COBRO}`)
    expect(o.estado).toBe('PENDIENTE')
    expect(o.reclamo).toMatchObject({ estado: 'RECHAZADO', resuelto_por: 'admin1' })
    expect(enReclamo(o)).toBe(false)
  })

  test('el equipo anula el cobro: queda ANULADA y el reclamo aceptado', async () => {
    cobro()
    await abrirReclamoCobro(mockDb, 't1', COBRO, 'motivo', AHORA)
    await resolverReclamoCobro(mockDb, COBRO, 'anular', {
      por: 'admin1', motivo: 'El tutor tiene razón', ahora: AHORA,
    })

    const o = mockDb.__docs.get(`obligaciones/${COBRO}`)
    expect(o.estado).toBe('ANULADA')
    expect(o.reclamo.estado).toBe('ACEPTADO')
  })

  test('no se resuelve un cobro sin reclamo abierto ni sin motivo', async () => {
    cobro()
    await expect(resolverReclamoCobro(mockDb, COBRO, 'mantener', {
      por: 'admin1', motivo: 'x', ahora: AHORA,
    })).rejects.toMatchObject({ codigo: 'failed-precondition' })

    await abrirReclamoCobro(mockDb, 't1', COBRO, 'motivo', AHORA)
    await expect(resolverReclamoCobro(mockDb, COBRO, 'mantener', {
      por: 'admin1', motivo: '', ahora: AHORA,
    })).rejects.toMatchObject({ codigo: 'invalid-argument' })
  })
})
