/* eslint-env jest */

jest.mock('@/services/firebase', () => ({
  ServicioMascota: {
    crear: jest.fn(),
    obtenerPorUsuario: jest.fn(),
    obtenerPorId: jest.fn(),
    actualizar: jest.fn(),
    eliminar: jest.fn(),
  },
  ServicioAuth: {
    obtenerUsuarioActual: jest.fn(),
  },
}))

describe('gestorMascota', () => {
  let Gestor: typeof import('@/logic/mascotas/gestorMascota')
  let ServicioMascota: any
  let ServicioAuth: any

  beforeEach(() => {
    jest.resetModules()
    const svc = require('@/services/firebase')
    ServicioMascota = svc.ServicioMascota
    ServicioAuth = svc.ServicioAuth
    Gestor = require('@/logic/mascotas/gestorMascota')
    jest.clearAllMocks()
  })

  test('crearMascota devuelve error si no hay usuario', async () => {
    ;(ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue(undefined)
    const res = await Gestor.crearMascota({ nombre: 'X' })
    expect(res.success).toBe(false)
  })

  test('crearMascota falla si creado_por no coincide', async () => {
    ;(ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue({
      uid: 'u1',
    })
    const res = await Gestor.crearMascota({ creado_por: 'u2' } as any)
    expect(res.success).toBe(false)
  })

  test('crearMascota delega a ServicioMascota.crear cuando es válido', async () => {
    ;(ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue({
      uid: 'u1',
    })
    const mockRes = { success: true, data: { id: 'm1', nombre: 'X' } }
    ;(ServicioMascota.crear as jest.Mock).mockResolvedValue(mockRes)

    const res = await Gestor.crearMascota({ nombre: 'X' })
    expect(ServicioMascota.crear).toHaveBeenCalled()
    expect(res).toEqual(mockRes)
  })

  test('obtenerPorUsuario delega', async () => {
    const mockRes = { success: true, data: [{ id: 'm1' }] }
    ;(ServicioMascota.obtenerPorUsuario as jest.Mock).mockResolvedValue(mockRes)
    const res = await Gestor.obtenerPorUsuario('u1')
    expect(ServicioMascota.obtenerPorUsuario).toHaveBeenCalledWith('u1')
    expect(res).toEqual(mockRes)
  })

  test('obtenerPorId delega', async () => {
    const mockRes = { success: true, data: { id: 'm1' } }
    ;(ServicioMascota.obtenerPorId as jest.Mock).mockResolvedValue(mockRes)
    const res = await Gestor.obtenerPorId('m1')
    expect(ServicioMascota.obtenerPorId).toHaveBeenCalledWith('m1')
    expect(res).toEqual(mockRes)
  })

  test('actualizarMascota delega', async () => {
    const mockRes = { success: true }
    ;(ServicioMascota.actualizar as jest.Mock).mockResolvedValue(mockRes)
    const res = await Gestor.actualizarMascota('m1', { nombre: 'Y' })
    expect(ServicioMascota.actualizar).toHaveBeenCalledWith('m1', {
      nombre: 'Y',
    })
    expect(res).toEqual(mockRes)
  })

  test('eliminarMascota delega', async () => {
    const mockRes = { success: true }
    ;(ServicioMascota.eliminar as jest.Mock).mockResolvedValue(mockRes)
    const res = await Gestor.eliminarMascota('m1')
    expect(ServicioMascota.eliminar).toHaveBeenCalledWith('m1')
    expect(res).toEqual(mockRes)
  })
})
