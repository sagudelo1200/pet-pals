/* eslint-env jest */
// Tests para ServicioMascota
// - Mockeamos ServicioAuth y ServicioCrudBase para pruebas unitarias
const MOCK_ERR = {
  COMUN: {
    NO_AUTENTICADO: 'NO_AUTENTICADO',
    DOCUMENTO_NO_ENCONTRADO: 'DOCUMENTO_NO_ENCONTRADO',
  },
  MASCOTAS: { TUTOR_NO_COINCIDE: 'TUTOR_NO_COINCIDE' },
}

jest.mock('@/constants', () => ({ ERR: MOCK_ERR }))

// Mock the concrete modules that ServicioMascota depends on so we test only its logic.
jest.mock('@/services/firebase/firestore/base', () => ({
  ServicioCrudBase: {
    crear: jest.fn(),
    obtenerPorId: jest.fn(),
    obtenerTodos: jest.fn(),
    buscar: jest.fn(),
    actualizar: jest.fn(),
    eliminar: jest.fn(),
  },
}))

jest.mock('@/services/firebase/auth/auth', () => ({
  ServicioAuth: {
    obtenerUsuarioActual: jest.fn(),
  },
}))

const { ServicioCrudBase } = require('@/services/firebase/firestore/base')

// Require the real implementation of ServicioMascota
const {
  ServicioMascota,
} = require('@/services/firebase/firestore/colecciones/mascota')

describe('ServicioMascota - unitario', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Si no hay usuario autenticado, crear debe fallar con NO_AUTENTICADO
  // Debe delegar en ServicioCrudBase.crear y devolver su resultado
  test('crear delega en ServicioCrudBase.crear y retorna resultado', async () => {
    const created = {
      success: true,
      data: { id: 'm1', nombre: 'Fido', especie: 'perro' },
    }
    ServicioCrudBase.crear.mockResolvedValue(created)

    const payload = { nombre: 'Fido', especie: 'perro' }
    const res = await ServicioMascota.crear(payload)
    expect(ServicioCrudBase.crear).toHaveBeenCalled()
    // el segundo argumento pasado a crear debe ser el payload tal cual
    const callArgs = ServicioCrudBase.crear.mock.calls[0]
    expect(callArgs[0]).toBe('mascotas')
    expect(callArgs[1]).toEqual(payload)
    expect(res).toEqual(created)
  })

  // obtenerPorId delega al ServicioCrudBase.obtenerPorId
  test('obtenerPorId delega a ServicioCrudBase.obtenerPorId', async () => {
    const out = { success: true, data: { id: 'm1', nombre: 'Fido' } }
    ServicioCrudBase.obtenerPorId.mockResolvedValue(out)
    const res = await ServicioMascota.obtenerPorId('m1')
    expect(ServicioCrudBase.obtenerPorId).toHaveBeenCalledWith('mascotas', 'm1')
    expect(res).toEqual(out)
  })

  // obtenerPorUsuario utiliza buscar con el campo creado_por
  test('obtenerPorUsuario usa buscar con creado_por', async () => {
    const ures = { success: true, data: [{ id: 'm1', nombre: 'Fido' }] }
    ServicioCrudBase.buscar.mockResolvedValue(ures)
    const res = await ServicioMascota.obtenerPorUsuario('u1')
    expect(ServicioCrudBase.buscar).toHaveBeenCalledWith(
      'mascotas',
      'creado_por',
      'u1'
    )
    expect(res).toEqual(ures)
  })

  // actualizar delega a ServicioCrudBase.actualizar
  test('actualizar delega a ServicioCrudBase.actualizar', async () => {
    const updated = {
      success: true,
      data: { id: 'm1', nombre: 'Fido actualizado' },
    }
    ServicioCrudBase.actualizar.mockResolvedValue(updated)
    const payload = { nombre: 'Fido actualizado' }
    const res = await ServicioMascota.actualizar('m1', payload)
    expect(ServicioCrudBase.actualizar).toHaveBeenCalledWith(
      'mascotas',
      'm1',
      payload
    )
    expect(res).toEqual(updated)
  })

  // eliminar delega a ServicioCrudBase.eliminar
  test('eliminar delega a ServicioCrudBase.eliminar', async () => {
    const out = { success: true, data: true }
    ServicioCrudBase.eliminar.mockResolvedValue(out)
    const res = await ServicioMascota.eliminar('m1')
    expect(ServicioCrudBase.eliminar).toHaveBeenCalledWith('mascotas', 'm1')
    expect(res).toEqual(out)
  })

  // Nota: la lógica de ownership/defaults se mueve a logic/mascotas (gestor). Aqui solo verificamos delegación.
})
