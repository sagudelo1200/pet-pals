/**
 * Tests de flujo INTEGRADO del sistema de evaluaciones:
 * `crearEvaluacion` (callable) → `alCrearEvaluacion` (trigger).
 *
 * Verifica el pipeline completo: crear la boleta, disparar la agregación y
 * comprobar resumen + perfil + índice, todo en el mismo mock de Firestore.
 */

import * as mockFirestore from '../helpers/mockFirestore'

jest.mock('firebase-admin', () => {
  const db = mockFirestore.crearMockDb()
  return {
    apps: [],
    initializeApp: jest.fn(),
    firestore: Object.assign(() => db, {
      FieldValue: mockFirestore.MOCK_FIELD_VALUE,
      Timestamp: mockFirestore.MOCK_TIMESTAMP,
    }),
  }
})

jest.mock('firebase-admin/firestore', () => ({
  Timestamp: mockFirestore.MOCK_TIMESTAMP,
}))

jest.mock('firebase-functions/v2/https', () => {
  class HttpsError extends Error {
    code: string
    details?: unknown
    constructor(code: string, message: string, details?: unknown) {
      super(message)
      this.name = 'HttpsError'
      this.code = code
      this.details = details
    }
  }
  return {
    onCall: (_opts: unknown, handler: unknown) => handler,
    HttpsError,
  }
})

jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: (_path: string, handler: unknown) => handler,
}))

jest.mock('h3-js', () => ({
  gridDisk: jest.fn(() => ['celda-a', 'celda-b']),
}))

import { crearEvaluacion } from '../../src/evaluaciones/crearEvaluacion'
import { alCrearEvaluacion } from '../../src/evaluaciones/alCrearEvaluacion'

const handler = crearEvaluacion as unknown as (req: {
  auth?: { uid: string | null }
  data?: unknown
}) => Promise<{ success: boolean; evaluacionId: string; timestamp: string }>

const trigger = alCrearEvaluacion as unknown as (event: {
  data?: { data: () => Record<string, unknown> | undefined }
  params: Record<string, string>
}) => Promise<void>

const adminMock = jest.requireMock('firebase-admin') as any
const db = adminMock.firestore()

function evento(data: Record<string, unknown>): Parameters<typeof trigger>[0] {
  return {
    data: { data: () => data },
    params: { evaluacionId: (data.id as string) || 'eval' },
  }
}

describe('flujo integrado de evaluaciones', () => {
  beforeEach(() => {
    db.__reset()
  })

  test('evaluacion_cuidador propaga resumen + perfil + índice', async () => {
    db.__seed('paseos/p1', {
      estado: 'COMPLETADO',
      creado_por: 'tutor-1',
      id_cuidador: 'cuidador-1',
      mascota_ids: ['m1'],
    })
    db.__seed('perfiles_publicos/cuidador-1', {
      nombre: 'Juan',
      h3_r8: 'h3origen',
      rating_promedio: 0,
    })
    db.__seed('indice_cobertura/celda-a/cuidadores/cuidador-1', {
      uid: 'cuidador-1',
      rating_promedio: 0,
    })

    // 1. El tutor crea la evaluación
    const res = await handler({
      auth: { uid: 'tutor-1' },
      data: {
        tipo: 'evaluacion_cuidador',
        objetivo: 'cuidador-1',
        contextoId: 'p1',
        rating: 5,
        comentario: 'Excelente',
      },
    })
    expect(res.success).toBe(true)

    // 2. El trigger procesa el documento recién creado
    const doc = db.__docs.get(`evaluaciones/${res.evaluacionId}`)
    expect(doc).toBeDefined()
    await trigger(evento(doc))

    // 3. Fuente de verdad + caches
    const resumen = db.__docs.get('resumenes_evaluacion/cuidador-1')
    expect(resumen.evaluaciones_cuidador).toEqual({ promedio: 5, cantidad: 1 })
    expect(db.__docs.get('perfiles_publicos/cuidador-1').rating_promedio).toBe(5)
    expect(
      db.__docs.get('indice_cobertura/celda-a/cuidadores/cuidador-1')
        .rating_promedio
    ).toBe(5)
  })

  test('observación de mascota crea resumen cualitativo sin tocar perfiles', async () => {
    db.__seed('paseos/p1', {
      estado: 'FINALIZADO',
      creado_por: 'tutor-1',
      id_cuidador: 'cuidador-1',
      mascota_ids: ['m1'],
    })

    const res = await handler({
      auth: { uid: 'cuidador-1' },
      data: {
        tipo: 'evaluacion_mascota',
        objetivo: 'm1',
        contextoId: 'p1',
        ritmo: 'tranquilo',
        compania: 'solo',
        tolerancia: 'ignora',
      },
    })
    expect(res.success).toBe(true)

    const doc = db.__docs.get(`evaluaciones/${res.evaluacionId}`)
    await trigger(evento(doc))

    const resumen = db.__docs.get('resumenes_evaluacion/m1')
    expect(resumen.evaluaciones_mascota).toEqual({ promedio: 0, cantidad: 1 })
    expect(db.__docs.has('perfiles_publicos/m1')).toBe(false)
  })

  test('duplicado rechazado: solo queda una evaluación', async () => {
    db.__seed('paseos/p1', {
      estado: 'COMPLETADO',
      creado_por: 'tutor-1',
      id_cuidador: 'cuidador-1',
    })

    await handler({
      auth: { uid: 'tutor-1' },
      data: {
        tipo: 'evaluacion_cuidador',
        objetivo: 'cuidador-1',
        contextoId: 'p1',
        rating: 5,
      },
    })

    await expect(
      handler({
        auth: { uid: 'tutor-1' },
        data: {
          tipo: 'evaluacion_cuidador',
          objetivo: 'cuidador-1',
          contextoId: 'p1',
          rating: 4,
        },
      })
    ).rejects.toMatchObject({ code: 'already-exists' })

    const evaluaciones = [...db.__docs.keys()].filter(k =>
      k.startsWith('evaluaciones/')
    )
    expect(evaluaciones).toHaveLength(1)
  })
})
