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

describe('GestorMascotas', () => {
  let Gestor: any
  let ServicioMascota: any
  let ServicioAuth: any

  beforeEach(() => {
    jest.resetModules()
    const svc = require('@/services/firebase')
    ServicioMascota = svc.ServicioMascota
    ServicioAuth = svc.ServicioAuth
    Gestor = require('@/logic/mascotas/gestor').GestorMascotas
    jest.clearAllMocks()
  })

  test('crear devuelve error si no hay usuario', async () => {
    ;(ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue(undefined)
    const res = await Gestor.crear({ nombre: 'X' })
    expect(res.success).toBe(false)
  })

  test('crear falla si creado_por no coincide', async () => {
    ;(ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue({
      uid: 'u1',
    })
    const res = await Gestor.crear({ creado_por: 'u2' } as any)
    expect(res.success).toBe(false)
  })

  test('crear delega a ServicioMascota.crear cuando es válido', async () => {
    ;(ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue({
      uid: 'u1',
    })
    const mockRes = { success: true, data: { id: 'm1', nombre: 'X' } }
    ;(ServicioMascota.crear as jest.Mock).mockResolvedValue(mockRes)

    const res = await Gestor.crear({ nombre: 'X' })
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

  test('actualizar delega', async () => {
    const mockRes = { success: true }
    ;(ServicioMascota.actualizar as jest.Mock).mockResolvedValue(mockRes)
    const res = await Gestor.actualizar('m1', { nombre: 'Y' })
    expect(ServicioMascota.actualizar).toHaveBeenCalledWith('m1', {
      nombre: 'Y',
    })
    expect(res).toEqual(mockRes)
  })

  test('eliminar delega', async () => {
    const mockRes = { success: true }
    ;(ServicioMascota.eliminar as jest.Mock).mockResolvedValue(mockRes)
    const res = await Gestor.eliminar('m1')
    expect(ServicioMascota.eliminar).toHaveBeenCalledWith('m1')
    expect(res).toEqual(mockRes)
  })
})
