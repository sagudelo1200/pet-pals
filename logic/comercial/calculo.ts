/**
 * Cálculo de precios para mostrar al usuario (estimado).
 * El cobro real lo calcula el servidor con la misma fórmula
 * (functions/src/economia/calculo.ts); el test
 * __tests__/contrato-calculo-comercial.test.ts verifica que coincidan.
 */
import type {
  PoliticaComercial,
  PoliticaImpuestos,
  PoliticaServicio,
} from '@/models/operacionesEconomicas'

/**
 * Precio de un paseo para un tutor (COP, entero): base por hora más recargo
 * por cada mascota adicional, proporcional a la duración.
 */
export function calcularPrecioPaseo(
  politica: PoliticaServicio,
  numMascotas: number,
  duracionMinutos: number
): number {
  if (numMascotas <= 0 || duracionMinutos <= 0) return 0
  const { base_por_hora, mascota_adicional } = politica.precio
  const porHora = base_por_hora + (numMascotas - 1) * mascota_adicional
  return Math.round((porHora * duracionMinutos) / 60)
}

export interface DesgloseCobro {
  valor_acordado: number
  remuneracion_mandatario: number
  recursos_administrados: number
  comision_base: number
  iva_comision: number
}

/**
 * Desglose de un precio en comisión (base + IVA) y dinero del cuidador.
 * Con IVA incluido sale de la comisión; sin incluir se suma al precio.
 */
export function desglosarCobro(
  servicio: PoliticaServicio,
  impuestos: PoliticaImpuestos,
  precio: number
): DesgloseCobro {
  const comision = Math.round(
    (precio * servicio.comision.porcentaje_plataforma) / 100
  )
  const recursos_administrados = precio - comision
  const iva = impuestos.iva_comision

  if (!iva.aplica || iva.porcentaje === 0) {
    return {
      valor_acordado: precio,
      remuneracion_mandatario: comision,
      recursos_administrados,
      comision_base: comision,
      iva_comision: 0,
    }
  }
  if (iva.incluido_en_precio) {
    const comision_base = Math.round(comision / (1 + iva.porcentaje / 100))
    return {
      valor_acordado: precio,
      remuneracion_mandatario: comision,
      recursos_administrados,
      comision_base,
      iva_comision: comision - comision_base,
    }
  }
  const iva_comision = Math.round((comision * iva.porcentaje) / 100)
  return {
    valor_acordado: precio + iva_comision,
    remuneracion_mandatario: comision + iva_comision,
    recursos_administrados,
    comision_base: comision,
    iva_comision,
  }
}

/** Total que paga el tutor por un paseo (incluye el IVA si se suma aparte). */
export function calcularTotalPaseo(
  politica: PoliticaComercial,
  numMascotas: number,
  duracionMinutos: number
): number {
  const servicio = politica.por_tipo.paseo
  const precio = calcularPrecioPaseo(servicio, numMascotas, duracionMinutos)
  return desglosarCobro(servicio, politica.impuestos, precio).valor_acordado
}

/** Lo que recibe el cuidador de un valor, según la comisión vigente. */
export function calcularIngresoCuidador(
  politica: PoliticaServicio,
  valor: number
): number {
  return (
    valor - Math.round((valor * politica.comision.porcentaje_plataforma) / 100)
  )
}

/** Formato de moneda colombiana sin decimales: $18.000 */
export function formatearCOP(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`
}
