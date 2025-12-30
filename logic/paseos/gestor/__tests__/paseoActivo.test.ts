/* eslint-env jest */
import { paseoActivo } from '../paseoActivo'
import { ServicioPaseo } from '@/services/firebase'
import { ESTADOS_PASEO, Paseo } from '@/models/Paseo'
import { EVENTOS } from '../../maquinaEstados'

// Mock de ServicioPaseo
jest.mock('@/services/firebase', () => ({
  ServicioPaseo: {
    aceptarSolicitud: jest.fn(),
    iniciarRuta: jest.fn(),
    iniciarPaseo: jest.fn(),
    finalizarPaseo: jest.fn(),
    actualizar: jest.fn(),
  },
}))

describe('PaseoActivoGestor', () => {
  // let gestor: PaseoActivoGestor

  
  // Paseo dummy para pruebas
  const paseoMock: Paseo = {
    id: 'paseo-123',
    estado: ESTADOS_PASEO.PENDIENTE,
    tutor_nombre_visual: 'Juan',
    cuidador_nombre_visual: 'Pedro',
    mascota_ids: ['m1'],
    creado_en: new Date(),
    tipo_paseo: 'solicitado',
    fecha_hora_inicio: new Date(),
    duracion_estimada: 60,
    precio: 20000,
    // ... otros campos requeridos por BaseModel o Paseo si fuese estricto, 
    // pero Partial suele ser suficiente en lógica interna si se maneja bien,
    // aunque setPaseoActivo espera Paseo completo. Ajustaremos según necesidad.
  } as any

  beforeEach(() => {
    // Resetear el singleton (o usar una instancia nueva si exportáramos la clase)
    // Como exportamos la instancia, idealmente tendríamos un método reset o usaríamos la clase.
    // Para testear bien, vamos a asumir que podemos limpiar el estado.
    paseoActivo.limpiarPaseoActivo()
    jest.clearAllMocks()
    
    // Si queremos testear una instancia fresca:
    // gestor = new PaseoActivoGestor() 
    // Pero el archivo exporta la instancia. Usaremos la instancia exportada.
  })

  it('debe iniciar sin paseo activo', () => {
    expect(paseoActivo.getPaseoActivo()).toBeNull()
  })

  it('debe permitir setear un paseo activo', () => {
    const res = paseoActivo.setPaseoActivo(paseoMock)
    expect(res.ok).toBe(true)
    const activo = paseoActivo.getPaseoActivo()
    expect(activo).not.toBeNull()
    expect(activo?.id).toBe(paseoMock.id)
    expect(activo?.estado).toBe(ESTADOS_PASEO.PENDIENTE)
    expect(activo?.esActivo).toBe(true)
  })

  it('debe notificar a los suscriptores al cambiar estado', () => {
    const listener = jest.fn()
    const unsubscribe = paseoActivo.suscribir(listener)

    // Primera llamada al suscribir
    expect(listener).toHaveBeenCalledWith(null)
    
    paseoActivo.setPaseoActivo(paseoMock)
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener.mock.calls[1][0].id).toBe(paseoMock.id)

    unsubscribe()
  })

  it('debe validar transiciones inválidas con puede()', () => {
    paseoActivo.setPaseoActivo(paseoMock) // PENDIENTE
    
    // PENDIENTE -> FINALIZAR_PASEO no es válido
    expect(paseoActivo.puede(EVENTOS.FINALIZAR_PASEO)).toBe(false)
    // PENDIENTE -> ACEPTAR es válido
    expect(paseoActivo.puede(EVENTOS.ACEPTAR)).toBe(true)
  })

  it('aceptarPaseoAsync debe llamar al servicio y actualizar estado local', async () => {
    paseoActivo.setPaseoActivo(paseoMock)
    ;(ServicioPaseo.aceptarSolicitud as jest.Mock).mockResolvedValue({ success: true })

    const res = await paseoActivo.aceptarPaseoAsync()
    
    expect(res.success).toBe(true)
    expect(ServicioPaseo.aceptarSolicitud).toHaveBeenCalledWith(paseoMock.id)
    
    const activo = paseoActivo.getPaseoActivo()
    expect(activo?.estado).toBe(ESTADOS_PASEO.CONFIRMADO)
    expect(activo?.timestamps.confirmado).toBeDefined()
  })

  it('no debe actualizar estado local si el servicio falla', async () => {
    paseoActivo.setPaseoActivo(paseoMock)
    ;(ServicioPaseo.aceptarSolicitud as jest.Mock).mockResolvedValue({ 
      success: false, 
      error: 'Error backend' 
    })

    const res = await paseoActivo.aceptarPaseoAsync()
    
    expect(res.success).toBe(false)
    const activo = paseoActivo.getPaseoActivo()
    expect(activo?.estado).toBe(ESTADOS_PASEO.PENDIENTE) // Se mantiene
  })

  it('iniciarRutaAsync debe validar transición antes de llamar servicio', async () => {
    // Si estamos en PENDIENTE, no podemos INICIAR_RUTA (primero debe ser CONFIRMADO)
    paseoActivo.setPaseoActivo(paseoMock) 
    
    const res = await paseoActivo.iniciarRutaAsync()
    
    expect(res.success).toBe(false)
    expect(res.error).toBe('TRANSICION_INVALIDA')
    expect(ServicioPaseo.iniciarRuta).not.toHaveBeenCalled()
  })

  it('flujo completo feliz: Aseptar -> Iniciar Ruta -> Iniciar Paseo -> Finalizar', async () => {
    paseoActivo.setPaseoActivo(paseoMock)

    // 1. Aceptar
    ;(ServicioPaseo.aceptarSolicitud as jest.Mock).mockResolvedValue({ success: true })
    await paseoActivo.aceptarPaseoAsync()
    expect(paseoActivo.getPaseoActivo()?.estado).toBe(ESTADOS_PASEO.CONFIRMADO)

    // 2. Iniciar Ruta
    ;(ServicioPaseo.iniciarRuta as jest.Mock).mockResolvedValue({ success: true })
    await paseoActivo.iniciarRutaAsync()
    expect(paseoActivo.getPaseoActivo()?.estado).toBe(ESTADOS_PASEO.EN_CAMINO)

    // 3. Iniciar Paseo
    ;(ServicioPaseo.iniciarPaseo as jest.Mock).mockResolvedValue({ success: true })
    await paseoActivo.iniciarPaseoAsync()
    expect(paseoActivo.getPaseoActivo()?.estado).toBe(ESTADOS_PASEO.EN_PROGRESO)
    expect(paseoActivo.getPaseoActivo()?.timestamps.iniciado).toBeDefined()

    // 4. Finalizar
    ;(ServicioPaseo.finalizarPaseo as jest.Mock).mockResolvedValue({ success: true })
    await paseoActivo.finalizarPaseoAsync()
    expect(paseoActivo.getPaseoActivo()?.estado).toBe(ESTADOS_PASEO.FINALIZADO)
    expect(paseoActivo.getPaseoActivo()?.esActivo).toBe(false)
  })
})
