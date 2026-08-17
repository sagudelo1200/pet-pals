import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native'
import { Icon } from '@/components/ui'
import { COLOR } from '@/constants'

interface OTPCodeInputProps {
  onComplete: (_code: string) => Promise<void>
  isLoading?: boolean
  error?: string
  title?: string
  subtitle?: string
  intentosFallidos?: number
  intentosMaximos?: number
  timeoutSeconds?: number
  onTimeoutChange?: (_segundosRestantes: number) => void
}

export function OTPCodeInput({
  onComplete,
  isLoading = false,
  error = '',
  title = 'Código de verificación',
  subtitle = 'Ingresa el código de 6 dígitos',
  intentosFallidos = 0,
  intentosMaximos = 3,
  timeoutSeconds,
  onTimeoutChange,
}: OTPCodeInputProps) {
  const [codigo, setCodigo] = useState('')
  const [localError, setLocalError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [disponible, setDisponible] = useState(true)
  const inputRef = useRef<TextInput>(null)
  const spinnerFadeAnim = useRef(new Animated.Value(0)).current

  // Timer para timeout
  useEffect(() => {
    if (!timeoutSeconds || timeoutSeconds <= 0) {
      return undefined
    }

    let timeLeft = timeoutSeconds
    onTimeoutChange?.(timeLeft)

    const interval = setInterval(() => {
      timeLeft -= 1
      onTimeoutChange?.(timeLeft)

      if (timeLeft <= 0) {
        setDisponible(false)
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [timeoutSeconds, onTimeoutChange])

  // Animar spinner de verificación
  useEffect(() => {
    if (isLoading) {
      Animated.timing(spinnerFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(spinnerFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }, [isLoading, spinnerFadeAnim])

  const handleCodigoChange = (text: string) => {
    const soloNumeros = text.replace(/[^0-9]/g, '')
    const limitado = soloNumeros.slice(0, 6)
    setCodigo(limitado)
    setLocalError('')

    // Auto-submit cuando se completan 6 dígitos
    if (limitado.length === 6) {
      handleSubmit(limitado)
    }
  }

  const handleSubmit = async (codigoAValidar: string = codigo) => {
    if (codigoAValidar.length !== 6) {
      setLocalError('El código debe tener 6 dígitos')
      return
    }

    if (!disponible) {
      setLocalError('El código ha expirado')
      return
    }

    setIsProcessing(true)
    try {
      await onComplete(codigoAValidar)
      setCodigo('')
    } catch (err: any) {
      setLocalError(err.message || 'Código incorrecto')
      setCodigo('')
      inputRef.current?.focus()
    } finally {
      setIsProcessing(false)
    }
  }

  const intentosRestantes = Math.max(0, intentosMaximos - intentosFallidos)
  const estaBloqueado = intentosRestantes === 0

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>{title}</Text>
        <Text style={styles.subtitulo}>{subtitle}</Text>
      </View>

      {!estaBloqueado ? (
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={[styles.input, (localError || error) && styles.inputError]}
            placeholder="000000"
            placeholderTextColor={COLOR.INACTIVO}
            keyboardType="numeric"
            maxLength={6}
            value={codigo}
            onChangeText={handleCodigoChange}
            editable={!isLoading && !isProcessing && disponible}
            autoFocus
          />

          <View style={styles.digitosVisuales}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.digito,
                  i < codigo.length && styles.digitoLleno,
                  isLoading && styles.digitoVerificando,
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={COLOR.PRIMARIO}
                    animating={isLoading}
                  />
                ) : codigo[i] ? (
                  <Icon name="paw" size={24} color={COLOR.PRIMARIO} />
                ) : null}
              </View>
            ))}
          </View>

          {/* Feedback de verificación */}
          {isLoading && (
            <Animated.View
              style={[styles.verificandoBox, { opacity: spinnerFadeAnim }]}
            >
              <ActivityIndicator size="small" color={COLOR.PRIMARIO} />
              <Text style={styles.verificandoTexto}>Verificando código...</Text>
            </Animated.View>
          )}

          {(localError || error) && !isLoading && (
            <View style={styles.errorBox}>
              <Icon name="exclamation-circle" size={16} color={COLOR.ERROR} />
              <Text style={styles.errorTexto}>{localError || error}</Text>
            </View>
          )}

          {intentosRestantes > 0 &&
            !estaBloqueado &&
            !isLoading &&
            !(localError || error) && (
              <Text
                style={[
                  styles.intentosTexto,
                  intentosRestantes === 1 && styles.intentosTextoUltimo,
                ]}
              >
                {intentosRestantes === intentosMaximos
                  ? `Tienes ${intentosRestantes} intentos`
                  : intentosRestantes === 1
                    ? 'Último intento disponible'
                    : `${intentosRestantes} intentos restantes`}
              </Text>
            )}

          {!disponible && !isLoading && (
            <View style={styles.expiradoBox}>
              <Text style={styles.expiradoTexto}>
                El código ha expirado. Solicita uno nuevo.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.bloqueadoBox}>
          <Icon name="lock" size={32} color={COLOR.ERROR} />
          <Text style={styles.bloqueadoTexto}>
            Intentos agotados. Solicita un nuevo código.
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    marginBottom: 24,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
  },
  inputContainer: {
    width: '100%',
  },
  input: {
    fontSize: 18,
    fontWeight: '500',
    color: COLOR.TEXTO,
    borderBottomWidth: 2,
    borderBottomColor: COLOR.BORDE,
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputError: {
    borderBottomColor: COLOR.ERROR,
  },
  digitosVisuales: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  digito: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLOR.BORDE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLOR.BLOQUE,
  },
  digitoLleno: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: `${COLOR.PRIMARIO}20`,
    shadowColor: COLOR.PRIMARIO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  digitoVerificando: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: `${COLOR.PRIMARIO}10`,
    opacity: 0.8,
  },
  verificandoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLOR.PRIMARIO}10`,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.PRIMARIO,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  verificandoTexto: {
    marginLeft: 8,
    fontSize: 13,
    color: COLOR.PRIMARIO,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLOR.ERROR}10`,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.ERROR,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  errorTexto: {
    marginLeft: 8,
    fontSize: 13,
    color: COLOR.ERROR,
    fontWeight: '500',
    flex: 1,
  },
  intentosTexto: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    marginTop: 8,
  },
  intentosTextoUltimo: {
    color: COLOR.ALERTA,
    fontWeight: '600',
  },
  expiradoBox: {
    backgroundColor: `${COLOR.ALERTA}10`,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.ALERTA,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 12,
  },
  expiradoTexto: {
    fontSize: 13,
    color: COLOR.ALERTA,
    fontWeight: '500',
  },
  bloqueadoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: `${COLOR.ERROR}10`,
    borderRadius: 8,
  },
  bloqueadoTexto: {
    marginTop: 12,
    fontSize: 14,
    color: COLOR.ERROR,
    fontWeight: '600',
    textAlign: 'center',
  },
})
