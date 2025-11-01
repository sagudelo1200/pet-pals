import React from 'react'
import { StyleSheet, ViewStyle } from 'react-native'
import { Input } from 'galio-framework'

import { COLOR } from '../constants'

// Props interface
interface ArInputProps {
  shadowless?: boolean
  success?: boolean
  error?: boolean
  style?: ViewStyle | ViewStyle[]
  placeholder?: string
  placeholderTextColor?: string
  color?: string
  [key: string]: any // Para permitir props adicionales del Input de Galio
}

interface ArInputState {}

class ArInput extends React.Component<ArInputProps, ArInputState> {
  static defaultProps: Partial<ArInputProps> = {
    shadowless: false,
    success: false,
    error: false,
  }

  render(): React.ReactNode {
    const { shadowless, success, error, style, ...otherProps } = this.props

    const inputStyles: ViewStyle = StyleSheet.flatten([
      styles.input,
      !shadowless && styles.shadow,
      success && styles.success,
      error && styles.error,
      style,
    ])

    return (
      <Input
        placeholder="write something here"
        placeholderTextColor={COLOR.SUBTEXTO}
        style={inputStyles}
        color={COLOR.TEXTO}
        icon="link"
        family="AntDesign"
        iconProps={{
          size: 14,
          color: COLOR.TEXTO,
        }}
        {...otherProps}
      />
    )
  }
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 4,
    borderColor: COLOR.BORDE,
    height: 44,
    backgroundColor: COLOR.SECUNDARIO,
  },
  success: {
    borderColor: COLOR.EXITO,
  },
  error: {
    borderColor: COLOR.ERROR,
  },
  shadow: {
    shadowColor: COLOR.BASE,
    shadowOffset: { width: 0, height: 0.5 },
    shadowRadius: 1,
    shadowOpacity: 0.13,
    elevation: 2,
  },
})

export default ArInput
