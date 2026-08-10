import React, { useCallback, useRef, useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Alert,
  Animated,
  TouchableOpacity,
  Text,
} from 'react-native'
import { Block } from 'galio-framework'
import { COLOR } from '@/constants'
import { Button } from '@/components/ui'
import { CodeInput } from '@/components/ui/CodeInput'
import Screen from '@/components/ui/Screen'
import { useAuth } from '@/context/AuthContext'
import { tErrorMaybe } from '@/services/i18n'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { AuthFlowParamList } from '@/navigation/types'
import { functions } from '@/firebase.config'
import { httpsCallable } from 'firebase/functions'

type Nav = StackNavigationProp<AuthFlowParamList>

const TIEMPO_EXPIRACION_OTP = 10 * 60 * 1000 // 10 minutos
const REINTENTOS_CONFIG = [
  { numero: 1, cooldownMs: 60000 }, // 60 segundos
  { numero: 2, cooldownMs: 90000 }, // 90 segundos
  { numero: 3, cooldownMs: 120000 }, // 120 segundos
]

const VerificarEmail: React.FC = () => {
  const navigation = useNavigation<Nav>()
  const { user, recargarPerfil } = useAuth()
  const { t } = useTranslation()

  // Estado del OTP
  const [otpCode, setOtpCode] = useState('')
  const [errorOtp, setErrorOtp] = useState('')
  const [cargando, setCargando] = useState(false)

  // Estado del timer
  const [tiempoRestante, setTiempoRestante] = useState(TIEMPO_EXPIRACION_OTP)
  const [otpExpirado, setOtpExpirado] = useState(false)

  // Estado de reintentos
  const [reintentosUsados, setReintentosUsados] = useState(0)
  const [cooldownActivo, setCooldownActivo] = useState(false)
  const [tiempoCooldown, setTiempoCooldown] = useState(0)

  // Animaciones
  const messageOpacity = useRef(new Animated.Value(0)).current
  const messageTranslateY = useRef(new Animated.Value(20)).current
  const formOpacity = useRef(new Animated.Value(0)).current
  const formTranslateY = useRef(new Animated.Value(30)).current

  // Timer del OTP
  useEffect(() => {
    if (otpExpirado || tiempoRestante <= 0) {
      setOtpExpirado(true)
      return undefined
    }

    const interval = setInterval(() => {
      setTiempoRestante((prev: number) => {
        const nuevoTiempo = prev - 1000
        if (nuevoTiempo <= 0) {
          setOtpExpirado(true)
          return 0
        }
        return nuevoTiempo
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [otpExpirado, tiempoRestante])

  // Timer del cooldown
  useEffect(() => {
    if (!cooldownActivo || tiempoCooldown <= 0) {
      setCooldownActivo(false)
      return undefined
    }

    const interval = setInterval(() => {
      setTiempoCooldown((prev: number) => {
        const nuevoTiempo = prev - 1000
        if (nuevoTiempo <= 0) {
          setCooldownActivo(false)
          return 0
        }
        return nuevoTiempo
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [cooldownActivo, tiempoCooldown])

  // Animaciones de entrada
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(messageTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 500,
          delay: 100,
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 500,
          delay: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }, [])

  // Validar que tenemos email y uid
  useEffect(() => {
    if (!user?.email || !user?.uid) {
      Alert.alert(t('comun:error'), t('comun:algo_salio_mal'), [
        {
          text: t('comun:volver'),
          onPress: () => navigation.goBack(),
        },
      ])
    }
  }, [user, navigation, t])

  const formatearTiempo = (ms: number): string => {
    const totalSegundos = Math.ceil(ms / 1000)
    const minutos = Math.floor(totalSegundos / 60)
    const segundos = totalSegundos % 60
    return `${minutos}:${segundos.toString().padStart(2, '0')}`
  }

  const handleVerificarOtp = useCallback(async (): Promise<void> => {
    if (!user?.uid || !user?.email) {
      Alert.alert(t('comun:error'), t('comun:algo_salio_mal'))
      return
    }

    if (otpCode.length !== 6) {
      setErrorOtp(
        t('auth:otp.codigo_debe_tener_6') || 'Código debe tener 6 dígitos'
      )
      return
    }

    setCargando(true)
    setErrorOtp('')

    try {
      const validarOTP = httpsCallable<
        { uid: string; codigo: string },
        { success: boolean; error?: string; mensaje?: string }
      >(functions, 'validarOTP')

      const result = await validarOTP({
        uid: user.uid,
        codigo: otpCode,
      })

      if (result.data.success) {
        // ✅ OTP validado
        // El AuthNavigator detectará automáticamente que el usuario está verificado
        // y navegará a TutorApp. Por ahora, mostrar confirmación.
        Alert.alert(
          t('auth:otp.exito_titulo') || '¡Verificado!',
          t('auth:otp.exito_mensaje') || 'Email verificado correctamente',
          [
            {
              text: t('comun:continuar'),
              onPress: () => {
                // Recargar perfil para forzar actualización en AuthContext
                // El listener de AuthNavigator se encargará de navegar a TutorApp
                if (recargarPerfil) {
                  recargarPerfil()
                } else {
                  // Fallback: navegar al padre (AuthNavigator)
                  navigation.goBack()
                }
              },
            },
          ]
        )
      } else {
        // ❌ Error del servidor
        setErrorOtp(
          result.data.error ||
            t('auth:otp.error_verificacion') ||
            'Error verificando código'
        )

        // Incrementar reintentos y activar cooldown
        const nuevoIntentos = reintentosUsados + 1
        setReintentosUsados(nuevoIntentos)

        if (nuevoIntentos < REINTENTOS_CONFIG.length) {
          const cooldown = REINTENTOS_CONFIG[nuevoIntentos].cooldownMs
          setCooldownActivo(true)
          setTiempoCooldown(cooldown)
        } else {
          // Máximo reintentos alcanzado
          Alert.alert(
            t('auth:otp.maximos_reintentos_titulo') || 'Máximo de intentos',
            t('auth:otp.maximos_reintentos_msg') ||
              'Debes solicitar un nuevo código',
            [
              {
                text: t('comun:volver'),
                onPress: () => navigation.goBack(),
              },
            ]
          )
        }
      }
    } catch (err: any) {
      console.error('[VerificarEmail] Error validando OTP:', err)
      setErrorOtp(tErrorMaybe(err?.message, t('comun:intenta_nuevamente')))

      // Incrementar reintentos
      const nuevoIntentos = reintentosUsados + 1
      setReintentosUsados(nuevoIntentos)

      if (nuevoIntentos < REINTENTOS_CONFIG.length) {
        const cooldown = REINTENTOS_CONFIG[nuevoIntentos].cooldownMs
        setCooldownActivo(true)
        setTiempoCooldown(cooldown)
      }
    } finally {
      setCargando(false)
    }
  }, [user, otpCode, reintentosUsados, t, navigation])

  const handleReenviarCodigo = useCallback(async (): Promise<void> => {
    if (!user?.uid || !user?.email) {
      Alert.alert(t('comun:error'), t('comun:algo_salio_mal'))
      return
    }

    setCargando(true)
    setErrorOtp('')

    try {
      const enviarOTP = httpsCallable<
        { email: string; uid: string },
        { success: boolean; error?: string; mensaje?: string }
      >(functions, 'enviarOTP')

      const result = await enviarOTP({
        email: user.email,
        uid: user.uid,
      })

      if (result.data.success) {
        // ✅ Código reenviado
        setOtpCode('')
        setTiempoRestante(TIEMPO_EXPIRACION_OTP)
        setOtpExpirado(false)
        setCooldownActivo(false)

        Alert.alert(
          t('auth:otp.codigo_reenviado_titulo') || 'Código reenviado',
          t('auth:otp.codigo_reenviado_msg') || 'Revisa tu email'
        )
      } else {
        // Error del servidor
        setErrorOtp(
          result.data.error ||
            t('auth:otp.error_reenvio') ||
            'Error reenviando código'
        )
      }
    } catch (err: any) {
      console.error('[VerificarEmail] Error reenviando OTP:', err)
      setErrorOtp(tErrorMaybe(err?.message, t('comun:intenta_nuevamente')))
    } finally {
      setCargando(false)
    }
  }, [user, t])

  const puedeReenviar =
    !cooldownActivo && !cargando && reintentosUsados < REINTENTOS_CONFIG.length
  const mostrarCooldown =
    cooldownActivo && reintentosUsados < REINTENTOS_CONFIG.length

  return (
    <Screen contentContainerStyle={styles.content} style={styles.container}>
      <Block>
        {/* Mensaje emocional */}
        <Animated.View
          style={{
            opacity: messageOpacity,
            transform: [{ translateY: messageTranslateY }],
          }}
        >
          <Text style={styles.emotionalMessage}>
            🔐 {t('auth:otp.seguridad')}
          </Text>
          <Text style={styles.title}>
            {t('auth:otp.titulo') || 'Verifica tu Email'}
          </Text>
          <Text style={styles.subtitle}>
            {t('auth:otp.subtitulo') ||
              'Enviamos un código de 6 dígitos a tu correo'}
          </Text>
        </Animated.View>

        {/* Contenido principal */}
        <Animated.View
          style={[
            styles.form,
            {
              opacity: formOpacity,
              transform: [{ translateY: formTranslateY }],
            },
          ]}
        >
          {/* Timer y estado */}
          <View style={styles.statusContainer}>
            {!otpExpirado && (
              <>
                <Text style={styles.statusLabel}>
                  {t('auth:otp.tiempo_restante') || 'Tiempo restante'}:
                </Text>
                <Text style={styles.timerText}>
                  {formatearTiempo(tiempoRestante)}
                </Text>
              </>
            )}
            {otpExpirado && (
              <Text style={styles.expiradoText}>
                {t('auth:otp.codigo_expirado') || 'El código ha expirado'}
              </Text>
            )}
          </View>

          {/* Input de código */}
          <CodeInput
            length={6}
            value={otpCode}
            onChangeText={setOtpCode}
            errorText={errorOtp}
            disabled={cargando || otpExpirado}
            isLoading={cargando}
            displayType="digits"
            label={t('auth:otp.ingresa_codigo') || 'Código de verificación'}
            placeholder="000000"
            autoFocus
          />

          {/* Botón verificar */}
          <Button
            style={styles.botonVerificar}
            disabled={
              otpCode.length !== 6 || cargando || otpExpirado || cooldownActivo
            }
            loading={cargando}
            onPress={handleVerificarOtp}
            title={t('auth:otp.verificar') || 'Verificar'}
          />

          {/* Sección reenvío */}
          <View style={styles.reenvioContainer}>
            {!mostrarCooldown && (
              <>
                <Text style={styles.reenvioLabel}>
                  {t('auth:otp.no_recibiste_codigo') ||
                    '¿No recibiste el código?'}
                </Text>
                <TouchableOpacity
                  disabled={!puedeReenviar}
                  onPress={handleReenviarCodigo}
                >
                  <Text
                    style={[
                      styles.reenvioLink,
                      !puedeReenviar && styles.reenvioLinkDisabled,
                    ]}
                  >
                    {t('auth:otp.reenviar') || 'Reenviar código'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {mostrarCooldown && (
              <Text style={styles.cooldownText}>
                {t('auth:otp.espera_antes_reenviar', {
                  tiempo: formatearTiempo(tiempoCooldown),
                }) || `Espera ${formatearTiempo(tiempoCooldown)} para reenviar`}
              </Text>
            )}
          </View>

          {/* Info de intentos */}
          {reintentosUsados > 0 && (
            <View style={styles.infoIntentos}>
              <Text style={styles.infoIntentosText}>
                {t('auth:otp.intentos_restantes', {
                  restantes: REINTENTOS_CONFIG.length - reintentosUsados,
                }) ||
                  `Intentos restantes: ${REINTENTOS_CONFIG.length - reintentosUsados}`}
              </Text>
            </View>
          )}
        </Animated.View>
      </Block>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emotionalMessage: {
    fontSize: 16,
    color: COLOR.PRIMARIO,
    marginBottom: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLOR.INACTIVO,
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    gap: 20,
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: `${COLOR.PRIMARIO}10`,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: COLOR.INACTIVO,
    marginBottom: 4,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.PRIMARIO,
    fontFamily: 'monospace',
  },
  expiradoText: {
    fontSize: 14,
    color: COLOR.ERROR,
    fontWeight: '600',
  },
  botonVerificar: {
    marginTop: 12,
  },
  reenvioContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  reenvioLabel: {
    fontSize: 13,
    color: COLOR.INACTIVO,
    marginBottom: 8,
  },
  reenvioLink: {
    fontSize: 13,
    color: COLOR.PRIMARIO,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  reenvioLinkDisabled: {
    color: COLOR.INACTIVO,
    opacity: 0.5,
  },
  cooldownText: {
    fontSize: 13,
    color: COLOR.ENFASIS,
    fontWeight: '600',
    marginTop: 8,
  },
  infoIntentos: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: `${COLOR.ENFASIS}15`,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.ENFASIS,
  },
  infoIntentosText: {
    fontSize: 12,
    color: COLOR.ENFASIS,
    fontWeight: '600',
  },
})

export default VerificarEmail
