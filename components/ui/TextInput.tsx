import React, { useMemo, useState } from 'react'
import { StyleSheet, Text, View, ViewStyle } from 'react-native'
import { COLOR } from '@/constants'
import { Input } from 'galio-framework'

interface Props {
  label?: string
  value: string
  onChangeText: React.ComponentProps<typeof Input>['onChangeText']
  placeholder?: string
  secureTextEntry?: boolean
  iconName?: string // FontAwesome5 icon name
  errorText?: string
  style?: ViewStyle | ViewStyle[]
  testID?: string
  keyboardType?: any
  autoCapitalize?: any
}

const TextInput: React.FC<Props> = ({
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
}) => {
  const [focused, setFocused] = useState(false)

  const containerStyle: ViewStyle | ViewStyle[] = [
    styles.container,
    ...(Array.isArray(style) ? style : style ? [style] : []),
  ]

  const borderColor = useMemo(() => {
    if (errorText) return COLOR.ERROR
    return focused ? COLOR.ENFASIS : COLOR.BORDE
  }, [errorText, focused])

  const inputColor = errorText ? COLOR.ERROR : COLOR.TEXTO

  return (
    <View style={containerStyle} testID={testID}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLOR.SUBTEXTO}
        password={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        color={inputColor}
        icon={iconName}
        family="FontAwesome5"
        iconProps={{
          size: 18,
          color: errorText ? COLOR.ERROR : COLOR.SUBTEXTO,
          solid: true,
        }}
        style={[styles.input, { borderColor }] as any}
      />
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  )
}

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
