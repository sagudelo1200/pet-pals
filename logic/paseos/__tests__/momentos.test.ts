/* eslint-env jest */
import {
  ATAJOS_DE_MOMENTO,
  armarMomento,
  claveDeEtiqueta,
  GRUPOS_DEL_MENU,
  pideConfirmacion,
  seguimientoDe,
  ultimoLugarDelPaseo,
} from '../momentos'
import {
  GRUPOS_MOMENTO,
  momentoPorClave,
  validarMomento,
} from '@/functions/src/compartido/expediente'

const bitacora = (accion: string) => ({
  evento: 'bitacora',
  payload: { accion },
})

describe('ultimoLugarDelPaseo', () => {
  test('devuelve el lugar más reciente (la lista llega del más nuevo al más viejo)', () => {
    expect(
      ultimoLugarDelPaseo([
        bitacora('como_esta.jugo'),
        bitacora('lugar_y_ambiente.lugar_parque'),
        bitacora('lugar_y_ambiente.lugar_sendero'),
      ])
    ).toBe('lugar_y_ambiente.lugar_parque')
  })

  test('ignora el clima, otros eventos y paseos sin lugar', () => {
    expect(
      ultimoLugarDelPaseo([
        bitacora('lugar_y_ambiente.clima_lluvia'),
        {
          evento: 'incidente',
          payload: { accion: 'lugar_y_ambiente.lugar_parque' },
        },
        { evento: 'FINALIZAR_PASEO' },
      ])
    ).toBeUndefined()
    expect(ultimoLugarDelPaseo([])).toBeUndefined()
  })
})

describe('seguimientos y confirmación', () => {
  test('solo "se puso nervioso" y el conflicto tienen seguimiento', () => {
    expect(seguimientoDe('como_esta.se_puso_nervioso')).toBe('causa_y_calma')
    expect(seguimientoDe('emergencia.conflicto_con_otro_perro')).toBe(
      'detalle_del_conflicto'
    )
    expect(seguimientoDe('como_esta.jugo')).toBeUndefined()
    expect(seguimientoDe('no.existe')).toBeUndefined()
  })

  test('solo la emergencia crítica pide confirmación', () => {
    expect(pideConfirmacion(momentoPorClave('emergencia.emergencia')!)).toBe(
      true
    )
    expect(pideConfirmacion(momentoPorClave('emergencia.lesion')!)).toBe(false)
    expect(pideConfirmacion(momentoPorClave('como_esta.jugo')!)).toBe(false)
  })
})

describe('armarMomento', () => {
  test('agrega el último lugar como contexto, salvo a otro lugar', () => {
    const parque = 'lugar_y_ambiente.lugar_parque'
    expect(armarMomento('como_esta.jugo', parque)).toEqual({
      clave: 'como_esta.jugo',
      lugar: parque,
    })
    expect(armarMomento('lugar_y_ambiente.lugar_sendero', parque)).toEqual({
      clave: 'lugar_y_ambiente.lugar_sendero',
    })
    expect(armarMomento('como_esta.jugo', undefined)).toEqual({
      clave: 'como_esta.jugo',
    })
  })

  test('incluye solo lo que se eligió en el seguimiento', () => {
    expect(
      armarMomento('como_esta.se_puso_nervioso', undefined, {
        causa: 'motos_o_carros',
        calmo_con: undefined,
      })
    ).toEqual({ clave: 'como_esta.se_puso_nervioso', causa: 'motos_o_carros' })
    expect(
      armarMomento('emergencia.conflicto_con_otro_perro', undefined, {
        detalle_del_conflicto: 'ladro_o_gruno',
      })
    ).toEqual({
      clave: 'emergencia.conflicto_con_otro_perro',
      detalle_del_conflicto: 'ladro_o_gruno',
    })
  })

  test('lo que arma la app es válido para el servidor', () => {
    const momento = armarMomento(
      'como_esta.se_puso_nervioso',
      'lugar_y_ambiente.lugar_parque',
      { causa: 'ruido_fuerte', calmo_con: 'con_voz_suave' }
    )
    expect(
      validarMomento({
        ...momento,
        cuidador_id: 'c1',
        paseo_id: 'p1',
        fecha_ms: 1,
      })
    ).toEqual([])
  })
})

describe('menú', () => {
  test('los atajos existen en el catálogo y los grupos son los del catálogo', () => {
    for (const clave of ATAJOS_DE_MOMENTO) {
      expect(momentoPorClave(clave)).toBeDefined()
    }
    expect([...GRUPOS_DEL_MENU].sort()).toEqual([...GRUPOS_MOMENTO].sort())
  })

  test('la clave de la etiqueta sigue la ruta de i18n', () => {
    expect(claveDeEtiqueta('como_esta.jugo')).toBe(
      'paseos:momentos.opciones.como_esta.jugo'
    )
  })
})
