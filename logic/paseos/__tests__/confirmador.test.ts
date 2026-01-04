/* eslint-env jest */

import { confirmarReservaPaseo } from '@/logic/paseos/confirmador'
import { GestorPaseos } from '@/logic/paseos'

jest.mock('@/logic/paseos', () => ({
  GestorPaseos: {
    crearConMascotas: jest.fn(),
  },
}))

describe('confirmarReservaPaseo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('retorna error si falta fecha u hora', async () => {
    const res = await confirmarReservaPaseo({
      fecha: null,
      hora: null,
      duracion: 60,
      total: 1000,
      direccion: { id: 'd1' },
      direccionId: 'd1',
      cuidadorId: null,
      esCompartido: false,
      mascotaIds: ['m1'],
      tutorUid: 'u1',
    })

    expect(res).toEqual({ success: false, error: 'fecha_hora_requerida' })
    expect(GestorPaseos.crearConMascotas).not.toHaveBeenCalled()
  })

  test('retorna error si falta direccionId', async () => {
    const res = await confirmarReservaPaseo({
      fecha: new Date(),
      hora: '10:00',
      duracion: 60,
      total: 1000,
      direccion: undefined,
      direccionId: null,
      cuidadorId: null,
      esCompartido: false,
      mascotaIds: ['m1'],
      tutorUid: 'u1',
    })

    expect(res).toEqual({ success: false, error: 'ubicacion_requerida' })
    expect(GestorPaseos.crearConMascotas).not.toHaveBeenCalled()
  })

  test('invoca GestorPaseos.crearConMascotas y devuelve su resultado', async () => {
    void (GestorPaseos.crearConMascotas as jest.Mock).mockResolvedValue({
      success: true,
      id: 'p1',
    })

    const fecha = new Date('2026-01-10')
    const res = await confirmarReservaPaseo({
      fecha,
      hora: '09:30',
      duracion: 45,
      total: 2000,
      direccion: { lat: 1, lng: 2 },
      direccionId: 'd1',
      cuidadorId: 'c1',
      esCompartido: false,
      mascotaIds: ['m1', 'm2'],
      tutorUid: 'u1',
    })

    expect(GestorPaseos.crearConMascotas).toHaveBeenCalledTimes(1)
    const args = (GestorPaseos.crearConMascotas as jest.Mock).mock.calls[0]
    expect(args[1]).toEqual(['m1', 'm2'])
    expect(res).toEqual({ success: true, id: 'p1' })
  })

  test('captura excepcion y devuelve error', async () => {
    void (GestorPaseos.crearConMascotas as jest.Mock).mockRejectedValue(
      new Error('boom')
    )

    const fecha = new Date()
    const res = await confirmarReservaPaseo({
      fecha,
      hora: '08:00',
      duracion: 60,
      total: 1000,
      direccion: { id: 'd1' },
      direccionId: 'd1',
      cuidadorId: null,
      esCompartido: false,
      mascotaIds: ['m1'],
      tutorUid: 'u1',
    })

    expect(res.success).toBe(false)
    expect(res.error).toBe('boom')
  })
})
