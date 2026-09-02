/* eslint-env jest */

jest.mock('@/services/firebase', () => ({
  ServicioAuth: {
    obtenerUsuarioActual: jest.fn(),
  },
  ServicioCrudBase: {
    obtenerPorId: jest.fn(),
  },
  ServicioPaseo: {
    crear: jest.fn(),
  },
  ServicioPaseoMascota: {
    commitMascotasBatch: jest.fn(),
  },
}))

describe('crearConMascotas', () => {
  let ServicioAuth: any
  let ServicioCrudBase: any
  let ServicioPaseo: any
  let ServicioPaseoMascota: any
  let crearConMascotas: any
  let ERR: any

  beforeEach(() => {
    jest.resetModules()
    const sv = require('@/services/firebase')
    ServicioAuth = sv.ServicioAuth
    ServicioCrudBase = sv.ServicioCrudBase
    ServicioPaseo = sv.ServicioPaseo
    ServicioPaseoMascota = sv.ServicioPaseoMascota

    const gestor = require('@/logic/paseos/casosDeUso')
    crearConMascotas = gestor.crearConMascotas
    ERR = require('@/constants').ERR

    jest.clearAllMocks()
  })

  test('devuelve error si no hay usuario', async () => {
    void (ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue(
      undefined
    )
    const res = await crearConMascotas({} as any, [])
    expect(res.success).toBe(false)
    expect(res.error).toBe(ERR.COMUN.NO_AUTENTICADO)
  })

  test('error si supera limite de mascotas segun cupo', async () => {
    void (ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue({
      uid: 'u1',
    })
    const data = { cupo_maximo_mascotas: 1 }
    const mascotaIds = ['m1', 'm2']
    const res = await crearConMascotas(data as any, mascotaIds)
    expect(res.success).toBe(false)
    expect(res.error).toBe(ERR.PASEOS.LIMITE_DE_MASCOTAS_SUPERADO)
  })

  test('error si mascota no pertenece al usuario', async () => {
    void (ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue({
      uid: 'u1',
    })
    void (ServicioCrudBase.obtenerPorId as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'm1', creado_por: 'otro' },
    })

    const res = await crearConMascotas({} as any, ['m1'])
    expect(res.success).toBe(false)
    expect(res.error).toBe(ERR.MASCOTAS.MASCOTA_NO_PERTENECE_AL_USUARIO)
  })

  test('error coordenadas invalidas (NaN)', async () => {
    void (ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue({
      uid: 'u1',
    })
    const data = {
      ubicacion_inicio: {
        coordenadas: { latitude: 'nope', longitude: 'nope' },
      },
    }
    const res = await crearConMascotas(data as any, [])
    expect(res.success).toBe(false)
    expect(res.error).toBe(ERR.PASEOS.COORDENADAS_INVALIDAS)
  })

  test('happy path: crea paseo y batch mascotas', async () => {
    void (ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue({
      uid: 'u1',
    })
    void (ServicioCrudBase.obtenerPorId as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'm1', creado_por: 'u1', nombre: 'Fido', foto: 'f.jpg' },
    })

    const paseoMock = { success: true, data: { id: 'p1' } }
    void (ServicioPaseo.crear as jest.Mock).mockResolvedValue(paseoMock)
    void (
      ServicioPaseoMascota.commitMascotasBatch as jest.Mock
    ).mockResolvedValue({
      success: true,
    })

    const data = {
      tipo_paseo: 'solicitado',
      estado: 'PENDIENTE',
      fecha_hora_inicio: new Date(),
      duracion_estimada: 60,
      precio: 10000,
    }

    const res = await crearConMascotas(data as any, ['m1'])
    expect(ServicioPaseo.crear).toHaveBeenCalled()
    expect(ServicioPaseoMascota.commitMascotasBatch).toHaveBeenCalled()
    expect(res.success).toBe(true)
    expect(res.data).toEqual(paseoMock.data)
  })
})
