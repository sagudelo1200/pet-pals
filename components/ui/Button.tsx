import React, { useMemo } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native'
import { COLOR } from '@/constants'

export type ButtonVariant =
  | 'primario'
  | 'secundario'
  | 'info'
  | 'error'
  | 'exito'
  | 'alerta'
  | 'bloque'
  | 'enfasis'
  | 'base'
  | 'inactivo'

interface Props {
  title: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  style?: ViewStyle | ViewStyle[]
  textStyle?: any
  testID?: string
}

const Button: React.FC<Props> = ({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primario',
  size = 'md',
  fullWidth,
  style,
  textStyle,
  testID,
}) => {
  // Color de fondo base según la variante
  const bgColor = useMemo(() => {
    switch (variant) {
      case 'primario':
        return COLOR.PRIMARIO
      case 'secundario':
        return COLOR.SECUNDARIO
      case 'info':
        return COLOR.INFO
      case 'error':
        return COLOR.ERROR
      case 'exito':
        return COLOR.EXITO
      case 'alerta':
        return COLOR.ALERTA
      case 'enfasis':
        return COLOR.ENFASIS
      case 'base':
        return COLOR.BASE
      case 'inactivo':
        return COLOR.INACTIVO
      case 'bloque':
      default:
        return COLOR.BLOQUE
    }
  }, [variant])

  // Utilidades de color locales para calcular colores de "pressed"
  // Nota: son helpers mínimos para no traer dependencias extra
  const hexToRgb = (hex: string) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!m) return { r: 0, g: 0, b: 0 }
    return {
      r: parseInt(m[1], 16),
      g: parseInt(m[2], 16),
      b: parseInt(m[3], 16),
    }
  }
  // Convierte componentes RGB a notación HEX asegurando 2 dígitos por canal
  const rgbToHex = (r: number, g: number, b: number) =>
    `#${[r, g, b]
      .map(v => {
        const clamped = Math.max(0, Math.min(255, Math.round(v)))
        const s = clamped.toString(16)
        return s.length === 1 ? '0' + s : s
      })
      .join('')}`
  // Luminancia relativa (WCAG) para decidir si el color es claro u oscuro
  const luminance = (hex: string) => {
    const { r, g, b } = hexToRgb(hex)
    const [R, G, B] = [r, g, b].map(v => {
      const c = v / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * R + 0.7152 * G + 0.0722 * B
  }
  // Mezcla lineal de dos colores HEX
  const mix = (hex: string, withHex: string, weight = 0.5) => {
    const a = hexToRgb(hex)
    const b = hexToRgb(withHex)
    const w = Math.max(0, Math.min(1, weight))
    const r = a.r * (1 - w) + b.r * w
    const g = a.g * (1 - w) + b.g * w
    const bch = a.b * (1 - w) + b.b * w
    return rgbToHex(r, g, bch)
  }
  // Helpers para aclarar u oscurecer un color en cierto porcentaje
  const lighten = (hex: string, percent = 0.1) => mix(hex, '#ffffff', percent)
  const darken = (hex: string, percent = 0.1) => mix(hex, '#000000', percent)
  // Color de fondo cuando está presionado: si es oscuro, aclara; si es claro, oscurece
  const pressedBg = useMemo(() => {
    const lum = luminance(bgColor)
    const isDark = lum < 0.3
    const delta = 0.12
    return isDark ? lighten(bgColor, delta) : darken(bgColor, delta)
  }, [bgColor])

  // Tamaño visual del botón y del texto según `size`
  const height = size === 'sm' ? 40 : size === 'lg' ? 56 : 48
  const fontSize = size === 'sm' ? 14 : size === 'lg' ? 16 : 15

  // Padding horizontal y minWidth por tamaño para que los botones pequeños
  // no se vean comprimidos y respeten espacio visual en filas.
  const paddingHorizontal = size === 'sm' ? 12 : size === 'lg' ? 20 : 16
  const minWidth = size === 'sm' ? 92 : size === 'lg' ? 140 : 110

  const baseStyles: ViewStyle | ViewStyle[] = [
    styles.button,
    { height, paddingHorizontal, minWidth },
    fullWidth ? styles.fullWidth : undefined,
    ...(Array.isArray(style) ? style : style ? [style] : []),
  ]

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      // Efecto de onda en Android con un tono más oscuro del color base
      android_ripple={{ color: darken(bgColor, 0.22), borderless: false }}
      // En iOS/Android, usamos la prop style función para cambiar el fondo en "pressed"
      style={({ pressed }) => [
        ...baseStyles,
        {
          backgroundColor:
            pressed && !(disabled || loading) ? pressedBg : bgColor,
          opacity: disabled || loading ? 0.6 : 1,
        },
      ]}
    >
      {loading ? (
        // Mientras carga, mostramos spinner y ocultamos el texto
        <ActivityIndicator size="small" color={COLOR.TEXTO} />
      ) : (
        <Text style={[styles.text, { fontSize }, textStyle]}>{title}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 12, // Más redondeado y moderno
    alignItems: 'center',
    justifyContent: 'center',
    // Eliminamos sombras para look minimalista/plano
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  fullWidth: {
    alignSelf: 'stretch' as const,
  },
  text: {
    color: COLOR.TEXTO,
    fontWeight: '600', // Un poco menos pesado que 700
    letterSpacing: 0.5,
  },
})

export default Button
