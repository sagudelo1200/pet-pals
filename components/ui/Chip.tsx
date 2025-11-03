import React from 'react'
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native'
import { COLOR } from '@/constants'
import Icon from './Icon'

/**
 * Props del Chip: pill seleccionable con ícono opcional y botón de cierre
 */
export interface ChipProps {
  label: string
  /** Tamaño visual del chip */
  size?: 'sm' | 'md' | 'lg'
  selected?: boolean
  disabled?: boolean
  onPress?: () => void
  onClose?: () => void
  leftIconName?: React.ComponentProps<typeof Icon>['name']
  style?: ViewStyle | ViewStyle[]
  testID?: string
}

/**
 * Chip: etiqueta interactiva con estados de selección/deshabilitado.
 */
const Chip: React.FC<ChipProps> = ({
  label,
  size = 'md',
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

  // Tamaños
  const paddingH = size === 'sm' ? 10 : size === 'lg' ? 14 : 12
  const paddingV = size === 'sm' ? 6 : size === 'lg' ? 10 : 8
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 14 : 13
  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14
  const closeSize = iconSize

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        {
          backgroundColor: bg,
          opacity,
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
        },
        style,
      ]}
    >
      {leftIconName ? (
        <Icon
          name={leftIconName}
          size={iconSize}
          color={COLOR.TEXTO}
          containerStyle={{ marginRight: 6 }}
        />
      ) : null}
      <Text style={[styles.label, { color: text, fontSize }]}>{label}</Text>
      {onClose ? (
        <Pressable onPress={onClose} hitSlop={8} style={styles.close}>
          <Icon name="times" size={closeSize} color={COLOR.TEXTO} />
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
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '700',
  },
  close: {
    marginLeft: 8,
  },
})

export default Chip
