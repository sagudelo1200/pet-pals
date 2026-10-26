/* eslint-env jest */
/**
 * Ser cuidador no se asigna desde la app: lo otorga el servidor al aprobar la
 * habilitación. Los demás roles siguen como antes.
 */
jest.mock('@/services/firebase', () => ({
  ServicioUsuario: { obtenerPorId: jest.fn(), actualizar: jest.fn() },
}))

import { GestorUsuarios, CODIGOS_ERROR_USUARIO } from '@/logic/usuarios/gestor'
import { ServicioUsuario } from '@/services/firebase'

const mock = (fn: unknown) => fn as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mock(ServicioUsuario.obtenerPorId).mockResolvedValue({
    success: true,
    data: { id: 'u1', nombre: 'Ana', roles: ['tutor'] },
  })
  mock(ServicioUsuario.actualizar).mockResolvedValue({ success: true })
})

describe('GestorUsuarios.agregarRol', () => {
  it('cuidador exige habilitación y no toca nada', async () => {
    const res = await GestorUsuarios.agregarRol('u1', 'cuidador')
    expect(res).toEqual({
      success: false,
      error: CODIGOS_ERROR_USUARIO.REQUIERE_HABILITACION,
    })
    expect(ServicioUsuario.obtenerPorId).not.toHaveBeenCalled()
    expect(ServicioUsuario.actualizar).not.toHaveBeenCalled()
  })

  it('explorador se agrega a los roles actuales', async () => {
    const res = await GestorUsuarios.agregarRol('u1', 'explorador')
    expect(res.success).toBe(true)
    expect(ServicioUsuario.actualizar).toHaveBeenCalledWith('u1', {
      roles: ['tutor', 'explorador'],
    })
  })

  it('un rol que ya tiene no se repite', async () => {
    const res = await GestorUsuarios.agregarRol('u1', 'tutor')
    expect(res.success).toBe(true)
    expect(ServicioUsuario.actualizar).not.toHaveBeenCalled()
  })

  it('admin no se combina con tutor', async () => {
    const res = await GestorUsuarios.agregarRol('u1', 'admin')
    expect(res).toEqual({ success: false, error: 'ADMIN_EXCLUSIVO' })
  })
})
