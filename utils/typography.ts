import { PixelRatio } from 'react-native'

// Tope razonable del escalado de fuente para evitar romper la UI
const MAX_FONT_SCALE = 1.25

export function scaleFont(size: number): number {
  const fontScale = PixelRatio.getFontScale ? PixelRatio.getFontScale() : 1
  const applied = Math.min(fontScale, MAX_FONT_SCALE)
  return Math.round(size * applied)
}

export function setMaxFontScale(max: number) {
  // útil para tests o configuraciones futuras
  // no mutamos PixelRatio porque no es público; mantenemos la constante
  // esta función existe para futura expansión
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = max
}
