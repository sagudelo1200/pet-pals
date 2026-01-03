/* eslint-env jest */

jest.mock('@/services/firebase', () => ({
  ServicioUbicacion: {
    buscarPorProveedorPlaceId: jest.fn(),
    crear: jest.fn(),
    obtenerPorId: jest.fn(),
  },
}))

describe('GestorUbicaciones', () => {
  let Gestor: any
  let ServicioUbicacion: any

  beforeEach(() => {
    jest.resetModules()
    const svc = require('@/services/firebase')
    ServicioUbicacion = svc.ServicioUbicacion
    Gestor = require('@/logic/ubicaciones/gestor').GestorUbicaciones
    jest.clearAllMocks()
  })

  test('obtenerClaveI18nErrorUbicacion mapea errores correctamente', () => {
    expect(Gestor.obtenerClaveI18nErrorUbicacion('PROVEEDOR_INVALIDO')).toBe(
      'ubicaciones:errores.proveedor_invalido'
    )
    expect(
      Gestor.obtenerClaveI18nErrorUbicacion('COORDENADAS_REQUERIDAS')
    ).toBe('ubicaciones:errores.coordenadas_requeridas')
    expect(Gestor.obtenerClaveI18nErrorUbicacion(null)).toBeNull()
  })

  test('crearSiNoExiste devuelve existente si busca encuentra', async () => {
    const existing = { id: 'u1', direccion_formateada: 'X' }
    ;(
      ServicioUbicacion.buscarPorProveedorPlaceId as jest.Mock
    ).mockResolvedValue({
      success: true,
      data: existing,
    })

    const res = await Gestor.crearSiNoExiste({
      proveedor: 'google',
      proveedor_place_id: 'p1',
      direccion_formateada: 'X',
      coordenadas: { latitude: 1, longitude: 2 },
    })

    expect(res.success).toBe(true)
    expect(res.data).toEqual(existing)
    expect(ServicioUbicacion.crear).not.toHaveBeenCalled()
  })

  test('crearSiNoExiste valida y delega a ServicioUbicacion.crear cuando no existe', async () => {
    ;(
      ServicioUbicacion.buscarPorProveedorPlaceId as jest.Mock
    ).mockResolvedValue({
      success: true,
      data: null,
    })
    ;(ServicioUbicacion.crear as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'nuevo' },
    })

    const payload = {
      proveedor: 'google',
      proveedor_place_id: 'p2',
      direccion_formateada: 'Y',
      coordenadas: { latitude: 3, longitude: 4 },
      componentes_raw: [
        { long_name: 'Cra 1', types: ['route'] },
        { long_name: '45', types: ['street_number'] },
      ],
      alias: 'Casa',
    }

    const res = await Gestor.crearSiNoExiste(payload as any)

    expect(res.success).toBe(true)
    expect(ServicioUbicacion.crear).toHaveBeenCalled()
    expect(res.data).toEqual({ id: 'nuevo' })
  })
})
