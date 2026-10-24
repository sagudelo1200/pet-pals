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
  ServicioAuth: {
    obtenerUsuarioActual: jest.fn(() => ({ uid: 'cuidador-1' })),
  },
}))

jest.mock('@/services/geo/enriquecimientoTerritorial', () => ({
  enriquecerContextoConAPIs: jest.fn(),
}))

jest.mock('@/logic/paseos/detectarPatrones', () => ({
  detectarPatron: jest.fn(),
}))

jest.mock(
  '@/services/firebase/firestore/agregadores/territorial.aggregator',
  () => ({
    TerritorialAggregator: { publishEvento: jest.fn() },
  })
)

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
    mock(getDoc).mockResolvedValue({
      data: () => ({ fecha_inicio_real: new Date() }),
    })
    mock(getDocs).mockResolvedValue({ docs: [] })
    mock(enriquecerContextoConAPIs).mockResolvedValue({
      clima_actual: 'soleado',
    })
    mock(detectarPatron).mockReturnValue(null)
  })

  it('evento sin ubicación: guarda solo los campos base', async () => {
    const res = await ServicioPaseo.registrarEvento('p1', 'ACEPTAR', { x: 1 })

    expect(res.success).toBe(true)
    const entry = mock(addDoc).mock.calls[0][1]
    expect(entry).toEqual(
      expect.objectContaining({
        evento: 'ACEPTAR',
        payload: { x: 1 },
        actor: 'cuidador-1',
      })
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

describe('ServicioPaseo.registrarBitacora (por mascota)', () => {
  const {
    ServicioChat,
  } = require('@/services/firebase/firestore/colecciones/chat')

  beforeEach(() => {
    jest.clearAllMocks()
    mock(addDoc).mockResolvedValue({ id: 'e1' })
    mock(getDoc).mockResolvedValue({ data: () => ({}) })
    mock(getDocs).mockResolvedValue({ docs: [] })
    mock(detectarPatron).mockReturnValue(null)
    mock(ServicioChat.enviarMensaje).mockResolvedValue({ success: true })
  })

  it('guarda mascota_ids en el payload y los nombres en el mensaje del chat', async () => {
    const res = await ServicioPaseo.registrarBitacora('p1', 'juego', {
      mascotaIds: ['m1', 'm2', 'm1'],
      nombresMascotas: 'Max y Luna',
    })

    expect(res.success).toBe(true)
    const entry = mock(addDoc).mock.calls[0][1]
    expect(entry.payload.mascota_ids).toEqual(['m1', 'm2'])
    const metadata = mock(ServicioChat.enviarMensaje).mock.calls[0][3]
    expect(metadata).toEqual(
      expect.objectContaining({ mascotas: 'Max y Luna' })
    )
  })

  it('sin mascotas elegidas (todo el grupo) no agrega mascota_ids', async () => {
    await ServicioPaseo.registrarBitacora('p1', 'juego', {
      mascotaIds: [],
      nombresMascotas: 'Max y Luna',
    })
    await ServicioPaseo.registrarBitacora('p1', 'descanso')

    for (const [, entry] of mock(addDoc).mock.calls) {
      expect(entry.payload).not.toHaveProperty('mascota_ids')
    }
    for (const llamada of mock(ServicioChat.enviarMensaje).mock.calls) {
      expect(llamada[3]).not.toHaveProperty('mascotas')
    }
  })
})

describe('ServicioPaseo.registrarMomento (catálogo de momentos)', () => {
  const {
    ServicioChat,
  } = require('@/services/firebase/firestore/colecciones/chat')

  beforeEach(() => {
    jest.clearAllMocks()
    mock(addDoc).mockResolvedValue({ id: 'e1' })
    mock(getDoc).mockResolvedValue({ data: () => ({}) })
    mock(getDocs).mockResolvedValue({ docs: [] })
    mock(detectarPatron).mockReturnValue(null)
    mock(ServicioChat.enviarMensaje).mockResolvedValue({ success: true })
  })

  it('un momento va a la bitácora con su grupo, dominio y seguimiento', async () => {
    const res = await ServicioPaseo.registrarMomento(
      'p1',
      {
        clave: 'como_esta.se_puso_nervioso',
        causa: 'motos_o_carros',
        calmo_con: 'dejandolo_oler',
        lugar: 'lugar_y_ambiente.lugar_parque',
      },
      { mascotaIds: ['m1'], nombresMascotas: 'Luna' }
    )

    expect(res.success).toBe(true)
    const entry = mock(addDoc).mock.calls[0][1]
    expect(entry.evento).toBe('bitacora')
    expect(entry.payload).toMatchObject({
      accion: 'como_esta.se_puso_nervioso',
      clave: 'como_esta.se_puso_nervioso',
      grupo: 'como_esta',
      dominio: 'estado_mental',
      causa: 'motos_o_carros',
      calmo_con: 'dejandolo_oler',
      lugar: 'lugar_y_ambiente.lugar_parque',
      mascota_ids: ['m1'],
    })
    const [, contenido, tipo, metadata] = mock(ServicioChat.enviarMensaje).mock
      .calls[0]
    expect(contenido).toBe('chat:sistema.momentos.como_esta.se_puso_nervioso')
    expect(tipo).toBe('sistema')
    expect(metadata).toMatchObject({
      causa: 'motos_o_carros',
      calmo_con: 'dejandolo_oler',
    })
  })

  it('un momento sin seguimiento no agrega campos vacíos', async () => {
    await ServicioPaseo.registrarMomento('p1', {
      clave: 'necesidades.tomo_agua',
    })

    const payload = mock(addDoc).mock.calls[0][1].payload
    expect(payload).not.toHaveProperty('causa')
    expect(payload).not.toHaveProperty('lugar')
    expect(payload).not.toHaveProperty('mascota_ids')
  })

  it('los de Emergencia son incidentes con su severidad', async () => {
    await ServicioPaseo.registrarMomento(
      'p1',
      { clave: 'emergencia.lesion' },
      {
        nota: 'Se cortó la pata',
        mascotaIds: ['m1', 'm2'],
        nombresMascotas: 'Luna y Max',
      }
    )

    const entry = mock(addDoc).mock.calls[0][1]
    expect(entry.evento).toBe('incidente')
    expect(entry.payload).toMatchObject({
      tipo: 'lesion',
      severidad: 'media',
      clave: 'emergencia.lesion',
      dominio: 'salud',
      descripcion: 'Se cortó la pata',
      mascota_ids: ['m1', 'm2'],
    })
    // El mensaje del chat es la clave i18n pura (con emoji delante no se traducía)
    const [, contenido, , metadata] = mock(ServicioChat.enviarMensaje).mock
      .calls[0]
    expect(contenido).toBe('chat:sistema.incidentes.lesion')
    expect(metadata).toMatchObject({
      severidad: 'media',
      mascotas: 'Luna y Max',
    })
  })

  it.each([
    ['emergencia.emergencia', 'critica'],
    ['emergencia.lesion', 'media'],
    ['emergencia.conflicto_con_otro_perro', 'media'],
    ['emergencia.contacte_al_tutor', 'baja'],
  ])('%s se registra con severidad %s', async (clave, severidad) => {
    await ServicioPaseo.registrarMomento('p1', { clave })
    expect(mock(addDoc).mock.calls[0][1].payload.severidad).toBe(severidad)
  })

  it('el detalle del conflicto viaja en el incidente', async () => {
    await ServicioPaseo.registrarMomento('p1', {
      clave: 'emergencia.conflicto_con_otro_perro',
      detalle_del_conflicto: 'ladro_o_gruno',
    })
    expect(mock(addDoc).mock.calls[0][1].payload).toMatchObject({
      tipo: 'conflicto_con_otro_perro',
      detalle_del_conflicto: 'ladro_o_gruno',
    })
    expect(mock(ServicioChat.enviarMensaje).mock.calls[0][3]).toMatchObject({
      detalle_del_conflicto: 'ladro_o_gruno',
    })
  })

  it.each([
    ['clave desconocida', { clave: 'como_esta.inventado' }],
    [
      'causa que no corresponde',
      { clave: 'como_esta.jugo', causa: 'motos_o_carros' },
    ],
    [
      'seguimiento desconocido',
      { clave: 'como_esta.se_puso_nervioso', causa: 'x' },
    ],
  ])('rechaza sin escribir nada: %s', async (_nombre, momento) => {
    const res = await ServicioPaseo.registrarMomento('p1', momento as any)

    expect(res).toEqual({ success: false, error: 'MOMENTO_INVALIDO' })
    expect(addDoc).not.toHaveBeenCalled()
    expect(ServicioChat.enviarMensaje).not.toHaveBeenCalled()
  })

  it('sin sesión no registra', async () => {
    const { ServicioAuth } = require('@/services/firebase/auth/auth')
    mock(ServicioAuth.obtenerUsuarioActual).mockReturnValueOnce(null)

    const res = await ServicioPaseo.registrarMomento('p1', {
      clave: 'como_esta.jugo',
    })

    expect(res.success).toBe(false)
    expect(addDoc).not.toHaveBeenCalled()
  })
})
