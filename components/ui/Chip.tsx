import React from 'react'
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native'
import { COLOR } from '@/constants'
import Icon from './Icon'

export interface ChipProps {
  label: string
  selected?: boolean
  disabled?: boolean
  onPress?: () => void
  onClose?: () => void
  leftIconName?: React.ComponentProps<typeof Icon>['name']
  style?: ViewStyle | ViewStyle[]
  testID?: string
}

const Chip: React.FC<ChipProps> = ({
  label,
  selected,
  disabled,
  onPress,
  onClose,
  leftIconName,
  style,
  testID,
}) => {
  const bg = selected ? COLOR.PRIMARIO : COLOR.BLOQUE
  const text = selected ? COLOR.TEXTO : COLOR.TEXTO
  const opacity = disabled ? 0.5 : 1

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, { backgroundColor: bg, opacity }, style]}
    >
      {leftIconName ? (
        <Icon
          name={leftIconName}
          size={12}
          color={COLOR.TEXTO}
          containerStyle={{ marginRight: 6 }}
        />
      ) : null}
      <Text style={[styles.label, { color: text }]}>{label}</Text>
      {onClose ? (
        <Pressable onPress={onClose} hitSlop={8} style={styles.close}>
          <Icon name="times" size={12} color={COLOR.TEXTO} />
        </Pressable>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  close: {
    marginLeft: 8,
  },
})

export default Chip
