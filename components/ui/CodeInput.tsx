import React, { useRef, useEffect } from 'react'
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { COLOR } from '@/constants'
import Icon from './Icon'

interface CodeInputProps {
  /** Número de dígitos esperados (por defecto 6) */
  length?: number
  /** Valor actual del código */
  value: string
  /** Callback cuando cambia el valor */
  onChangeText: (_code: string) => void
  /** Texto de error a mostrar */
  errorText?: string
  /** Callback cuando el código está completo (length dígitos ingresados) */
  onComplete?: (_code: string) => void
  /** Si está deshabilitado */
  disabled?: boolean
  /** Si está cargando */
  isLoading?: boolean
  /** Tipo de visualización: 'bullets' (●) o 'digits' (números visibles) */
  displayType?: 'bullets' | 'digits'
  /** Estilos personalizados */
  containerStyle?: ViewStyle
  inputStyle?: TextStyle
  digitStyle?: ViewStyle
  label?: string
  placeholder?: string
  autoFocus?: boolean
}

/**
 * Componente genérico para entrada de código de N dígitos.
 * Reutilizable para OTP, códigos de recogida, etc.
 *
 * Features:
 * - Solo acepta números
 * - Visualización de puntos (●) o dígitos
 * - Callback cuando está completo
 * - Manejo de errores
 * - Keyboard-aware
 */
export const CodeInput: React.FC<CodeInputProps> = ({
  length = 6,
  value,
  onChangeText,
  errorText,
  onComplete,
  disabled = false,
  isLoading = false,
  displayType = 'bullets',
  containerStyle,
  inputStyle,
  digitStyle,
  label,
  placeholder = '0'.repeat(length),
  autoFocus = false,
}) => {
  const inputRef = useRef<TextInput | null>(null)

  // Trigger onComplete cuando el código está lleno
  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value)
    }
  }, [value, length, onComplete])

  const handleChangeText = (text: string) => {
    // Solo números
    const soloNumeros = text.replace(/[^0-9]/g, '')
    // Limitar a length dígitos
    const limitado = soloNumeros.slice(0, length)
    onChangeText(limitado)
  }

  const isFull = value.length === length
  const isEditable = !disabled && !isLoading && !isFull

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}

        {/* Input invisible pero activo */}
        <TextInput
          ref={inputRef}
          style={[styles.hiddenInput, inputStyle]}
          value={value}
          onChangeText={handleChangeText}
          keyboardType="number-pad"
          maxLength={length}
          editable={isEditable}
          autoFocus={autoFocus}
          placeholder={placeholder}
          placeholderTextColor={COLOR.INACTIVO}
          selectTextOnFocus
        />

        {/* Visualización de dígitos */}
        <View style={styles.digitsContainer}>
          {Array.from({ length }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.digit,
                digitStyle,
                i < value.length && styles.digitFilled,
                errorText && styles.digitError,
              ]}
              onTouchEnd={() => inputRef.current?.focus()}
            >
              {value[i] && (
                <Text style={styles.digitText}>
                  {displayType === 'digits' ? value[i] : '●'}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Error message */}
        {errorText && (
          <View style={styles.errorBox}>
            <Icon name="exclamation-circle" size={16} color={COLOR.ERROR} />
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  digitsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  digit: {
    width: 50,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLOR.PRIMARIO,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLOR.BASE,
  },
  digitFilled: {
    backgroundColor: `${COLOR.PRIMARIO}15`,
    borderColor: COLOR.PRIMARIO,
  },
  digitError: {
    borderColor: COLOR.ERROR,
    backgroundColor: `${COLOR.ERROR}15`,
  },
  digitText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLOR.ERROR}15`,
    borderRadius: 6,
    padding: 10,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: COLOR.ERROR,
    flex: 1,
  },
})
