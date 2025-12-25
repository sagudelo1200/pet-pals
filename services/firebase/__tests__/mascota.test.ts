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

jest.mock('@/services/firebase/auth', () => ({
  ServicioAuth: {
    obtenerUsuarioActual: jest.fn(),
  },
}))

const { ServicioCrudBase } = require('@/services/firebase/firestore/base')
const { ServicioAuth } = require('@/services/firebase/auth')

// Require the real implementation of ServicioMascota
const {
  ServicioMascota,
} = require('@/services/firebase/firestore/colecciones/mascota')

describe('ServicioMascota - unitario', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Si no hay usuario autenticado, crear debe fallar con NO_AUTENTICADO
  test('crear devuelve NO_AUTENTICADO si no hay usuario', async () => {
    ServicioAuth.obtenerUsuarioActual.mockReturnValue(undefined)
    const res = await ServicioMascota.crear({
      nombre: 'Fido',
      especie: 'perro',
    })
    expect(res.success).toBe(false)
    expect(res.error).toBe(MOCK_ERR.COMUN.NO_AUTENTICADO)
  })

  // Si el payload incluye creado_por distinto al uid actual, debe fallar
  test('crear devuelve TUTOR_NO_COINCIDE cuando creado_por no coincide', async () => {
    ServicioAuth.obtenerUsuarioActual.mockReturnValue({ uid: 'u1' })
    const res = await ServicioMascota.crear({
      nombre: 'Fido',
      especie: 'perro',
      creado_por: 'u2',
    })
    expect(res.success).toBe(false)
    expect(res.error).toBe(MOCK_ERR.MASCOTAS.TUTOR_NO_COINCIDE)
  })

  // Debe delegar en ServicioCrudBase.crear y devolver su resultado
  test('crear delega en ServicioCrudBase.crear y retorna resultado', async () => {
    ServicioAuth.obtenerUsuarioActual.mockReturnValue({ uid: 'u1' })
    const created = {
      success: true,
      data: { id: 'm1', nombre: 'Fido', especie: 'perro', creado_por: 'u1' },
    }
    ServicioCrudBase.crear.mockResolvedValue(created)

    const res = await ServicioMascota.crear({
      nombre: 'Fido',
      especie: 'perro',
    })
    expect(ServicioCrudBase.crear).toHaveBeenCalled()
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

  // obtenerPorTamano utiliza buscar con el campo tamano
  test('obtenerPorTamano usa buscar con tamano', async () => {
    const tres = {
      success: true,
      data: [{ id: 'm2', nombre: 'Rex', tamano: 'grande' }],
    }
    ServicioCrudBase.buscar.mockResolvedValue(tres)
    const res = await ServicioMascota.obtenerPorTamano('grande')
    expect(ServicioCrudBase.buscar).toHaveBeenCalledWith(
      'mascotas',
      'tamano',
      'grande'
    )
    expect(res).toEqual(tres)
  })

  // obtenerTodos delega a ServicioCrudBase.obtenerTodos
  test('obtenerTodos delega a ServicioCrudBase.obtenerTodos', async () => {
    const all = { success: true, data: [{ id: 'm1' }, { id: 'm2' }] }
    ServicioCrudBase.obtenerTodos.mockResolvedValue(all)
    const res = await ServicioMascota.obtenerTodos()
    expect(ServicioCrudBase.obtenerTodos).toHaveBeenCalledWith('mascotas')
    expect(res).toEqual(all)
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

  // Crear: comprobar que el payload enviado incluye creado_por y activo por defecto
  test('crear envía creado_por y activo por defecto al ServicioCrudBase.crear', async () => {
    ServicioAuth.obtenerUsuarioActual.mockReturnValue({ uid: 'u9' })
    const created = {
      success: true,
      data: {
        id: 'm9',
        nombre: 'Bolt',
        especie: 'perro',
        creado_por: 'u9',
        activo: true,
      },
    }
    ServicioCrudBase.crear.mockResolvedValue(created)

    const res = await ServicioMascota.crear({
      nombre: 'Bolt',
      especie: 'perro',
    })
    expect(ServicioCrudBase.crear).toHaveBeenCalled()
    const callArgs = ServicioCrudBase.crear.mock.calls[0]
    expect(callArgs[0]).toBe('mascotas')
    // payload is second arg
    expect(callArgs[1].creado_por).toBe('u9')
    expect(callArgs[1].activo).toBe(true)
    expect(res).toEqual(created)
  })
})
