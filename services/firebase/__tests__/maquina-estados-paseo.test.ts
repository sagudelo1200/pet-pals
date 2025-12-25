/* eslint-env jest */
import { PaseoStatus } from '@/models/Paseo'
import {
  crearMaquinaPaseo,
  MaquinaEstadosPaseo,
} from '../maquina-estados-paseo'

describe('MaquinaEstadosPaseo', () => {
  let maquina: MaquinaEstadosPaseo

  beforeEach(() => {
    maquina = crearMaquinaPaseo()
  })

  it('debe iniciar en estado PENDIENTE por defecto', () => {
    expect(maquina.estado).toBe(PaseoStatus.PENDIENTE)
  })

  it('debe transicionar correctamente de PENDIENTE a ACEPTADO', () => {
    const nuevoEstado = maquina.transicion('ACEPTAR')
    expect(nuevoEstado).toBe(PaseoStatus.CONFIRMADO)
    expect(maquina.estado).toBe(PaseoStatus.CONFIRMADO)
  })

  it('debe fallar si la transición no es válida', () => {
    expect(() => maquina.transicion('FINALIZAR_PASEO')).toThrow(
      'Transición inválida'
    )
  })

  it('debe permitir cancelar desde PENDIENTE con motivo', () => {
    maquina.transicion('CANCELAR', { motivo: 'Tutor cambió de opinión' })
    expect(maquina.estado).toBe(PaseoStatus.CANCELADO)
  })

  it('debe fallar al cancelar sin motivo', () => {
    expect(() => maquina.transicion('CANCELAR')).toThrow(
      'Se requiere un motivo'
    )
  })

  // Flujo Feliz
  it('debe seguir el flujo completo: PENDIENTE -> ACEPTADO -> EN_PROGRESO -> FINALIZADO -> COMPLETADO', () => {
    maquina.transicion('ACEPTAR') // ACEPTADO
    maquina.transicion('INICIAR_PASEO') // EN_PROGRESO
    expect(maquina.estado).toBe(PaseoStatus.EN_PROGRESO)

    maquina.transicion('FINALIZAR_PASEO') // FINALIZADO
    expect(maquina.estado).toBe(PaseoStatus.FINALIZADO)

    maquina.transicion('CONFIRMAR_COMPLETADO') // COMPLETADO
    expect(maquina.estado).toBe(PaseoStatus.COMPLETADO)
  })

  it('debe permitir inicializar la máquina en un estado específico', () => {
    const m = crearMaquinaPaseo({ estado: PaseoStatus.EN_RUTA })
    expect(m.estado).toBe(PaseoStatus.EN_RUTA)
    expect(m.puede('LLEGAR')).toBe(true)
  })
})
