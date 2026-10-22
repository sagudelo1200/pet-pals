/**
 * Política comercial versionada: precios, comisión, IVA, cobro, liquidación
 * y contabilidad. El modelo vive en un solo lugar, compartido con el
 * servidor: functions/src/compartido/politicaComercial.ts.
 */
export type {
  ContenidoPoliticaComercial,
  PoliticaCobro,
  PoliticaComercial,
  PoliticaContable,
  PoliticaImpuestos,
  PoliticaLiquidacion,
  PoliticaServicio,
} from '@/functions/src/compartido/politicaComercial'

import type { ContenidoPoliticaComercial } from '@/functions/src/compartido/politicaComercial'

/** Datos editables al publicar una nueva versión. */
export type DatosPoliticaComercial = ContenidoPoliticaComercial
