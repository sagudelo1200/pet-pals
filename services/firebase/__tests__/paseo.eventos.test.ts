/* eslint-env jest */
/**
 * ServicioPaseo.registrarEvento: persistencia del enriquecimiento territorial
 * y detección de patrones sobre los eventos de bitácora guardados.
 */

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'COL_EVENTOS'),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
  Timestamp: class {},
}))

jest.mock('@/services/firebase/auth/auth', () => ({
  ServicioAuth: { obtenerUsuarioActual: jest.fn(() => ({ uid: 'cuidador-1' })) },
}))

jest.mock('@/services/geo/enriquecimientoTerritorial', () => ({
  enriquecerContextoConAPIs: jest.fn(),
}))

jest.mock('@/logic/paseos/detectarPatrones', () => ({
  detectarPatron: jest.fn(),
}))

jest.mock('@/services/firebase/firestore/agregadores/territorial.aggregator', () => ({
  TerritorialAggregator: { publishEvento: jest.fn() },
}))

jest.mock('@/services/firebase/firestore/colecciones/chat', () => ({
  ServicioChat: { enviarMensaje: jest.fn() },
}))

import { ServicioPaseo } from '@/services/firebase/firestore/colecciones/paseo'
import { addDoc, getDoc, getDocs, where } from 'firebase/firestore'
import { enriquecerContextoConAPIs } from '@/services/geo/enriquecimientoTerritorial'
import { detectarPatron } from '@/logic/paseos/detectarPatrones'
import { TerritorialAggregator } from '@/services/firebase/firestore/agregadores/territorial.aggregator'
import { coordsAH3 } from '@/services/geo/h3Utils'

const mock = (fn: unknown) => fn as jest.Mock
const UBICACION = { lat: 4.6486, lng: -74.0628 }

describe('ServicioPaseo.registrarEvento', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mock(addDoc).mockResolvedValue({ id: 'e1' })
    mock(getDoc).mockResolvedValue({ data: () => ({ fecha_inicio_real: new Date() }) })
    mock(getDocs).mockResolvedValue({ docs: [] })
    mock(enriquecerContextoConAPIs).mockResolvedValue({ clima_actual: 'soleado' })
    mock(detectarPatron).mockReturnValue(null)
  })

  it('evento sin ubicación: guarda solo los campos base', async () => {
    const res = await ServicioPaseo.registrarEvento('p1', 'ACEPTAR', { x: 1 })

    expect(res.success).toBe(true)
    const entry = mock(addDoc).mock.calls[0][1]
    expect(entry).toEqual(
      expect.objectContaining({ evento: 'ACEPTAR', payload: { x: 1 }, actor: 'cuidador-1' })
    )
    expect(entry).not.toHaveProperty('hechoTerritorial')
    expect(entry).not.toHaveProperty('contextoTerritorial')
    expect(enriquecerContextoConAPIs).not.toHaveBeenCalled()
  })

  it('evento con ubicación: persiste hecho y contexto territorial (sin undefined)', async () => {
    await ServicioPaseo.registrarEvento('p1', 'incidente', {
      tipo: 'lesion',
      ubicacion: UBICACION,
      descripcion: undefined,
    })

    const entry = mock(addDoc).mock.calls[0][1]
    expect(entry.hechoTerritorial).toEqual(
      expect.objectContaining({
        h3_r8: coordsAH3(UBICACION.lat, UBICACION.lng, 8),
        h3_r9: coordsAH3(UBICACION.lat, UBICACION.lng, 9),
      })
    )
    expect(entry.contextoTerritorial).toEqual(
      expect.objectContaining({ clima_actual: 'soleado' })
    )
    expect(entry.payload).not.toHaveProperty('descripcion')
  })

  it('si las APIs de enriquecimiento fallan, el evento se guarda igual', async () => {
    mock(enriquecerContextoConAPIs).mockRejectedValue(new Error('sin red'))

    const res = await ServicioPaseo.registrarEvento('p1', 'incidente', {
      ubicacion: UBICACION,
    })

    expect(res.success).toBe(true)
    expect(mock(addDoc).mock.calls[0][1].hechoTerritorial).toBeDefined()
  })

  it('bitácora: detecta patrones con los eventos de bitácora guardados (campo evento)', async () => {
    mock(getDocs).mockResolvedValue({
      docs: [
        { data: () => ({ evento: 'bitacora', payload: { accion: 'agua' } }) },
        { data: () => ({ evento: 'ACEPTAR', payload: {} }) },
        { data: () => ({ evento: 'bitacora', payload: { accion: 'juego' } }) },
      ],
    })
    mock(detectarPatron).mockReturnValue('juego_intenso')

    await ServicioPaseo.registrarEvento('p1', 'bitacora', {
      accion: 'juego',
      ubicacion: UBICACION,
    })

    // Sin filtro por campo inexistente (no requiere índice compuesto)
    expect(where).not.toHaveBeenCalled()
    const recientes = mock(detectarPatron).mock.calls[0][1]
    expect(recientes).toHaveLength(2)
    expect(recientes.every((e: any) => e.tipoEvento === 'bitacora')).toBe(true)
    expect(mock(addDoc).mock.calls[0][1].patron_inferido).toBe('juego_intenso')
    expect(TerritorialAggregator.publishEvento).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'juego', paseoId: 'p1' })
    )
  })

  it('si falla la escritura devuelve error y limpia el buffer local', async () => {
    mock(addDoc).mockRejectedValue({ code: 'permission-denied' })

    const res = await ServicioPaseo.registrarEvento('p1', 'ACEPTAR', {})

    expect(res.success).toBe(false)
    expect(ServicioPaseo.obtenerEventosPendientes('p1')).toEqual([])
  })
})
