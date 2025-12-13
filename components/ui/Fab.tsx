import React from 'react'
import { Pressable, StyleSheet, ViewStyle } from 'react-native'
import Icon from './Icon'
import { COLOR } from '@/constants'

export interface FabProps {
  onPress: () => void
  iconName?: React.ComponentProps<typeof Icon>['name']
  size?: number
  backgroundColor?: string
  color?: string
  style?: ViewStyle | ViewStyle[]
  accessibilityLabel?: string
}

const Fab: React.FC<FabProps> = ({
  onPress,
  iconName = 'plus',
  size = 57,
  backgroundColor = COLOR.PRIMARIO,
  color = '#fff',
  style,
  accessibilityLabel,
}) => {
  const iconSize = Math.floor(size * 0.5)

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: true }}
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2, backgroundColor },
        style,
      ]}
    >
      <Icon name={iconName as any} size={iconSize} color={color} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    // shadow iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    // elevation Android
    elevation: 8,
  },
})

export default Fab
