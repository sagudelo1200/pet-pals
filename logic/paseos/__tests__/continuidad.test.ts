/* eslint-env jest */
import { argumentosParaPedirDeNuevo } from '../continuidad'

describe('argumentosParaPedirDeNuevo', () => {
  test('arma la solicitud con el mismo cuidador y las mismas mascotas', () => {
    expect(
      argumentosParaPedirDeNuevo({
        id_cuidador: 'c1',
        mascota_ids: ['m1', 'm2'],
      })
    ).toEqual({
      abrirSolicitar: true,
      mascotaIds: ['m1', 'm2'],
      cuidadorId: 'c1',
      forzarMascotaInicial: true,
    })
  })

  test('sin cuidador asignado no se puede pedir de nuevo', () => {
    expect(argumentosParaPedirDeNuevo({ mascota_ids: ['m1'] })).toBeNull()
    expect(
      argumentosParaPedirDeNuevo({ id_cuidador: '', mascota_ids: ['m1'] })
    ).toBeNull()
  })

  test('copia la lista de mascotas, no la comparte', () => {
    const ids = ['m1']
    const args = argumentosParaPedirDeNuevo({
      id_cuidador: 'c1',
      mascota_ids: ids,
    })!
    args.mascotaIds.push('otra')
    expect(ids).toEqual(['m1'])
  })
})
