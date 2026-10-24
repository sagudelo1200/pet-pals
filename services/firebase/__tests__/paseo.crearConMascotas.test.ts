/* eslint-env jest */
/**
 * Creación atómica del paseo con sus mascotas (ServicioPaseo.crearConMascotas).
 * El batch de Firestore se simula: `set` captura lo que se escribiría y
 * `commit` es la única escritura real.
 */

const mockBatch = { set: jest.fn(), commit: jest.fn() }

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db: unknown, ...ruta: string[]) => ({ ruta })),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  doc: jest.fn((col: { ruta?: string[] } | undefined, id?: string) => ({
    id: id ?? 'paseo-nuevo',
    ruta: [...(col?.ruta ?? []), id ?? 'paseo-nuevo'],
  })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  writeBatch: jest.fn(() => mockBatch),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
  runTransaction: jest.fn(),
  Timestamp: { now: jest.fn(() => 'NOW') },
}))

jest.mock('@/services/firebase/auth/auth', () => ({
  ServicioAuth: { obtenerUsuarioActual: jest.fn(() => ({ uid: 'tutor-1' })) },
}))

import { ServicioPaseo } from '@/services/firebase/firestore/colecciones/paseo'
import { ServicioAuth } from '@/services/firebase/auth/auth'

const mock = (fn: unknown) => fn as jest.Mock
const datosPaseo = { estado: 'PENDIENTE', mascota_ids: ['m1', 'm2'] } as any

describe('ServicioPaseo.crearConMascotas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mock(ServicioAuth.obtenerUsuarioActual).mockReturnValue({ uid: 'tutor-1' })
    mockBatch.commit.mockResolvedValue(undefined)
  })

  it('escribe el paseo y todas sus mascotas en un único commit', async () => {
    const construir = jest.fn((id: string) => [
      { id: 'm1', id_paseo: id },
      { id: 'm2', id_paseo: id },
    ])

    const res = await ServicioPaseo.crearConMascotas(datosPaseo, construir)

    expect(res.success).toBe(true)
    expect(mockBatch.commit).toHaveBeenCalledTimes(1)
    // 1 paseo + 2 mascotas, todo dentro del mismo batch
    expect(mockBatch.set).toHaveBeenCalledTimes(3)
    const [refPaseo, docPaseo] = mockBatch.set.mock.calls[0]
    expect(docPaseo.id).toBe(refPaseo.id)
    expect(docPaseo.tipo).toBe('paseo')
    expect(docPaseo.creado_por).toBe('tutor-1')
    // Las mascotas se construyen con el id del paseo y cuelgan de él
    expect(construir).toHaveBeenCalledWith(refPaseo.id)
    const refsMascotas = mockBatch.set.mock.calls.slice(1).map(c => c[0].ruta)
    expect(refsMascotas).toEqual([
      ['operaciones', refPaseo.id, 'mascotas', 'm1'],
      ['operaciones', refPaseo.id, 'mascotas', 'm2'],
    ])
    if (res.success) expect(res.data.id).toBe(refPaseo.id)
  })

  it('si el commit falla no devuelve éxito (no queda paseo sin mascotas)', async () => {
    mockBatch.commit.mockRejectedValue(new Error('network'))

    const res = await ServicioPaseo.crearConMascotas(datosPaseo, () => [
      { id: 'm1' },
    ])

    expect(res.success).toBe(false)
    expect(mockBatch.commit).toHaveBeenCalledTimes(1)
  })

  it('sin usuario autenticado no escribe nada', async () => {
    mock(ServicioAuth.obtenerUsuarioActual).mockReturnValue(undefined)

    const res = await ServicioPaseo.crearConMascotas(datosPaseo, () => [])

    expect(res.success).toBe(false)
    expect(mockBatch.set).not.toHaveBeenCalled()
    expect(mockBatch.commit).not.toHaveBeenCalled()
  })

  it('un paseo sin mascotas también se crea en el batch', async () => {
    const res = await ServicioPaseo.crearConMascotas(datosPaseo, () => [])

    expect(res.success).toBe(true)
    expect(mockBatch.set).toHaveBeenCalledTimes(1)
    expect(mockBatch.commit).toHaveBeenCalledTimes(1)
  })
})
