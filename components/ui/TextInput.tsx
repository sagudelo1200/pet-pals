import React, { useMemo, useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import { COLOR } from '@/constants'

/**
 * Props del TextInput unificado (envuelve galio-framework/Input)
 */
interface Props {
  label?: string
  value: string
  onChangeText?: (_text: string) => void
  placeholder?: string
  secureTextEntry?: boolean
  iconName?: string // FontAwesome5 icon name (left side)
  rightIcon?: string // FontAwesome5 icon name (right side)
  onRightIconPress?: () => void // Callback when right icon is pressed
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
 * TextInput: input con label, ícono izquierdo opcional, ícono derecho interactivo y estado de error.
 * - Usa RNTextInput nativo para mejor control sobre los iconos
 * - Soporta ícono izquierdo (iconName) e ícono derecho interactivo (rightIcon)
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
      rightIcon,
      onRightIconPress,
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

    const containerStyle: ViewStyle | ViewStyle[] = [
      styles.container,
      ...(Array.isArray(style) ? style : style ? [style] : []),
    ]

    const borderColor = useMemo(() => {
      if (errorText) return COLOR.ERROR
      return focused ? COLOR.ENFASIS : COLOR.BORDE
    }, [errorText, focused])

    const inputColor = errorText ? COLOR.ERROR : COLOR.TEXTO

    const inputStyle: (ViewStyle | TextStyle)[] = [
      styles.input,
      { borderColor } as ViewStyle,
      ...(iconName ? [{ paddingLeft: 48 } as ViewStyle] : []),
      ...(rightIcon ? [{ paddingRight: 48 } as ViewStyle] : []),
      ...(multiline
        ? [
            {
              height: 'auto',
              minHeight: 48,
              textAlignVertical: 'top',
              paddingTop: 12,
            } as TextStyle,
          ]
        : []),
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
        <View style={styles.inputWrapper}>
          {/* Left Icon */}
          {iconName && (
            <View style={styles.leftIconContainer}>
              <FontAwesome5
                name={iconName as any}
                size={18}
                color={errorText ? COLOR.ERROR : COLOR.SUBTEXTO}
                solid
              />
            </View>
          )}

          {/* Text Input */}
          <RNTextInput
            key={secureTextEntry ? 'secure' : 'visible'}
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLOR.SUBTEXTO}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoFocus={autoFocus}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={editable}
            multiline={multiline}
            numberOfLines={numberOfLines}
            style={[inputStyle, { color: inputColor }]}
          />

          {/* Right Icon (interactive) */}
          {rightIcon && (
            <TouchableOpacity
              style={styles.rightIconContainer}
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
            >
              <FontAwesome5
                name={rightIcon as any}
                size={18}
                color={errorText ? COLOR.ERROR : COLOR.SUBTEXTO}
                solid
              />
            </TouchableOpacity>
          )}
        </View>
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
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: COLOR.BLOQUE,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 16,
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
  leftIconContainer: {
    position: 'absolute',
    left: 10,
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 10,
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
  },
})

export default TextInput
