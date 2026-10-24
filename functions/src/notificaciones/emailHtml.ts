const escapar = (texto: string): string => texto
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/**
 * Cuerpo HTML del email de una notificación (el texto se escapa).
 * @param {string} titulo Título del aviso.
 * @param {string} cuerpo Texto del aviso.
 * @return {string} HTML.
 */
export function htmlNotificacion(titulo: string, cuerpo: string): string {
  return '<div style="font-family:Arial,sans-serif;max-width:480px;' +
    'margin:auto;padding:24px;color:#1b1b1b">' +
    `<h2 style="margin:0 0 12px">${escapar(titulo)}</h2>` +
    '<p style="margin:0 0 16px;font-size:15px;line-height:1.5">' +
    `${escapar(cuerpo)}</p>` +
    '<p style="margin:0;font-size:12px;color:#777">Paw-Path · Abre la app ' +
    'para ver los detalles.</p></div>';
}
