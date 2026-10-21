/**
 * Contrato app ↔ servidor: el precio que ve el tutor al reservar debe ser
 * exactamente el que cobra el servidor al finalizar el paseo.
 */
import {
  calcularPrecioPaseo,
  calcularIngresoCuidador,
  desglosarCobro,
} from '@/logic/comercial/calculo'
import * as servidor from '../functions/src/economia/calculo'

const POLITICAS = [
  {
    precio: { base_por_hora: 18000, mascota_adicional: 5000 },
    comision: { porcentaje_plataforma: 10 },
  },
  {
    precio: { base_por_hora: 23333, mascota_adicional: 4999 },
    comision: { porcentaje_plataforma: 12.5 },
  },
]

const IMPUESTOS = [
  { iva_comision: { aplica: true, porcentaje: 19, incluido_en_precio: true } },
  { iva_comision: { aplica: true, porcentaje: 19, incluido_en_precio: false } },
  { iva_comision: { aplica: false, porcentaje: 19, incluido_en_precio: true } },
  { iva_comision: { aplica: true, porcentaje: 5, incluido_en_precio: true } },
]

describe('contrato de cálculo comercial', () => {
  test.each(POLITICAS)('precio e ingreso coinciden con el servidor', p => {
    for (const mascotas of [0, 1, 2, 3, 5]) {
      for (const minutos of [0, 30, 45, 60, 90, 120]) {
        const app = calcularPrecioPaseo(p, mascotas, minutos)
        expect(app).toBe(servidor.calcularPrecioPaseo(p, mascotas, minutos))
        for (const impuestos of IMPUESTOS) {
          // El total que ve el tutor y el reparto coinciden con el servidor
          expect(desglosarCobro(p, impuestos, app)).toEqual(
            servidor.desglosarCobro(p, impuestos, app)
          )
          expect(calcularIngresoCuidador(p, app)).toBe(
            servidor.desglosarCobro(p, impuestos, app).recursos_administrados
          )
        }
      }
    }
  })
})
