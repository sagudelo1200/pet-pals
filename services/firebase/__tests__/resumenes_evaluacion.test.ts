/* eslint-env jest */

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}))

import { doc, getDoc } from 'firebase/firestore'
import { ServicioResumenEvaluacion } from '@/services/firebase/firestore/colecciones/resumenes_evaluacion'
import { ERR } from '@/constants'

const docMock = doc as jest.Mock
const getDocMock = getDoc as jest.Mock

describe('ServicioResumenEvaluacion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('devuelve el resumen con su id si el documento existe', async () => {
    docMock.mockReturnValue({ path: 'resumenes_evaluacion/c1' })
    getDocMock.mockResolvedValue({
      exists: () => true,
      id: 'c1',
      data: () => ({
        objetivo: { tipo: 'usuario', id: 'c1' },
        evaluaciones_cuidador: { promedio: 4.5, cantidad: 2 },
        evaluaciones_tutor: { promedio: 0, cantidad: 0 },
        actualizado_en: {
          seconds: 1700000000,
          nanoseconds: 0,
          toDate: () => new Date(1700000000000),
          toMillis: () => 1700000000000,
        },
      }),
    })

    const res = await ServicioResumenEvaluacion.obtenerPorObjetivo('c1')

    expect(res.success).toBe(true)
    expect(res.data?.id).toBe('c1')
    expect(res.data?.evaluaciones_cuidador).toEqual({ promedio: 4.5, cantidad: 2 })
    expect(res.data?.actualizado_en).toBeInstanceOf(Date)
    expect(docMock).toHaveBeenCalledWith(expect.anything(), 'resumenes_evaluacion', 'c1')
  })

  test('success false si el documento no existe', async () => {
    docMock.mockReturnValue({ path: 'resumenes_evaluacion/c1' })
    getDocMock.mockResolvedValue({ exists: () => false, data: () => undefined })

    const res = await ServicioResumenEvaluacion.obtenerPorObjetivo('c1')

    expect(res.success).toBe(false)
    expect(res.data).toBeNull()
  })

  test('mapea errores de Firestore a códigos ERR', async () => {
    docMock.mockReturnValue({ path: 'resumenes_evaluacion/c1' })
    getDocMock.mockRejectedValue({ code: 'permission-denied', message: 'denied' })

    const res = await ServicioResumenEvaluacion.obtenerPorObjetivo('c1')

    expect(res.success).toBe(false)
    expect(res.error).toBe(ERR.COMUN.PERMISOS_INSUFICIENTES)
  })
})
