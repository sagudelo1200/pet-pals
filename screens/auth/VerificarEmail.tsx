import React, { useCallback, useRef, useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Animated,
} from 'react-native'
import { Block } from 'galio-framework'
import { COLOR } from '@/constants'
import { Icon } from '@/components/ui'
import { OTPCodeInput } from '@/components/ui/OTPCodeInput'
import Screen from '@/components/ui/Screen'
import { useAuth } from '@/context/AuthContext'
import { tErrorMaybe } from '@/services/i18n'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { AuthFlowParamList } from '@/navigation/types'
import { functions } from '@/firebase.config'
import { httpsCallable } from 'firebase/functions'
import MensajeEnviadoSvg from '@/assets/imgs/undraw/mensaje_enviado.svg'
import { RETRASO_REENVIO_OTP_SEGUNDOS } from '@/constants/limits'

type Nav = StackNavigationProp<AuthFlowParamList>

const TIEMPO_EXPIRACION_OTP = 10 * 60 * 1000 // 10 minutos
const RETRASO_REENVIO_MS = RETRASO_REENVIO_OTP_SEGUNDOS * 1000 // Convertir a ms

const VerificarEmail: React.FC = () => {
  const navigation = useNavigation<Nav>()
  const authContext = useAuth()
  const { user, recargarUsuarioAuth } = authContext
  const recargarPerfilPublico = (authContext as any).recargarPerfilPublico
  const { t } = useTranslation()

  // Estado mínimo
  const [errorOtp, setErrorOtp] = useState('')
  const [tiempoRestante, setTiempoRestante] = useState(TIEMPO_EXPIRACION_OTP)
  const [reintentosUsados, setReintentosUsados] = useState(0)
  const [enviando, setEnviando] = useState(true)
  const [retrasoReenvio, setRetrasoReenvio] = useState(0) // ms restantes antes de permitir reenvío
  const [mensajeEnvio, setMensajeEnvio] = useState<{
    tipo: 'exito' | 'error'
    texto: string
  } | null>(null) // Feedback de envío de OTP
  const [verificandoOtp, setVerificandoOtp] = useState(false) // Loading mientras se sincroniza verificación

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideUpAnim = useRef(new Animated.Value(50)).current

  // Ref para evitar setState después de desmontaje
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Iniciar animaciones al montar
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  // Simple effect para detectar cuando el usuario se verifica
  useEffect(() => {
    if (user?.emailVerified) {
      // Ya verificado, dejar que AuthNavigator maneje la navegación
      // No hacer nada aquí - el contexto se encargará
    }
  }, [user?.emailVerified])

  // Enviar OTP por email al montar
  useEffect(() => {
    const enviarOTPInicial = async () => {
      if (!user?.email || !user?.uid) {
        return
      }

      try {
        const enviarOTPFn = httpsCallable<
          { email: string; uid: string },
          { success: boolean; error?: string }
        >(functions, 'enviarOTP')

        const result = await enviarOTPFn({
          email: user.email,
          uid: user.uid,
        })

        if (!isMountedRef.current) {
          return
        }

        if (result.data.success) {
          // Mostrar feedback de éxito
          setMensajeEnvio({
            tipo: 'exito',
            texto: `✅ ${t('auth:otp.enviado_exitosamente') || 'Código enviado a tu email'}`,
          })
          // Auto-ocultar después de 4 segundos
          setTimeout(() => {
            if (isMountedRef.current) {
              setMensajeEnvio(null)
            }
          }, 4000)
        } else {
          // Mostrar feedback de error
          const errorMsg = result.data.error || t('comun:intenta_nuevamente')
          setErrorOtp(errorMsg)
          setMensajeEnvio({
            tipo: 'error',
            texto: `❌ ${errorMsg}`,
          })
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          const errorMsg = tErrorMaybe(
            err?.message,
            t('comun:intenta_nuevamente')
          )
          setErrorOtp(errorMsg)
          setMensajeEnvio({
            tipo: 'error',
            texto: `❌ ${errorMsg}`,
          })
        }
      } finally {
        if (isMountedRef.current) {
          setEnviando(false)
        }
      }
    }

    enviarOTPInicial()
  }, [user?.email, user?.uid, t])

  // Timer del OTP (countdown de 10 minutos)
  useEffect(() => {
    if (tiempoRestante <= 0) {
      return () => {}
    }

    const interval = setInterval(() => {
      if (isMountedRef.current) {
        setTiempoRestante(prev => {
          const nuevoTiempo = prev - 1000
          return nuevoTiempo <= 0 ? 0 : nuevoTiempo
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [tiempoRestante])

  // Timer del retraso de reenvío (evita spam)
  useEffect(() => {
    if (retrasoReenvio <= 0) {
      return () => {}
    }

    const interval = setInterval(() => {
      if (isMountedRef.current) {
        setRetrasoReenvio(prev => {
          const nuevoTiempo = prev - 1000
          return nuevoTiempo <= 0 ? 0 : nuevoTiempo
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [retrasoReenvio])

  const handleVerificarOtp = useCallback(
    async (codigo: string): Promise<void> => {
      if (!user?.uid) {
        throw new Error(t('comun:algo_salio_mal'))
      }

      try {
        if (!isMountedRef.current) {
          return
        }
        setVerificandoOtp(true)

        const validarOTP = httpsCallable<
          { uid: string; codigo: string },
          { success: boolean; error?: string; mensaje?: string }
        >(functions, 'validarOTP')

        const result = await validarOTP({
          uid: user.uid,
          codigo,
        })

        if (!isMountedRef.current) {
          return
        }

        if (result.data.success) {
          // Recargar usuario para sincronizar emailVerified = true
          if (recargarUsuarioAuth) {
            await recargarUsuarioAuth()
          }

          // CRÍTICO: Polling para esperar a que el trigger de Cloud Function
          // actualice insignias_verificacion en Firestore
          // El trigger es asincrónico, así que recargarPerfilPublico inicial podría traer datos stale
          const maxIntentosPolling = 30 // 30 x 200ms = 6 segundos max
          let intentosPolling = 0
          let emailVerificadoEnFirestore = false

          while (
            intentosPolling < maxIntentosPolling &&
            !emailVerificadoEnFirestore &&
            isMountedRef.current
          ) {
            if (recargarPerfilPublico) {
              await recargarPerfilPublico()
            }

            // Pequeño delay antes de verificar (200ms) - permite que el trigger execute
            await new Promise(resolve => setTimeout(resolve, 200))

            // Verificar si la insignia está presente (acceso directo a authContext)
            const emailVerificadoAhora =
              authContext.perfilPublico?.insignias_verificacion?.includes(
                'EMAIL'
              )
            if (emailVerificadoAhora) {
              emailVerificadoEnFirestore = true
              break
            }

            intentosPolling++
          }

          if (!isMountedRef.current) {
            return
          }

          // Si después del polling sigue sin estar verificado, lanzar error
          if (!emailVerificadoEnFirestore) {
            throw new Error(
              t('auth:otp.error_sincronizacion') ||
                'Error sincronizando verificación. Intenta nuevamente.'
            )
          }

          // Dejar que AuthNavigator maneje la navegación
          // AuthNavigator verá el cambio en perfilPublico?.insignias_verificacion['EMAIL']
        } else {
          throw new Error(
            result.data.error ||
              t('auth:otp.codigo_incorrecto') ||
              'Código incorrecto'
          )
        }
      } finally {
        if (isMountedRef.current) {
          setVerificandoOtp(false)
        }
      }
    },
    [user?.uid, recargarUsuarioAuth, recargarPerfilPublico, authContext, t]
  )

  const handleReenviarOtp = useCallback(async () => {
    if (!user?.email || !user?.uid) return

    if (isMountedRef.current) {
      setEnviando(true)
      setErrorOtp('')
      setMensajeEnvio(null)
    }

    try {
      const enviarOTPFn = httpsCallable<
        { email: string; uid: string },
        { success: boolean; error?: string }
      >(functions, 'enviarOTP')

      const result = await enviarOTPFn({
        email: user.email,
        uid: user.uid,
      })

      if (!isMountedRef.current) {
        return
      }

      if (result.data.success) {
        setTiempoRestante(TIEMPO_EXPIRACION_OTP)
        setReintentosUsados(0)
        setRetrasoReenvio(RETRASO_REENVIO_MS) // Aplicar retraso de reenvío

        // Mostrar feedback de éxito
        setMensajeEnvio({
          tipo: 'exito',
          texto: `✅ ${t('auth:otp.enviado_nuevamente') || 'Código reenviado exitosamente'}`,
        })

        // Auto-ocultar después de 4 segundos
        setTimeout(() => {
          if (isMountedRef.current) {
            setMensajeEnvio(null)
          }
        }, 4000)
      } else {
        const errorMsg = result.data.error || t('comun:intenta_nuevamente')
        throw new Error(errorMsg)
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        const errorMsg = tErrorMaybe(
          err?.message,
          t('comun:intenta_nuevamente')
        )
        setErrorOtp(errorMsg)

        // Mostrar feedback de error
        setMensajeEnvio({
          tipo: 'error',
          texto: `❌ ${errorMsg}`,
        })
      }
    } finally {
      if (isMountedRef.current) {
        setEnviando(false)
      }
    }
  }, [user?.email, user?.uid, t])

  const formatearTiempo = (ms: number): string => {
    const totalSegundos = Math.ceil(ms / 1000)
    const minutos = Math.floor(totalSegundos / 60)
    const segundos = totalSegundos % 60
    return `${minutos}:${segundos.toString().padStart(2, '0')}`
  }

  const formatearSegundos = (ms: number): string => {
    return Math.ceil(ms / 1000).toString()
  }

  const handleCambiarCorreo = useCallback(() => {
    if (!isMountedRef.current) return
    navigation.reset({
      index: 0,
      routes: [{ name: 'Registro' as any }],
    })
  }, [navigation])

  if (!user?.email) {
    return (
      <Screen>
        <Block flex center middle>
          <Text>{t('comun:cargando')}</Text>
        </Block>
      </Screen>
    )
  }

  return (
    <Screen contentContainerStyle={styles.screenContent}>
      {/* Banner de feedback de envío */}
      {mensajeEnvio && (
        <View
          style={[
            styles.bannerFeedback,
            mensajeEnvio.tipo === 'exito'
              ? styles.bannerExito
              : styles.bannerError,
          ]}
        >
          <Text
            style={[
              styles.bannerText,
              mensajeEnvio.tipo === 'exito'
                ? styles.bannerTextExito
                : styles.bannerTextError,
            ]}
          >
            {mensajeEnvio.texto}
          </Text>
        </View>
      )}

      <View style={styles.container}>
        {/* Encabezado con SVG y mensaje */}
        <Animated.View style={[styles.headerSection, { opacity: fadeAnim }]}>
          <MensajeEnviadoSvg width={80} height={80} style={styles.svgMessage} />
          <Text style={styles.message}>{t('auth:otp.mensaje_inicial')}</Text>
          <View style={styles.emailContainer}>
            <Text style={styles.email}>{user.email}</Text>
            <TouchableOpacity onPress={handleCambiarCorreo}>
              <Icon name="edit" size={16} color={COLOR.PRIMARIO} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Contenido principal (OTP y controles) */}
        <Animated.View
          style={[
            styles.mainSection,
            {
              opacity: slideUpAnim.interpolate({
                inputRange: [0, 50],
                outputRange: [1, 0],
              }),
              transform: [
                {
                  translateY: slideUpAnim.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, 50],
                  }),
                },
              ],
            },
          ]}
        >
          {!enviando ? (
            <>
              {/* Entrada OTP */}
              <OTPCodeInput
                onComplete={handleVerificarOtp}
                isLoading={verificandoOtp}
                error={errorOtp}
                title={t('auth:otp.ingresa_codigo')}
                subtitle={t('auth:otp.ingresa_codigo_instrucciones')}
                intentosFallidos={reintentosUsados}
                intentosMaximos={3}
                timeoutSeconds={Math.ceil(tiempoRestante / 1000)}
                onTimeoutChange={() => {}}
              />

              {/* Fila: Timer + Botón Reenvío */}
              <View style={styles.footerRow}>
                <View style={styles.timerBlock}>
                  <Text style={styles.timerLabel}>
                    {t('auth:otp.tiempo_restante')}
                  </Text>
                  <Text
                    style={[
                      styles.timerValor,
                      tiempoRestante < 60000 && styles.timerCritico,
                    ]}
                  >
                    {formatearTiempo(tiempoRestante)}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleReenviarOtp}
                  disabled={enviando || retrasoReenvio > 0}
                  style={[
                    styles.reenvioButton,
                    (enviando || retrasoReenvio > 0) &&
                      styles.reenvioButtonDisabled,
                  ]}
                >
                  <Icon
                    name="sync"
                    size={14}
                    color={
                      enviando || retrasoReenvio > 0
                        ? COLOR.INACTIVO
                        : COLOR.PRIMARIO
                    }
                  />
                  <Text
                    style={[
                      styles.reenvioText,
                      (enviando || retrasoReenvio > 0) &&
                        styles.reenvioTextDisabled,
                    ]}
                  >
                    {retrasoReenvio > 0
                      ? `${formatearSegundos(retrasoReenvio)}s`
                      : t('auth:otp.reenviar_codigo')}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.cargandoContainer}>
              <Text style={styles.cargandoText}>{t('comun:enviando')}...</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Screen>
  )
}

export default VerificarEmail

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
  },
  /* Banner de feedback (éxito/error) */
  bannerFeedback: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bannerExito: {
    backgroundColor: '#D4EDDA',
    borderLeftWidth: 4,
    borderLeftColor: '#28A745',
  },
  bannerError: {
    backgroundColor: '#F8D7DA',
    borderLeftWidth: 4,
    borderLeftColor: '#DC3545',
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  bannerTextExito: {
    color: '#155724',
  },
  bannerTextError: {
    color: '#721C24',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  svgMessage: {
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: COLOR.TEXTO,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  email: {
    fontWeight: '600',
    color: COLOR.PRIMARIO,
    fontSize: 14,
  },
  mainSection: {
    flex: 1,
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  timerBlock: {
    alignItems: 'center',
    flex: 1,
  },
  timerLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginBottom: 4,
  },
  timerValor: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.PRIMARIO,
  },
  timerCritico: {
    color: COLOR.ALERTA,
  },
  reenvioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLOR.PRIMARIO,
    gap: 6,
    flex: 1,
  },
  reenvioButtonDisabled: {
    borderColor: COLOR.INACTIVO,
    opacity: 0.6,
  },
  reenvioText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.PRIMARIO,
  },
  reenvioTextDisabled: {
    color: COLOR.INACTIVO,
  },
  cargandoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  cargandoText: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
  },
})
