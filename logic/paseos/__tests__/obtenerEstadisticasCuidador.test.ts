/* eslint-env jest */

jest.mock('@/services/firebase', () => ({
  ServicioAuth: { obtenerUsuarioActual: jest.fn() },
  ServicioCrudBase: {},
  ServicioPaseo: { buscarPaseos: jest.fn() },
  ServicioPaseoMascota: {},
  ServicioResumenEvaluacion: { obtenerPorObjetivo: jest.fn() },
}))

// casosDeUso importa helpers de firestore a nivel de módulo; se mockean para
// no cargar el SDK real (mismo patrón que gestor.crearConMascotas.test.ts).
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
}))

describe('obtenerEstadisticasCuidador', () => {
  let ServicioPaseo: any
  let ServicioResumenEvaluacion: any
  let obtenerEstadisticasCuidador: any

  beforeEach(() => {
    jest.resetModules()
    const sv = require('@/services/firebase')
    ServicioPaseo = sv.ServicioPaseo
    ServicioResumenEvaluacion = sv.ServicioResumenEvaluacion

    const gestor = require('@/logic/paseos/casosDeUso')
    obtenerEstadisticasCuidador = gestor.obtenerEstadisticasCuidador

    jest.clearAllMocks()
  })

  const paseosOk = (data: any[]) => ({ success: true, data })

  test('devuelve error si falla la búsqueda de paseos', async () => {
    (ServicioPaseo.buscarPaseos as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'FALLO_BUSQUEDA',
    })

    const res = await obtenerEstadisticasCuidador('c1')
    expect(res.success).toBe(false)
    expect(res.error).toBe('FALLO_BUSQUEDA')
  })

  test('cuenta solicitudes (solo sin cuidador), activos y completados', async () => {
    (ServicioPaseo.buscarPaseos as jest.Mock)
      .mockResolvedValueOnce(
        paseosOk([
          { id: 'a', estado: 'PENDIENTE' },
          { id: 'b', estado: 'PENDIENTE', id_cuidador: 'c1' }, // ya asignado → no cuenta
        ])
      )
      .mockResolvedValueOnce(
        paseosOk([
          { id: 'c', estado: 'CONFIRMADO' },
          { id: 'd', estado: 'EN_PROGRESO' },
          { id: 'g', estado: 'EN_CAMINO' },
          { id: 'e', estado: 'FINALIZADO' },
          { id: 'f', estado: 'COMPLETADO' },
        ])
      )
    ;(ServicioResumenEvaluacion.obtenerPorObjetivo as jest.Mock).mockResolvedValueOnce(
      {
        success: true,
        data: { evaluaciones_cuidador: { promedio: 4.5, cantidad: 2 } },
      }
    )

    const res = await obtenerEstadisticasCuidador('c1')
    expect(res.success).toBe(true)
    expect(res.data.solicitudesPendientes).toBe(1)
    expect(res.data.paseosActivos).toBe(3) // CONFIRMADO + EN_CAMINO + EN_PROGRESO
    expect(res.data.paseosCompletados).toBe(2) // FINALIZADO + COMPLETADO
    expect(res.data.valoracionPromedio).toBe(4.5)
  })

  test('valoracionPromedio es 0 si el resumen no existe (success false)', async () => {
    (ServicioPaseo.buscarPaseos as jest.Mock)
      .mockResolvedValueOnce(paseosOk([]))
      .mockResolvedValueOnce(paseosOk([]))
    ;(ServicioResumenEvaluacion.obtenerPorObjetivo as jest.Mock).mockResolvedValueOnce(
      { success: false, error: 'Resumen de evaluaciones no encontrado' }
    )

    const res = await obtenerEstadisticasCuidador('c1')
    expect(res.success).toBe(true)
    expect(res.data.valoracionPromedio).toBe(0)
  })

  test('valoracionPromedio es 0 si la cantidad de evaluaciones es 0', async () => {
    (ServicioPaseo.buscarPaseos as jest.Mock)
      .mockResolvedValueOnce(paseosOk([]))
      .mockResolvedValueOnce(paseosOk([]))
    ;(ServicioResumenEvaluacion.obtenerPorObjetivo as jest.Mock).mockResolvedValueOnce(
      {
        success: true,
        data: { evaluaciones_cuidador: { promedio: 4.5, cantidad: 0 } },
      }
    )

    const res = await obtenerEstadisticasCuidador('c1')
    expect(res.data.valoracionPromedio).toBe(0)
  })

  test('valoracionPromedio es 0 si el resumen no trae desglose', async () => {
    (ServicioPaseo.buscarPaseos as jest.Mock)
      .mockResolvedValueOnce(paseosOk([]))
      .mockResolvedValueOnce(paseosOk([]))
    ;(ServicioResumenEvaluacion.obtenerPorObjetivo as jest.Mock).mockResolvedValueOnce(
      { success: true, data: {} }
    )

    const res = await obtenerEstadisticasCuidador('c1')
    expect(res.data.valoracionPromedio).toBe(0)
  })
})
