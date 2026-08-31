/**
 * Plantilla HTML para territorio vivo
 * Se importa como módulo TypeScript, no desde archivo en tiempo de ejecución
 */
import territorioHTML from './templates/territorio-vivo'

/**
 * Inyecta datos dinámicos en la plantilla de territorio vivo
 * Reemplaza placeholders seguros sin riesgo de XSS
 * @returns HTML renderizado
 */
export function injectTerritorioData(
  topInset: number,
  bottomInset: number,
  ciudad: string,
  totalZonas: number,
  zonasJson: string,
  coloresJson: string
): string {
  // Placeholders seguros (no permiten JavaScript)
  const replacements: Record<string, string> = {
    '{{TOP_INSET}}': String(topInset),
    '{{BOTTOM_INSET}}': String(bottomInset),
    '{{CIUDAD}}': String(ciudad),
    '{{TOTAL_ZONAS}}': String(totalZonas),
    '{{ZONAS_JSON}}': zonasJson,
    '{{COLORES_JSON}}': coloresJson,
  }

  let html = territorioHTML

  // Reemplazar cada placeholder de forma segura
  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.replace(
      new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      value
    )
  }

  return html
}

export default {
  injectTerritorioData,
}
