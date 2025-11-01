import React from 'react'
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native'
import { COLOR } from '@/constants'

export type BadgeVariant =
  | 'primario'
  | 'secundario'
  | 'info'
  | 'error'
  | 'exito'
  | 'alerta'
  | 'enfasis'
  | 'base'
  | 'inactivo'
  | 'neutral'

export interface BadgeProps {
  label: string
  variant?: BadgeVariant
  textColor?: string
  size?: 'sm' | 'md'
  style?: ViewStyle | ViewStyle[]
  textStyle?: TextStyle | TextStyle[]
  testID?: string
}

const variantToColor = (variant: BadgeVariant) => {
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
    case 'neutral':
    default:
      return COLOR.BLOQUE
  }
}

const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  textColor = COLOR.TEXTO,
  size = 'sm',
  style,
  textStyle,
  testID,
}) => {
  const bg = variantToColor(variant)
  const padding =
    size === 'sm'
      ? { paddingVertical: 4, paddingHorizontal: 8 }
      : { paddingVertical: 6, paddingHorizontal: 10 }
  const font = size === 'sm' ? { fontSize: 12 } : { fontSize: 13 }

  return (
    <View
      testID={testID}
      style={[styles.base, { backgroundColor: bg }, padding, style]}
    >
      <Text style={[styles.text, { color: textColor }, font, textStyle]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
  },
})

export default Badge
