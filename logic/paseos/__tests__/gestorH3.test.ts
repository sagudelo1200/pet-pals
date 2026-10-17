/* eslint-env jest */
/**
 * Contadores territoriales (H3) del paseo activo:
 * - Se usa la celda r9 de las coordenadas reales de inicio (no la (0,0)).
 * - paseos_activos: +1 al iniciar, -1 al finalizar y -1 al cancelar SOLO si
 *   el paseo había iniciado (crear el paseo ya no suma).
 */

jest.mock('@/services/firebase', () => ({
  ServicioAuth: { obtenerUsuarioActual: jest.fn(() => ({ uid: 'u1' })) },
  ServicioPaseo: {
    commitEstadoTransaccional: jest.fn(),
    registrarEvento: jest.fn(),
    actualizar: jest.fn(),
  },
}))

jest.mock('@/services/h3', () => ({
  H3TerritorialOrchestrator: { procesarEventoPaseo: jest.fn() },
}))

jest.mock('firebase/firestore', () => ({
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
}))

import { GestorPaseoActivo } from '@/logic/paseos/gestor'
import { ServicioPaseo } from '@/services/firebase'
import { H3TerritorialOrchestrator } from '@/services/h3'
import { coordsAH3 } from '@/services/geo'
import { ESTADOS_PASEO, type Paseo } from '@/models/Paseo'

const mock = (fn: unknown) => fn as jest.Mock
const LAT = 4.6486
const LNG = -74.0628
const CELDA_R9 = coordsAH3(LAT, LNG, 9)

function paseo(estado: ESTADOS_PASEO): Paseo {
  return {
    id: 'p1',
    estado,
    id_cuidador: 'c1',
    mascota_ids: ['m1'],
    ubicacion_inicio: {
      direccion_formateada: 'Calle 1',
      coordenadas: { latitude: LAT, longitude: LNG },
    },
  } as any
}

describe('GestorPaseoActivo: contadores H3', () => {
  let gestor: GestorPaseoActivo

  beforeEach(() => {
    jest.clearAllMocks()
    gestor = new GestorPaseoActivo()
    mock(ServicioPaseo.commitEstadoTransaccional).mockResolvedValue({ success: true })
    mock(ServicioPaseo.actualizar).mockResolvedValue({ success: true })
    mock(ServicioPaseo.registrarEvento).mockResolvedValue({ success: true })
    mock(H3TerritorialOrchestrator.procesarEventoPaseo).mockResolvedValue(true)
  })

  it('la celda r9 de prueba es válida y distinta de la de (0,0)', () => {
    expect(CELDA_R9).toBeTruthy()
    expect(CELDA_R9).not.toBe(coordsAH3(0, 0, 9))
  })

  it('iniciar paseo suma en la celda r9 real del punto de inicio', async () => {
    gestor.setPaseoActivo(paseo(ESTADOS_PASEO.EN_PUNTO_RECOGIDA))

    const res = await gestor.iniciarPaseoAsync()

    expect(res.success).toBe(true)
    expect(ServicioPaseo.commitEstadoTransaccional).toHaveBeenCalledWith(
      'p1',
      ESTADOS_PASEO.EN_PUNTO_RECOGIDA,
      ESTADOS_PASEO.EN_PROGRESO,
      { fecha_inicio_real: 'SERVER_TS' }
    )
    expect(H3TerritorialOrchestrator.procesarEventoPaseo).toHaveBeenCalledWith(
      CELDA_R9,
      'EN_PROGRESO',
      expect.objectContaining({ paseo_uid: 'p1' })
    )
    expect(gestor.getPaseoActivo()?.estado).toBe(ESTADOS_PASEO.EN_PROGRESO)
  })

  it('finalizar paseo resta en la misma celda', async () => {
    gestor.setPaseoActivo(paseo(ESTADOS_PASEO.EN_PROGRESO))

    await gestor.finalizarPaseoAsync()

    expect(H3TerritorialOrchestrator.procesarEventoPaseo).toHaveBeenCalledWith(
      CELDA_R9,
      'COMPLETADO',
      expect.any(Object)
    )
    expect(gestor.getPaseoActivo()?.estado).toBe(ESTADOS_PASEO.FINALIZADO)
  })

  it('cancelar un paseo EN_PROGRESO resta paseos_activos', async () => {
    gestor.setPaseoActivo(paseo(ESTADOS_PASEO.EN_PROGRESO))

    const res = await gestor.cancelarPaseoAsync('MOTIVO')

    expect(res).toEqual({ success: true })
    expect(H3TerritorialOrchestrator.procesarEventoPaseo).toHaveBeenCalledWith(
      CELDA_R9,
      'CANCELADO',
      expect.any(Object)
    )
  })

  it.each([ESTADOS_PASEO.PENDIENTE, ESTADOS_PASEO.CONFIRMADO, ESTADOS_PASEO.EN_CAMINO])(
    'cancelar un paseo %s (no iniciado) NO toca los contadores',
    async estado => {
      gestor.setPaseoActivo(paseo(estado))

      const res = await gestor.cancelarPaseoAsync('MOTIVO')

      expect(res).toEqual({ success: true })
      expect(ServicioPaseo.actualizar).toHaveBeenCalledWith('p1', { estado: 'CANCELADO' })
      expect(H3TerritorialOrchestrator.procesarEventoPaseo).not.toHaveBeenCalled()
    }
  )

  it('cancelar exige motivo', async () => {
    gestor.setPaseoActivo(paseo(ESTADOS_PASEO.PENDIENTE))

    const res = await gestor.cancelarPaseoAsync('')

    expect(res).toEqual({ success: false, error: 'MOTIVO_REQUERIDO' })
    expect(ServicioPaseo.actualizar).not.toHaveBeenCalled()
  })

  it('cancelar un paseo FINALIZADO es una transición inválida', async () => {
    gestor.setPaseoActivo(paseo(ESTADOS_PASEO.FINALIZADO))

    const res = await gestor.cancelarPaseoAsync('MOTIVO')

    expect(res).toEqual({ success: false, error: 'TRANSICION_INVALIDA' })
  })

  it('sin coordenadas de inicio no se registra evento territorial', async () => {
    gestor.setPaseoActivo({ ...paseo(ESTADOS_PASEO.EN_CAMINO), ubicacion_inicio: undefined } as any)

    const res = await gestor.iniciarPaseoAsync()

    expect(res.success).toBe(true)
    expect(H3TerritorialOrchestrator.procesarEventoPaseo).not.toHaveBeenCalled()
  })

  it('si la transacción de estado falla no se toca el territorio ni el estado local', async () => {
    mock(ServicioPaseo.commitEstadoTransaccional).mockResolvedValue({
      success: false,
      error: 'ESTADO_NO_ESPERADO',
    })
    gestor.setPaseoActivo(paseo(ESTADOS_PASEO.EN_PROGRESO))

    const res = await gestor.finalizarPaseoAsync()

    expect(res.success).toBe(false)
    expect(H3TerritorialOrchestrator.procesarEventoPaseo).not.toHaveBeenCalled()
    expect(gestor.getPaseoActivo()?.estado).toBe(ESTADOS_PASEO.EN_PROGRESO)
  })
})
