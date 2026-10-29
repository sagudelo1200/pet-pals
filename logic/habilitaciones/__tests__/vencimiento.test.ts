import { DIAS_AVISO_VENCIMIENTO, avisosDeVencimiento } from '../vencimiento'

const AHORA = Date.UTC(2026, 9, 25, 12)
const DIA = 86_400_000
const perfil = (vence: unknown, habilitados: unknown = ['paseo']) => ({
  servicios_habilitados: habilitados,
  servicios_vencen: { paseo: vence },
})

describe('avisosDeVencimiento', () => {
  test('lejos de vencer, no hay aviso', () => {
    expect(avisosDeVencimiento(perfil(AHORA + 200 * DIA), AHORA)).toEqual([])
  })

  test('dentro de la ventana, avisa que está por vencer', () => {
    const vence = AHORA + 10 * DIA
    expect(avisosDeVencimiento(perfil(vence), AHORA)).toEqual([
      { servicio: 'paseo', estado: 'por_vencer', venceEn: new Date(vence) },
    ])
  })

  test('justo en el límite de la ventana avisa; un instante antes no', () => {
    expect(avisosDeVencimiento(perfil(AHORA + DIAS_AVISO_VENCIMIENTO * DIA), AHORA)).toHaveLength(1)
    expect(avisosDeVencimiento(perfil(AHORA + DIAS_AVISO_VENCIMIENTO * DIA + 1), AHORA)).toEqual([])
  })

  test('ya vencida: avisa que venció (a la hora exacta también)', () => {
    expect(avisosDeVencimiento(perfil(AHORA - DIA), AHORA)[0]).toMatchObject({ estado: 'vencida' })
    expect(avisosDeVencimiento(perfil(AHORA), AHORA)[0]).toMatchObject({ estado: 'vencida' })
  })

  test('respeta los días de aviso que se le pasen', () => {
    expect(avisosDeVencimiento(perfil(AHORA + 40 * DIA), AHORA, 60)).toHaveLength(1)
    expect(avisosDeVencimiento(perfil(AHORA + 40 * DIA), AHORA, 30)).toEqual([])
  })

  test('sin habilitación vigente en el perfil (suspendida, en renovación) no hay aviso', () => {
    expect(avisosDeVencimiento(perfil(AHORA - DIA, []), AHORA)).toEqual([])
    expect(avisosDeVencimiento(perfil(AHORA + DIA, null), AHORA)).toEqual([])
  })

  test('sin vencimiento (no vence) o con datos mal formados, nada', () => {
    expect(avisosDeVencimiento({ servicios_habilitados: ['paseo'], servicios_vencen: {} }, AHORA)).toEqual([])
    expect(avisosDeVencimiento(perfil('mañana'), AHORA)).toEqual([])
    expect(avisosDeVencimiento(perfil(null), AHORA)).toEqual([])
    expect(avisosDeVencimiento(null, AHORA)).toEqual([])
    expect(avisosDeVencimiento(undefined, AHORA)).toEqual([])
    expect(avisosDeVencimiento({ servicios_habilitados: 'paseo', servicios_vencen: 5 }, AHORA)).toEqual([])
  })

  test('un servicio que no existe en el catálogo se ignora', () => {
    expect(
      avisosDeVencimiento(
        { servicios_habilitados: ['vuelo'], servicios_vencen: { vuelo: AHORA - DIA } },
        AHORA
      )
    ).toEqual([])
  })
})
