import React, { useMemo, useState } from 'react'
import { StyleSheet, Text, View, ViewStyle } from 'react-native'
import { COLOR } from '@/constants'
import { Input } from 'galio-framework'

/**
 * Props del TextInput unificado (envuelve galio-framework/Input)
 */
interface Props {
  label?: string
  value: string
  onChangeText?: React.ComponentProps<typeof Input>['onChangeText']
  placeholder?: string
  secureTextEntry?: boolean
  iconName?: string // FontAwesome5 icon name
  errorText?: string
  style?: ViewStyle | ViewStyle[]
  testID?: string
  keyboardType?: any
  autoCapitalize?: any
  autoFocus?: boolean
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send'
  onSubmitEditing?: () => void
  onBlur?: () => void
  onFocus?: () => void
  editable?: boolean
  multiline?: boolean
  numberOfLines?: number
}

/**
 * TextInput: input con label, ícono opcional y estado de error.
 * - Usa `galio-framework/Input` por debajo para mantener consistencia.
 * - Acepta ref para control de foco desde componentes padres.
 */
const TextInput = React.forwardRef<any, Props>(
  (
    {
      label,
      value,
      onChangeText,
      placeholder,
      secureTextEntry,
      iconName,
      errorText,
      style,
      testID,
      keyboardType,
      autoCapitalize = 'none',
      autoFocus,
      returnKeyType,
      onSubmitEditing,
      onBlur,
      onFocus,
      editable,
      multiline,
      numberOfLines,
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false)

    // Cast Input to any to avoid missing prop types in Galio definition
    const GalioInput: React.ComponentType<any> = Input as any

    const containerStyle: ViewStyle | ViewStyle[] = [
      styles.container,
      ...(Array.isArray(style) ? style : style ? [style] : []),
    ]

    const borderColor = useMemo(() => {
      if (errorText) return COLOR.ERROR
      return focused ? COLOR.ENFASIS : COLOR.BORDE
    }, [errorText, focused])

    const inputColor = errorText ? COLOR.ERROR : COLOR.TEXTO

    const inputStyle = [
      styles.input,
      { borderColor },
      multiline && {
        height: 'auto',
        minHeight: 48,
        textAlignVertical: 'top',
        paddingTop: 12,
      },
    ]

    const handleBlur = () => {
      setFocused(false)
      onBlur?.()
    }

    const handleFocus = () => {
      setFocused(true)
      onFocus?.()
    }

    return (
      <View style={containerStyle} testID={testID}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <GalioInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLOR.SUBTEXTO}
          password={secureTextEntry}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoFocus={autoFocus}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={handleFocus}
          onBlur={handleBlur}
          color={inputColor}
          icon={iconName}
          family="FontAwesome5"
          iconProps={{
            size: 18,
            color: errorText ? COLOR.ERROR : COLOR.SUBTEXTO,
            solid: true,
          }}
          style={inputStyle as any}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
        />
        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      </View>
    )
  }
)

TextInput.displayName = 'TextInput'

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  input: {
    height: 48,
    backgroundColor: COLOR.BLOQUE,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  label: {
    color: COLOR.SUBTEXTO,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  error: {
    color: COLOR.ERROR,
    marginTop: 6,
    fontSize: 12,
  },
})

export default TextInput
