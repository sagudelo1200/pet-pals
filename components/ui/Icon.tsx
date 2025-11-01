import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'

export type IconType = 'solid' | 'regular' | 'brands'

export interface IconProps {
  name: React.ComponentProps<typeof FontAwesome5>['name']
  size?: number
  color?: string
  type?: IconType // peso del ícono: solid (default), regular o brands
  style?: any // estilo del ícono
  containerStyle?: ViewStyle | ViewStyle[] // estilo del contenedor
  testID?: string
}

/**
 * Icono unificado de Pet Pals
 * - Base FontAwesome5 (expo)
 * - Por defecto usa estilo 'solid' para consistencia visual
 */
const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color = '#fff',
  type = 'solid',
  style,
  containerStyle,
  testID,
}) => {
  const normalizedType: IconType = ['solid', 'regular', 'brands'].includes(type)
    ? type
    : 'solid'

  const solid = normalizedType === 'solid' ? true : undefined
  const regular = normalizedType === 'regular' ? true : undefined
  const brands = normalizedType === 'brands' ? true : undefined

  const box: ViewStyle = {
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <View style={[styles.box, box, containerStyle]}>
      <FontAwesome5
        name={name}
        size={size}
        color={color}
        solid={solid}
        regular={regular}
        brands={brands}
        style={style}
        testID={testID}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    minWidth: 1,
  },
})

export default Icon
