/* eslint-env jest */
/**
 * El perfil del cuidador guarda su zona y sus celdas de cobertura. La app NO
 * escribe el índice de cobertura ni la oferta de la zona: las mantiene el
 * servidor a partir del perfil (functions/src/territorio).
 */

jest.mock('@/services/firebase/firestore/colecciones/perfiles_publicos', () => ({
  ServicioPerfilPublico: { guardarConId: jest.fn(), obtenerPorId: jest.fn() },
}))
jest.mock('@/services/firebase/firestore/base', () => ({
  ServicioCrudBase: { obtenerPorId: jest.fn() },
}))

import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { ServicioPerfilPublico } from '@/services/firebase/firestore/colecciones/perfiles_publicos'
import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { coordsAH3 } from '@/services/geo'

const mock = (fn: unknown) => fn as jest.Mock
const H3_A = coordsAH3(4.6486, -74.0628)
const H3_B = coordsAH3(4.711, -74.0721)
const HORARIO = { '1': { inicio: '08:00', fin: '12:00' } }

function perfilActual(data: Record<string, unknown> | null) {
  mock(ServicioCrudBase.obtenerPorId).mockResolvedValue(
    data ? { success: true, data: { id: 'c1', nombre: 'Ana', ...data } } : { success: false }
  )
}

describe('GestorPerfilPublico.actualizarCoberturaYPerfil', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mock(ServicioPerfilPublico.guardarConId).mockResolvedValue({ success: true })
  })

  it('sin uid devuelve NO_AUTENTICADO', async () => {
    const res = await GestorPerfilPublico.actualizarCoberturaYPerfil('', {}, H3_A)
    expect(res).toEqual({ success: false, error: 'NO_AUTENTICADO' })
    expect(ServicioPerfilPublico.guardarConId).not.toHaveBeenCalled()
  })

  it('guarda el perfil con su zona de origen; el servidor arma el índice', async () => {
    await GestorPerfilPublico.actualizarCoberturaYPerfil(
      'c1',
      { horario_semanal: HORARIO },
      H3_A
    )

    expect(ServicioPerfilPublico.guardarConId).toHaveBeenCalledTimes(1)
    expect(ServicioPerfilPublico.guardarConId).toHaveBeenCalledWith('c1', {
      horario_semanal: HORARIO,
      h3_r8: H3_A,
    })
  })

  it('cambio de zona: solo cambia el origen del perfil (el servidor migra el índice)', async () => {
    await GestorPerfilPublico.actualizarCoberturaYPerfil('c1', {}, H3_B)

    expect(ServicioPerfilPublico.guardarConId).toHaveBeenCalledWith('c1', {
      h3_r8: H3_B,
    })
  })

  it('sin h3 (cuidador sin dirección): solo guarda el perfil', async () => {
    await GestorPerfilPublico.actualizarCoberturaYPerfil(
      'c1',
      { biografia: 'hola' } as any,
      null
    )

    expect(ServicioPerfilPublico.guardarConId).toHaveBeenCalledWith('c1', {
      biografia: 'hola',
    })
  })

  it('devuelve el error si no se pudo guardar el perfil', async () => {
    mock(ServicioPerfilPublico.guardarConId).mockResolvedValue({
      success: false,
      error: 'PERMISOS',
    })
    const res = await GestorPerfilPublico.actualizarCoberturaYPerfil('c1', {}, H3_A)
    expect(res).toEqual({ success: false, error: 'PERMISOS' })
  })
})

describe('GestorPerfilPublico.actualizarCeldasCobertura', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mock(ServicioPerfilPublico.guardarConId).mockResolvedValue({ success: true })
  })

  it('exige que el cuidador tenga zona de origen', async () => {
    perfilActual({})

    const res = await GestorPerfilPublico.actualizarCeldasCobertura('c1', [H3_A])

    expect(res.success).toBe(false)
    expect(ServicioPerfilPublico.guardarConId).not.toHaveBeenCalled()
  })

  it('un perfil que no existe no se puede actualizar', async () => {
    perfilActual(null)
    const res = await GestorPerfilPublico.actualizarCeldasCobertura('c1', [H3_A])
    expect(res).toEqual({ success: false, error: 'Perfil no encontrado' })
  })

  it('guarda las celdas elegidas en el perfil, junto a su origen', async () => {
    perfilActual({ h3_r8: H3_A })

    await GestorPerfilPublico.actualizarCeldasCobertura('c1', [H3_B])

    expect(ServicioPerfilPublico.guardarConId).toHaveBeenCalledWith('c1', {
      celdas_cobertura: [H3_B],
      h3_r8: H3_A,
    })
  })

  it('si el perfil aún no tiene origen, usa el de la dirección principal', async () => {
    perfilActual({})

    await GestorPerfilPublico.actualizarCeldasCobertura('c1', [H3_B], H3_A)

    expect(ServicioPerfilPublico.guardarConId).toHaveBeenCalledWith('c1', {
      celdas_cobertura: [H3_B],
      h3_r8: H3_A,
    })
  })
})
