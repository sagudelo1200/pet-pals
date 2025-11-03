import React from 'react'
import { View, ViewStyle } from 'react-native'

/**
 * Espaciador simple para layouts
 */
export interface SpacerProps {
  size?: number
  horizontal?: boolean
  flex?: boolean
  style?: ViewStyle | ViewStyle[]
  testID?: string
}

/**
 * Spacer: crea espacio horizontal o vertical.
 * - Si `flex` es true, ocupa el espacio disponible.
 */
const Spacer: React.FC<SpacerProps> = ({
  size = 12,
  horizontal = false,
  flex,
  style,
  testID,
}) => {
  const base: ViewStyle = flex
    ? { flex: 1 }
    : horizontal
      ? { width: size }
      : { height: size }

  return <View testID={testID} style={[base, style]} />
}

export default Spacer
