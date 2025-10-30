export const COLORS = {
  // Dark Green Palette
  DEFAULT: '#0A1411',       // Very dark green, almost black (Background)
  PRIMARY: '#33B07E',       // Vibrant mint green (Main actions)
  SECONDARY: '#1A2F2B',     // Dark green (Secondary surfaces, headers)
  BLOCK: '#142520',         // Slightly darker green (Cards, blocks)
  TEXT: '#E1EFE6',          // Light green-tinted white (Main text)
  MUTED: '#89ac9aff',       // Muted green-gray (Subdued text)
  INPUT: '#244036',         // Dark green for input backgrounds
  INPUT_SUCCESS: '#57A773', // Success green
  INPUT_ERROR: '#F44336',   // Error red
  BORDER: '#244036',        // For borders
  
  // Component-specific (only those in use)
  ICON: '#E1EFE6',          // Same as text
  HEADER: '#1A2F2B',        // Same as secondary

  // Inversions for dark mode
  WHITE: '#E1EFE6',         // Represents the main background
  BLACK: '#0A1411',         // Represents the main text color
} as const;

export const COLOR = {
  BASE:           '#0A1411',  // Fondo base: verde muy oscuro, casi negro (atmósfera principal)
  PRIMARIO:       '#22A47C',  // Verde menta brillante: acciones principales y botones CTA
  SECUNDARIO:     '#122B28',  // Verde profundo: headers, cards, contenedores secundarios
  BLOQUE:         '#0F2521',  // Verde neutro: superficies, bloques de contenido
  TEXTO:          '#E6F3EF',  // Blanco suave: legible sin ser agresivo
  SUBTEXTO:       '#9AAFA8',  // Verde grisáceo: texto secundario, etiquetas
  BORDE:          '#173633',  // Verde gris oscuro: bordes y divisores sutiles
  ENFASIS:        '#36C7A1',  // Verde-agua brillante: acentos, iconos activos, detalles
  EXITO:          '#219C63',  // Verde éxito clásico: validaciones y confirmaciones
  ERROR:          '#E06A6A',  // Rojo suave: errores y alertas críticas
  INFO:           '#3393C4',  // Azul: mensajes informativos
  ALERTA:         '#E5BF45',  // Amarillo cálido: advertencias
  INACTIVO:       '#30403C',  // Verde gris apagado: elementos deshabilitados
} as const;

export default {
  colors: COLORS,
  COLORS,
  COLOR
};
