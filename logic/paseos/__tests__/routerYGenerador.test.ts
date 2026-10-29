/* eslint-env jest */
import { obtenerExperienciaPaseo } from '@/logic/paseos/routerPaseos'
import {
  generarCodigoRecogida,
  generarCodigosRecogidaPorTutor,
  validarFormatoCodigo,
} from '@/logic/paseos/generador'
import { ESTADOS_PASEO, type Paseo } from '@/models/Paseo'

const paseo = (estado: ESTADOS_PASEO) => ({ id: 'p1', estado }) as Paseo

describe('obtenerExperienciaPaseo', () => {
  it('sin paseo o sin rol no hay experiencia', () => {
    expect(obtenerExperienciaPaseo(null, 'tutor').tipo).toBe('NINGUNA')
    expect(obtenerExperienciaPaseo(paseo(ESTADOS_PASEO.PENDIENTE), null).tipo).toBe('NINGUNA')
  })

  it.each([
    [ESTADOS_PASEO.FINALIZADO, 'ResumenPaseo'],
    [ESTADOS_PASEO.COMPLETADO, 'DetalleHistorico'],
    [ESTADOS_PASEO.CANCELADO, 'AvisoCancelacion'],
    [ESTADOS_PASEO.ERROR, 'AvisoCancelacion'],
  ])('estado final %s → %s para cualquier rol', (estado, id) => {
    expect(obtenerExperienciaPaseo(paseo(estado), 'tutor').id).toBe(id)
    expect(obtenerExperienciaPaseo(paseo(estado), 'cuidador').id).toBe(id)
  })

  it.each([
    [ESTADOS_PASEO.PENDIENTE, 'EsperandoCuidador', 'MODAL'],
    [ESTADOS_PASEO.CONFIRMADO, 'PreparacionPaseo', 'MODAL'],
    [ESTADOS_PASEO.EN_CAMINO, 'PaseoActivo', 'PANTALLA'],
    [ESTADOS_PASEO.EN_PUNTO_RECOGIDA, 'PaseoActivo', 'PANTALLA'],
    [ESTADOS_PASEO.EN_PROGRESO, 'PaseoActivo', 'PANTALLA'],
  ])('tutor: %s → %s (%s)', (estado, id, tipo) => {
    const exp = obtenerExperienciaPaseo(paseo(estado), 'tutor')
    expect(exp.id).toBe(id)
    expect(exp.tipo).toBe(tipo)
  })

  it.each([
    [ESTADOS_PASEO.PENDIENTE, 'SolicitudRecibida'],
    [ESTADOS_PASEO.CONFIRMADO, 'ControlPaseo'],
    [ESTADOS_PASEO.EN_CAMINO, 'ControlPaseo'],
    [ESTADOS_PASEO.EN_PUNTO_RECOGIDA, 'ControlPaseo'],
    [ESTADOS_PASEO.EN_PROGRESO, 'ControlPaseo'],
  ])('cuidador: %s → %s', (estado, id) => {
    expect(obtenerExperienciaPaseo(paseo(estado), 'cuidador').id).toBe(id)
  })

  it('el mapa solo se muestra en las pantallas de seguimiento', () => {
    expect(obtenerExperienciaPaseo(paseo(ESTADOS_PASEO.EN_PROGRESO), 'tutor').configuracion.mostrarMapa).toBe(true)
    expect(obtenerExperienciaPaseo(paseo(ESTADOS_PASEO.PENDIENTE), 'tutor').configuracion.mostrarMapa).toBe(false)
  })
})

describe('generador de códigos (recogida y entrega)', () => {
  it('genera códigos de exactamente 6 dígitos', () => {
    for (let i = 0; i < 200; i++) {
      expect(generarCodigoRecogida()).toMatch(/^\d{6}$/)
    }
  })

  it('genera un código independiente por tutor', () => {
    const codigos = generarCodigosRecogidaPorTutor(['t1', 't2', 't3'])
    expect(Object.keys(codigos)).toEqual(['t1', 't2', 't3'])
    Object.values(codigos).forEach(c => expect(validarFormatoCodigo(c)).toBe(true))
  })

  it('sin tutores devuelve un mapa vacío', () => {
    expect(generarCodigosRecogidaPorTutor([])).toEqual({})
  })

  it.each([
    ['123456', true],
    [' 123456 ', true],
    ['12345', false],
    ['1234567', false],
    ['12a456', false],
    ['', false],
  ])('validarFormatoCodigo(%p) → %s', (codigo, esperado) => {
    expect(validarFormatoCodigo(codigo)).toBe(esperado)
  })
})
