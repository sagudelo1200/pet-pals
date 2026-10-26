/**
 * Fechas puras compartidas (sin dependencias).
 */

/**
 * Suma meses calendario sin desbordar el mes.
 * 31 de enero + 1 mes = 28 (o 29) de febrero, no 3 de marzo.
 * @param {Date} fecha Fecha de partida.
 * @param {number} meses Meses a sumar.
 * @return {Date} Fecha resultante (la original no se modifica).
 */
export function sumarMesesCalendario(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha);
  const diaOriginal = resultado.getUTCDate();

  resultado.setUTCDate(1);
  resultado.setUTCMonth(resultado.getUTCMonth() + meses);

  const ultimoDiaMes = new Date(Date.UTC(
    resultado.getUTCFullYear(),
    resultado.getUTCMonth() + 1,
    0
  )).getUTCDate();

  resultado.setUTCDate(Math.min(diaOriginal, ultimoDiaMes));
  return resultado;
}
