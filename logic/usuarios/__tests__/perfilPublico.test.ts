/* eslint-env jest */
/**
 * Sincronización del perfil del cuidador con el índice de cobertura H3.
 * El índice es lo que consulta el matching del tutor: debe escribirse la
 * primera vez, migrarse al cambiar de zona y refrescarse si cambia el horario.
 */

jest.mock('@/services/firebase/firestore/colecciones/perfiles_publicos', () => ({
  ServicioPerfilPublico: { guardarConId: jest.fn(), obtenerPorId: jest.fn() },
}))
jest.mock('@/services/firebase/firestore/base', () => ({
  ServicioCrudBase: { obtenerPorId: jest.fn() },
}))
jest.mock('@/services/firebase/firestore/colecciones/indice_cobertura', () => ({
  ServicioIndiceCobertura: { obtenerCuidadoresPorCelda: jest.fn() },
}))
jest.mock('@/services/h3', () => ({
  H3TerritorialOrchestrator: {
    procesarCambioCobertura: jest.fn(),
    procesarCambioCoberturaManuales: jest.fn(),
  },
}))

import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { ServicioPerfilPublico } from '@/services/firebase/firestore/colecciones/perfiles_publicos'
import { ServicioCrudBase } from '@/services/firebase/firestore/base'
import { ServicioIndiceCobertura } from '@/services/firebase/firestore/colecciones/indice_cobertura'
import { H3TerritorialOrchestrator } from '@/services/h3'
import { celdasDeCobertura, coordsAH3 } from '@/services/geo'

const mock = (fn: unknown) => fn as jest.Mock
const H3_A = coordsAH3(4.6486, -74.0628) as string
const H3_B = coordsAH3(4.711, -74.0721) as string
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
    mock(H3TerritorialOrchestrator.procesarCambioCobertura).mockResolvedValue(true)
    mock(H3TerritorialOrchestrator.procesarCambioCoberturaManuales).mockResolvedValue(true)
  })

  it('sin uid devuelve NO_AUTENTICADO', async () => {
    const res = await GestorPerfilPublico.actualizarCoberturaYPerfil('', {}, H3_A)
    expect(res).toEqual({ success: false, error: 'NO_AUTENTICADO' })
  })

  it('primera vez (sin zona previa): escribe la cobertura en el índice', async () => {
    perfilActual({})

    await GestorPerfilPublico.actualizarCoberturaYPerfil('c1', { horario_semanal: HORARIO }, H3_A)

    expect(H3TerritorialOrchestrator.procesarCambioCobertura).toHaveBeenCalledWith(
      'c1',
      H3_A,
      undefined,
      expect.objectContaining({ nombre: 'Ana', horario_semanal: HORARIO })
    )
    expect(ServicioPerfilPublico.guardarConId).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ h3_r8: H3_A, horario_semanal: HORARIO })
    )
  })

  it('cambio de zona: migra la cobertura de la zona anterior a la nueva', async () => {
    perfilActual({ h3_r8: H3_A })

    await GestorPerfilPublico.actualizarCoberturaYPerfil('c1', {}, H3_B)

    expect(H3TerritorialOrchestrator.procesarCambioCobertura).toHaveBeenCalledWith(
      'c1',
      H3_B,
      H3_A,
      expect.any(Object)
    )
    expect(H3TerritorialOrchestrator.procesarCambioCoberturaManuales).not.toHaveBeenCalled()
  })

  it('misma zona: refresca los datos en las mismas celdas sin alterar contadores', async () => {
    perfilActual({ h3_r8: H3_A, horario_semanal: { '2': { inicio: '09:00', fin: '10:00' } } })

    await GestorPerfilPublico.actualizarCoberturaYPerfil('c1', { horario_semanal: HORARIO }, H3_A)

    const celdas = celdasDeCobertura(H3_A)
    expect(H3TerritorialOrchestrator.procesarCambioCoberturaManuales).toHaveBeenCalledWith(
      'c1',
      H3_A,
      celdas,
      celdas,
      expect.objectContaining({ horario_semanal: HORARIO })
    )
    expect(H3TerritorialOrchestrator.procesarCambioCobertura).not.toHaveBeenCalled()
  })

  it('misma zona con celdas manuales: respeta las celdas elegidas por el cuidador', async () => {
    perfilActual({ h3_r8: H3_A, celdas_cobertura: [H3_A, H3_B] })

    await GestorPerfilPublico.actualizarCoberturaYPerfil('c1', {}, H3_A)

    expect(H3TerritorialOrchestrator.procesarCambioCoberturaManuales).toHaveBeenCalledWith(
      'c1',
      H3_A,
      [H3_A, H3_B],
      [H3_A, H3_B],
      expect.any(Object)
    )
  })

  it('sin h3 (cuidador sin dirección): solo guarda el perfil', async () => {
    await GestorPerfilPublico.actualizarCoberturaYPerfil('c1', { biografia: 'hola' } as any, null)

    expect(ServicioCrudBase.obtenerPorId).not.toHaveBeenCalled()
    expect(H3TerritorialOrchestrator.procesarCambioCobertura).not.toHaveBeenCalled()
    expect(ServicioPerfilPublico.guardarConId).toHaveBeenCalledWith('c1', { biografia: 'hola' })
  })

  it('si el índice falla, el perfil se guarda igual', async () => {
    perfilActual({})
    mock(H3TerritorialOrchestrator.procesarCambioCobertura).mockResolvedValue(false)

    const res = await GestorPerfilPublico.actualizarCoberturaYPerfil('c1', {}, H3_A)

    expect(res.success).toBe(true)
    expect(ServicioPerfilPublico.guardarConId).toHaveBeenCalled()
  })

  it('no envía undefined al índice (foto e insignias solo si existen)', async () => {
    perfilActual({})

    await GestorPerfilPublico.actualizarCoberturaYPerfil('c1', {}, H3_A)

    const datos = mock(H3TerritorialOrchestrator.procesarCambioCobertura).mock.calls[0][3]
    expect(datos).not.toHaveProperty('foto')
    expect(datos).not.toHaveProperty('insignias_verificacion')
    expect(Object.values(datos).every(v => v !== undefined)).toBe(true)
  })
})

describe('GestorPerfilPublico.actualizarCeldasCobertura', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mock(ServicioPerfilPublico.guardarConId).mockResolvedValue({ success: true })
    mock(H3TerritorialOrchestrator.procesarCambioCoberturaManuales).mockResolvedValue(true)
  })

  it('exige que el cuidador tenga zona de origen', async () => {
    perfilActual({})

    const res = await GestorPerfilPublico.actualizarCeldasCobertura('c1', [H3_A])

    expect(res.success).toBe(false)
    expect(H3TerritorialOrchestrator.procesarCambioCoberturaManuales).not.toHaveBeenCalled()
  })

  it('reemplaza las celdas por defecto con las elegidas y las guarda en el perfil', async () => {
    perfilActual({ h3_r8: H3_A })

    await GestorPerfilPublico.actualizarCeldasCobertura('c1', [H3_B])

    expect(H3TerritorialOrchestrator.procesarCambioCoberturaManuales).toHaveBeenCalledWith(
      'c1',
      H3_A,
      [H3_B],
      celdasDeCobertura(H3_A),
      expect.any(Object)
    )
    expect(ServicioPerfilPublico.guardarConId).toHaveBeenCalledWith('c1', {
      celdas_cobertura: [H3_B],
    })
  })
})

describe('GestorPerfilPublico.obtenerCuidadoresPorH3', () => {
  it('solo devuelve cuidadores con identidad verificada', async () => {
    const entrada = (uid: string, insignias?: string[]) => ({
      uid,
      insignias_verificacion: insignias,
    })
    mock(ServicioIndiceCobertura.obtenerCuidadoresPorCelda).mockResolvedValue({
      success: true,
      data: [
        entrada('a', ['EMAIL', 'IDENTIDAD']),
        entrada('b', ['EMAIL']),
        entrada('c'),
      ],
    })

    const res = await GestorPerfilPublico.obtenerCuidadoresPorH3(H3_A)

    expect(res.data?.map(c => c.uid)).toEqual(['a'])
  })
})
