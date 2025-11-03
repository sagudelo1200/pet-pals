import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { COLOR } from '@/constants'

/**
 * Props del divisor (línea separadora)
 */
export interface DividerProps {
  vertical?: boolean
  color?: string
  thickness?: number
  inset?:
    | number
    | { left?: number; right?: number; top?: number; bottom?: number }
  dashed?: boolean
  style?: ViewStyle | ViewStyle[]
  testID?: string
}

/**
 * Divider: línea horizontal/vertical para separar contenido.
 * - Soporta color, grosor, desplazamientos (inset) y estilo punteado.
 */
const Divider: React.FC<DividerProps> = ({
  vertical,
  color = COLOR.BORDE,
  thickness = StyleSheet.hairlineWidth,
  inset,
  dashed,
  style,
  testID,
}) => {
  const isVertical = !!vertical

  const resolvedInset =
    typeof inset === 'number'
      ? isVertical
        ? { top: inset, bottom: inset }
        : { left: inset, right: inset }
      : inset || {}

  const base: ViewStyle = isVertical
    ? { width: thickness, alignSelf: 'stretch' }
    : { height: thickness, alignSelf: 'stretch' }

  const marginStyle: ViewStyle = {
    marginLeft: resolvedInset.left,
    marginRight: resolvedInset.right,
    marginTop: resolvedInset.top,
    marginBottom: resolvedInset.bottom,
  }

  const dashedStyle: ViewStyle | undefined = dashed
    ? isVertical
      ? {
          width: 0,
          borderLeftWidth: thickness,
          borderLeftColor: color,
          borderStyle: 'dashed',
        }
      : {
          height: 0,
          borderBottomWidth: thickness,
          borderBottomColor: color,
          borderStyle: 'dashed',
        }
    : undefined

  const solidStyle: ViewStyle | undefined = dashed
    ? undefined
    : { backgroundColor: color }

  return (
    <View
      testID={testID}
      style={[base, solidStyle, dashedStyle, marginStyle, style]}
    />
  )
}

export default Divider
