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

// Mock para operaciones económicas (FASE 1)
jest.mock('@/logic/operacionesEconomicas/casosDeUso', () => ({
  crearOperacionEconomica: jest.fn(),
  generarObligacion: jest.fn(),
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

  // FASE 1: Test para verificar creación de OperacionEconomica
  test('FASE 1: crea OperacionEconomica cuando se crea paseo con precio', async () => {
    const crearOperacionEconomica =
      require('@/logic/operacionesEconomicas/casosDeUso').crearOperacionEconomica
    const generarObligacion =
      require('@/logic/operacionesEconomicas/casosDeUso').generarObligacion

    void (ServicioAuth.obtenerUsuarioActual as jest.Mock).mockReturnValue({
      uid: 'tutor1',
    })
    void (ServicioCrudBase.obtenerPorId as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'm1', creado_por: 'tutor1', nombre: 'Fido', foto: 'f.jpg' },
    })

    const paseoMock = { success: true, data: { id: 'p1' } }
    void (ServicioPaseo.crear as jest.Mock).mockResolvedValue(paseoMock)
    void (ServicioPaseo.actualizar as jest.Mock).mockResolvedValue({
      success: true,
    })
    void (
      ServicioPaseoMascota.commitMascotasBatch as jest.Mock
    ).mockResolvedValue({ success: true })

    // Mock OperacionEconomica
    void (crearOperacionEconomica as jest.Mock).mockResolvedValue('op1') // Retorna directamente el ID string
    void (generarObligacion as jest.Mock).mockResolvedValue({ success: true })

    const precio = 50000
    const data = {
      tipo_paseo: 'solicitado',
      estado: 'PENDIENTE',
      fecha_hora_inicio: new Date(),
      duracion_estimada: 60,
      precio,
    }

    const res = await crearConMascotas(data as any, ['m1'])

    // Verificar que se creó la OperacionEconomica con desglose correcto
    expect(crearOperacionEconomica).toHaveBeenCalledWith(
      'tutor1', // tutorId
      precio, // valorAcordado
      Math.round(precio * 0.1), // remuneracion_mandatario (10%)
      Math.round(precio * 0.9) // recursos_administrados (90%)
    )

    // Verificar que se actualiza el paseo con operacion_economica_id
    expect(ServicioPaseo.actualizar).toHaveBeenCalledWith('p1', {
      operacion_economica_id: 'op1',
      timestamp_pago_solicitado: expect.any(Date),
    })

    // Verificar que se genera la obligación del tutor
    expect(generarObligacion).toHaveBeenCalledWith(
      'op1', // operacionId
      'tutor1', // deudor
      'paw-path', // acreedor
      'Pago por servicio de paseo', // concepto
      precio // valor
    )

    expect(res.success).toBe(true)
  })
})
