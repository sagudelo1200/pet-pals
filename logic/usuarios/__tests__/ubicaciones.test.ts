/* eslint-env jest */
/**
 * Al cambiar la dirección principal, el perfil público (origen del cuidador)
 * la sigue; también cuando la principal se borra y otra la reemplaza.
 */
jest.mock('@/services/firebase', () => ({
  ServicioUsuario: { obtenerPorId: jest.fn(), actualizar: jest.fn() },
}))
jest.mock('@/logic/usuarios/perfilPublico', () => ({
  GestorPerfilPublico: { actualizar: jest.fn() },
}))

import { GestorUsuarios } from '@/logic/usuarios/gestor'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { ServicioUsuario } from '@/services/firebase'

const mock = (fn: unknown) => fn as jest.Mock
const ref = (id: string, h3_r8: string | undefined, es_principal: boolean) => ({
  ubicacion_id: id,
  alias: id,
  h3_r8,
  es_principal,
})

function usuarioCon(ubicaciones: ReturnType<typeof ref>[]) {
  mock(ServicioUsuario.obtenerPorId).mockResolvedValue({
    success: true,
    data: { id: 'u1', ubicaciones },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mock(ServicioUsuario.actualizar).mockResolvedValue({ success: true })
})

describe('GestorUsuarios.eliminarUbicacion', () => {
  it('si borra la principal, el perfil público pasa a la zona de la nueva', async () => {
    usuarioCon([ref('a', 'h3a', true), ref('b', 'h3b', false)])

    const res = await GestorUsuarios.eliminarUbicacion('u1', 'a')

    expect(res.success).toBe(true)
    expect(GestorPerfilPublico.actualizar).toHaveBeenCalledWith('u1', { h3_r8: 'h3b' })
  })

  it('si borra una que no es la principal, no toca el perfil público', async () => {
    usuarioCon([ref('a', 'h3a', true), ref('b', 'h3b', false)])

    await GestorUsuarios.eliminarUbicacion('u1', 'b')

    expect(GestorPerfilPublico.actualizar).not.toHaveBeenCalled()
  })

  it('si no queda ninguna dirección no hay zona nueva que sincronizar', async () => {
    usuarioCon([ref('a', 'h3a', true)])

    await GestorUsuarios.eliminarUbicacion('u1', 'a')

    expect(GestorPerfilPublico.actualizar).not.toHaveBeenCalled()
  })

  it('si no pudo guardar al usuario, no cambia el perfil público', async () => {
    usuarioCon([ref('a', 'h3a', true), ref('b', 'h3b', false)])
    mock(ServicioUsuario.actualizar).mockResolvedValue({ success: false, error: 'x' })

    const res = await GestorUsuarios.eliminarUbicacion('u1', 'a')

    expect(res.success).toBe(false)
    expect(GestorPerfilPublico.actualizar).not.toHaveBeenCalled()
  })
})
