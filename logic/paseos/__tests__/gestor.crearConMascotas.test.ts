/* eslint-env jest */

jest.mock('@/services/firebase', () => ({
  ServicioAuth: {
    obtenerUsuarioActual: jest.fn(),
  },
  ServicioCrudBase: {
    obtenerPorId: jest.fn(),
  },
  ServicioPaseo: {
    crear: jest.fn(),
    actualizar: jest.fn(),
  },
  ServicioPaseoMascota: {
    commitMascotasBatch: jest.fn(),
  },
}))

// Mock para auditoría y territorio
jest.mock('@/logic/operaciones/auditoria', () => ({
  registrarAuditoria: jest.fn().mockResolvedValue({ success: true }),
}))

jest.mock('@/services/h3', () => ({
  H3TerritorialOrchestrator: {
    procesarEventoPaseo: jest.fn().mockResolvedValue(true),
  },
}))

// Los validadores de solapamiento construyen queries con collection/query/getDocs.
// En el entorno de test no hay una instancia real de Firestore, así que se mockean
// para que devuelvan una colección vacía (sin paseos solapados).
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
}))

describe('crearConMascotas', () => {
  let ServicioAuth: any
  let ServicioCrudBase: any
  let ServicioPaseo: any
  let ServicioPaseoMascota: any
  let crearConMascotas: any
  let ERR: any

  beforeEach(() => {
    jest.resetModules()
    const sv = require('@/services/firebase')
    ServicioAuth = sv.ServicioAuth
    ServicioCrudBase = sv.ServicioCrudBase
    ServicioPaseo = sv.ServicioPaseo
    ServicioPaseoMascota = sv.ServicioPaseoMascota

    const gestor = require('@/logic/paseos/casosDeUso')
    crearConMascotas = gestor.crearConMascotas
    ERR = require('@/constants').ERR

    jest.clearAllMocks()
  })

  test('devuelve error si no hay usuario', async () => {
    void (ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue(
      undefined
    )
    const res = await crearConMascotas({} as any, [])
    expect(res.success).toBe(false)
    expect(res.error).toBe(ERR.COMUN.NO_AUTENTICADO)
  })

  test('error si supera limite de mascotas segun cupo', async () => {
    void (ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue({
      uid: 'u1',
    })
    const data = { cupo_maximo_mascotas: 1 }
    const mascotaIds = ['m1', 'm2']
    const res = await crearConMascotas(data as any, mascotaIds)
    expect(res.success).toBe(false)
    expect(res.error).toBe(ERR.PASEOS.LIMITE_DE_MASCOTAS_SUPERADO)
  })

  test('error si mascota no pertenece al usuario', async () => {
    void (ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue({
      uid: 'u1',
    })
    void (ServicioCrudBase.obtenerPorId as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'm1', creado_por: 'otro' },
    })

    const res = await crearConMascotas({} as any, ['m1'])
    expect(res.success).toBe(false)
    expect(res.error).toBe(ERR.MASCOTAS.MASCOTA_NO_PERTENECE_AL_USUARIO)
  })

  test('error coordenadas invalidas (NaN)', async () => {
    void (ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue({
      uid: 'u1',
    })
    const data = {
      ubicacion_inicio: {
        coordenadas: { latitude: 'nope', longitude: 'nope' },
      },
    }
    const res = await crearConMascotas(data as any, [])
    expect(res.success).toBe(false)
    expect(res.error).toBe(ERR.PASEOS.COORDENADAS_INVALIDAS)
  })

  test('happy path: crea paseo y batch mascotas', async () => {
    void (ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue({
      uid: 'u1',
    })
    void (ServicioCrudBase.obtenerPorId as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'm1', creado_por: 'u1', nombre: 'Fido', foto: 'f.jpg' },
    })

    const paseoMock = { success: true, data: { id: 'p1' } }
    void (ServicioPaseo.crear as jest.Mock).mockResolvedValue(paseoMock)
    void (
      ServicioPaseoMascota.commitMascotasBatch as jest.Mock
    ).mockResolvedValue({
      success: true,
    })

    const data = {
      tipo_paseo: 'solicitado',
      estado: 'PENDIENTE',
      fecha_hora_inicio: new Date(),
      duracion_estimada: 60,
      precio: 10000,
    }

    const res = await crearConMascotas(data as any, ['m1'])
    expect(ServicioPaseo.crear).toHaveBeenCalled()
    expect(ServicioPaseoMascota.commitMascotasBatch).toHaveBeenCalled()
    expect(res.success).toBe(true)
    expect(res.data).toEqual(paseoMock.data)
  })

  // La economía la genera el servidor al finalizar: el cliente no escribe nada
  test('crear paseo no escribe registros económicos desde el cliente', async () => {
    void (ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue({
      uid: 'tutor1',
    })
    void (ServicioCrudBase.obtenerPorId as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'm1', creado_por: 'tutor1', nombre: 'Fido', foto: 'f.jpg' },
    })
    void (ServicioPaseo.crear as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'p1' },
    })
    void (
      ServicioPaseoMascota.commitMascotasBatch as jest.Mock
    ).mockResolvedValue({ success: true })

    const res = await crearConMascotas(
      {
        tipo_paseo: 'solicitado',
        estado: 'PENDIENTE',
        fecha_hora_inicio: new Date(),
        duracion_estimada: 60,
        precio: 50000,
      } as any,
      ['m1']
    )

    expect(res.success).toBe(true)
    const actualizaciones = (ServicioPaseo.actualizar as jest.Mock).mock.calls
    for (const [, cambios] of actualizaciones) {
      expect(cambios).not.toHaveProperty('operacion_economica_id')
    }
  })

  describe('Códigos, territorio y solapamiento', () => {
    const fechaPaseo = new Date(2030, 0, 14, 10, 0, 0)
    const dataPaseo = {
      tipo_paseo: 'solicitado',
      estado: 'PENDIENTE',
      fecha_hora_inicio: fechaPaseo,
      duracion_estimada: 60,
    }

    function prepararHappyPath() {
      void (ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue({
        uid: 'tutor1',
      })
      void (ServicioCrudBase.obtenerPorId as jest.Mock).mockResolvedValue({
        success: true,
        data: { id: 'm1', creado_por: 'tutor1', nombre: 'Fido' },
      })
      void (ServicioPaseo.crear as jest.Mock).mockResolvedValue({
        success: true,
        data: { id: 'p1' },
      })
      void (
        ServicioPaseoMascota.commitMascotasBatch as jest.Mock
      ).mockResolvedValue({ success: true })
    }

    test('genera códigos de recogida y de entrega de 6 dígitos para el tutor', async () => {
      prepararHappyPath()

      await crearConMascotas(dataPaseo as any, ['m1'])

      const creado = (ServicioPaseo.crear as jest.Mock).mock.calls[0][0]
      expect(creado.codigos_recogida_por_tutor.tutor1).toMatch(/^\d{6}$/)
      expect(creado.codigos_entrega_por_tutor.tutor1).toMatch(/^\d{6}$/)
      expect(creado.codigo_entrega_validado_por_tutor).toEqual({})
      expect(creado.intentos_fallidos_entrega_por_tutor).toEqual({})
    })

    test('crear el paseo no suma paseos_activos en H3 (solo al iniciar)', async () => {
      prepararHappyPath()
      const { H3TerritorialOrchestrator } = require('@/services/h3')

      await crearConMascotas(
        {
          ...dataPaseo,
          ubicacion_inicio: {
            id: 'u1',
            direccion_formateada: 'Calle 1',
            coordenadas: { latitude: 4.65, longitude: -74.06 },
          },
        } as any,
        ['m1']
      )

      expect(H3TerritorialOrchestrator.procesarEventoPaseo).not.toHaveBeenCalled()
    })

    test('detecta solapamiento de la misma mascota (fechas como Timestamp)', async () => {
      prepararHappyPath()
      const { getDocs } = require('firebase/firestore')
      ;(getDocs as jest.Mock).mockResolvedValue({
        docs: [
          {
            data: () => ({
              mascota_ids: ['m1'],
              fecha_hora_inicio: { toDate: () => new Date(2030, 0, 14, 10, 30) },
              duracion_estimada: 30,
            }),
          },
        ],
      })

      const res = await crearConMascotas(dataPaseo as any, ['m1'])

      expect(res.success).toBe(false)
      expect(res.error).toBe('DOBLE_BOOKING_MASCOTA')
      expect(ServicioPaseo.crear).not.toHaveBeenCalled()
    })

    test('ignora paseos activos del tutor que no incluyen esa mascota', async () => {
      prepararHappyPath()
      const { getDocs } = require('firebase/firestore')
      ;(getDocs as jest.Mock).mockResolvedValue({
        docs: [
          {
            data: () => ({
              mascota_ids: ['otra'],
              fecha_hora_inicio: { toDate: () => new Date(2030, 0, 14, 10, 30) },
              duracion_estimada: 30,
            }),
          },
        ],
      })

      const res = await crearConMascotas(dataPaseo as any, ['m1'])

      expect(res.success).toBe(true)
    })

    test('la consulta de solapamiento se limita a paseos propios (reglas de Firestore)', async () => {
      prepararHappyPath()
      const { where } = require('firebase/firestore')

      await crearConMascotas(dataPaseo as any, ['m1'])

      expect(where).toHaveBeenCalledWith('creado_por', '==', 'tutor1')
      expect(where).not.toHaveBeenCalledWith('mascota_ids', 'array-contains', 'm1')
    })
  })
})
