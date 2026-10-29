import {
  bannerDe,
  filasDe,
  progresoDe,
  perfilParaRequisitos,
  puedeEnviar,
} from '../miHabilitacion'
import type { Habilitacion } from '@/models/Habilitacion'

const AHORA = Date.UTC(2026, 9, 25, 12)
const DIA = 86400000
const PERFIL = {
  biografia: 'Amo a los perros',
  horario_semanal: { '1': { inicio: '08:00', fin: '18:00' } },
  h3_r8: '88aaaaaaaaaaaaa',
  celular: '3001234567',
}

const hab = (extra: Partial<Habilitacion> = {}): Habilitacion => ({
  id: 'ana_paseo',
  usuario_id: 'ana',
  servicio: 'paseo',
  estado: 'BORRADOR',
  motivo: null,
  requisitos: { email: { estado: 'VERIFICADO' } },
  ...extra,
})

const fila = (filas: ReturnType<typeof filasDe>, id: string) => {
  const f = filas.find(x => x.definicion.id === id)
  if (!f) throw new Error(id)
  return f
}

describe('progresoDe', () => {
  test('convierte fechas a milisegundos y conserva el motivo', () => {
    const vence = new Date(AHORA + DIA)
    const p = progresoDe(
      hab({
        requisitos: {
          antecedentes: { estado: 'VERIFICADO', vence_en: vence, verificacion_id: 'v1' },
          identidad: { estado: 'RECHAZADO', motivo: 'Borrosa' },
        },
      })
    )
    expect(p.antecedentes).toMatchObject({ estado: 'VERIFICADO', venceEnMs: vence.getTime(), verificacionId: 'v1' })
    expect(p.identidad).toMatchObject({ estado: 'RECHAZADO', venceEnMs: null, motivo: 'Borrosa' })
  })

  test('sin habilitación, sin avance', () => {
    expect(progresoDe(null)).toEqual({})
  })
})

describe('filasDe', () => {
  test('una fila por requisito, en el orden del catálogo', () => {
    const filas = filasDe('paseo', hab(), PERFIL, AHORA)
    expect(filas.map(f => f.definicion.id)).toEqual(['email', 'perfil', 'identidad', 'antecedentes'])
  })

  test('el perfil se calcula y dice qué campos faltan', () => {
    const completo = fila(filasDe('paseo', hab(), PERFIL, AHORA), 'perfil')
    expect(completo).toMatchObject({ estado: 'VERIFICADO', delPerfil: true, camposFaltantes: [], puedeSubir: false })

    const incompleto = fila(filasDe('paseo', hab(), { biografia: 'x' }, AHORA), 'perfil')
    expect(incompleto.estado).toBe('PENDIENTE')
    expect(incompleto.camposFaltantes).toEqual(['horario_semanal', 'h3_r8', 'celular'])
  })

  test('el celular privado se suma al perfil público al evaluar', () => {
    const { celular, ...publico } = PERFIL
    expect(perfilParaRequisitos(publico, { celular })).toEqual(PERFIL)
    expect(perfilParaRequisitos(null, null)).toBeNull()
    const sin = fila(filasDe('paseo', hab(), perfilParaRequisitos(publico, {}), AHORA), 'perfil')
    expect(sin.camposFaltantes).toEqual(['celular'])
  })

  test('en borrador se sube la evidencia de lo pendiente, no del correo ni del perfil', () => {
    const filas = filasDe('paseo', hab(), PERFIL, AHORA)
    expect(fila(filas, 'email').puedeSubir).toBe(false)
    expect(fila(filas, 'perfil').puedeSubir).toBe(false)
    expect(fila(filas, 'identidad').puedeSubir).toBe(true)
    expect(fila(filas, 'antecedentes').puedeSubir).toBe(true)
  })

  test('lo rechazado se puede reemplazar y muestra por qué', () => {
    const filas = filasDe('paseo', hab({
      requisitos: { identidad: { estado: 'RECHAZADO', motivo: 'Borrosa' } },
    }), PERFIL, AHORA)
    expect(fila(filas, 'identidad')).toMatchObject({ estado: 'RECHAZADO', motivo: 'Borrosa', puedeSubir: true })
  })

  test('lo que ya está en revisión o verificado no se toca', () => {
    const filas = filasDe('paseo', hab({
      requisitos: {
        identidad: { estado: 'EN_REVISION' },
        antecedentes: { estado: 'VERIFICADO', vence_en: new Date(AHORA + 30 * DIA) },
      },
    }), PERFIL, AHORA)
    expect(fila(filas, 'identidad').puedeSubir).toBe(false)
    expect(fila(filas, 'antecedentes').puedeSubir).toBe(false)
  })

  test('mientras se revisa, nada se edita', () => {
    const filas = filasDe('paseo', hab({ estado: 'EN_REVISION' }), PERFIL, AHORA)
    expect(filas.some(f => f.puedeSubir)).toBe(false)
  })

  test('en una aprobada solo se renueva lo vencido', () => {
    const filas = filasDe('paseo', hab({
      estado: 'APROBADA',
      requisitos: {
        identidad: { estado: 'VERIFICADO' },
        antecedentes: { estado: 'VERIFICADO', vence_en: new Date(AHORA - DIA) },
      },
    }), PERFIL, AHORA)
    expect(fila(filas, 'antecedentes')).toMatchObject({ estado: 'EXPIRADO', puedeSubir: true })
    expect(fila(filas, 'identidad').puedeSubir).toBe(false)
  })

  test('sin habilitación todavía, se trata como borrador', () => {
    expect(fila(filasDe('paseo', null, PERFIL, AHORA), 'identidad').puedeSubir).toBe(true)
  })
})

describe('puedeEnviar', () => {
  test('en borrador, con correo y perfil listos', () => {
    const h = hab()
    expect(puedeEnviar(h, filasDe('paseo', h, PERFIL, AHORA))).toBe(true)
  })

  test('con el perfil incompleto no', () => {
    const h = hab()
    expect(puedeEnviar(h, filasDe('paseo', h, { biografia: 'x' }, AHORA))).toBe(false)
  })

  test('sin el correo verificado no', () => {
    const h = hab({ requisitos: {} })
    expect(puedeEnviar(h, filasDe('paseo', h, PERFIL, AHORA))).toBe(false)
  })

  test('en revisión, rechazada o suspendida no', () => {
    for (const estado of ['EN_REVISION', 'RECHAZADA', 'SUSPENDIDA'] as const) {
      const h = hab({ estado })
      expect(puedeEnviar(h, filasDe('paseo', h, PERFIL, AHORA))).toBe(false)
    }
  })

  test('aprobada: solo si algo venció', () => {
    const vigente = hab({
      estado: 'APROBADA',
      requisitos: { email: { estado: 'VERIFICADO' }, antecedentes: { estado: 'VERIFICADO', vence_en: new Date(AHORA + DIA) } },
    })
    expect(puedeEnviar(vigente, filasDe('paseo', vigente, PERFIL, AHORA))).toBe(false)
    const vencida = hab({
      estado: 'APROBADA',
      requisitos: { email: { estado: 'VERIFICADO' }, antecedentes: { estado: 'VERIFICADO', vence_en: new Date(AHORA - DIA) } },
    })
    expect(puedeEnviar(vencida, filasDe('paseo', vencida, PERFIL, AHORA))).toBe(true)
  })

  test('sin habilitación todavía no hay nada que enviar (falta el correo)', () => {
    expect(puedeEnviar(null, filasDe('paseo', null, PERFIL, AHORA))).toBe(false)
  })
})

describe('bannerDe', () => {
  const banner = (h: Habilitacion | null) => bannerDe(h, filasDe('paseo', h, PERFIL, AHORA))

  test('borrador, con lo que pidió el equipo si lo devolvió', () => {
    expect(banner(null)).toMatchObject({ clave: 'borrador', variante: 'neutral', motivo: null })
    expect(banner(hab({ motivo: 'La foto está borrosa' }))).toMatchObject({
      clave: 'borrador', motivo: 'La foto está borrosa',
    })
  })

  test('en revisión', () => {
    expect(banner(hab({ estado: 'EN_REVISION' }))).toMatchObject({ clave: 'revision', variante: 'alerta' })
  })

  test('aprobada dice cuándo vence lo más próximo', () => {
    const cerca = new Date(AHORA + 30 * DIA)
    const lejos = new Date(AHORA + 300 * DIA)
    const h = hab({
      estado: 'APROBADA',
      requisitos: {
        identidad: { estado: 'VERIFICADO' },
        antecedentes: { estado: 'VERIFICADO', vence_en: lejos },
        email: { estado: 'VERIFICADO', vence_en: cerca },
      },
    })
    expect(banner(h)).toMatchObject({ clave: 'aprobada', variante: 'exito', venceEn: cerca })
  })

  test('aprobada con algo vencido pide renovar', () => {
    const h = hab({
      estado: 'APROBADA',
      requisitos: { antecedentes: { estado: 'VERIFICADO', vence_en: new Date(AHORA - DIA) } },
    })
    expect(banner(h)).toMatchObject({ clave: 'renovar', variante: 'alerta' })
  })

  test('rechazada y suspendida muestran el motivo', () => {
    expect(banner(hab({ estado: 'RECHAZADA', motivo: 'Documento falso' })))
      .toMatchObject({ clave: 'rechazada', variante: 'error', motivo: 'Documento falso' })
    expect(banner(hab({ estado: 'SUSPENDIDA', motivo: 'Quejas' })))
      .toMatchObject({ clave: 'suspendida', variante: 'error', motivo: 'Quejas' })
  })
})
