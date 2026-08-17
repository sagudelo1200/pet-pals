import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import {
  StyleSheet,
  View,
  Alert,
  Animated,
  Dimensions,
  Keyboard,
} from 'react-native'
import { Block, Text } from 'galio-framework'
import { COLOR } from '@/constants'
import { Button, TextInput } from '@/components/ui'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { BirthDatePicker } from '@/components/auth/BirthDatePicker'
import Screen from '@/components/ui/Screen'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { AuthFlowParamList } from '@/navigation/types'

type Nav = StackNavigationProp<AuthFlowParamList>

const { height } = Dimensions.get('window')

// Mapeo de códigos de error de autenticación a mensajes user-friendly
const getAuthErrorMessage = (
  errorCode: string | undefined,
  t: any
): { titulo: string; mensaje: string } => {
  if (!errorCode) {
    return {
      titulo: t('auth:registro.errores.registroFallido.titulo'),
      mensaje: t('comun:intenta_nuevamente'),
    }
  }

  const mensajeMap: Record<string, string> = {
    CORREO_EN_USO: 'auth:errores.CORREO_EN_USO',
    PASSWORD_DEBIL: 'auth:errores.PASSWORD_DEBIL',
    CORREO_INVALIDO: 'auth:errores.CORREO_INVALIDO',
    OPERACION_NO_PERMITIDA: 'auth:errores.OPERACION_NO_PERMITIDA',
    ERROR_RED: 'auth:errores.ERROR_RED',
  }

  const mensajeTraduccido = mensajeMap[errorCode]
    ? t(mensajeMap[errorCode])
    : t('comun:intenta_nuevamente')

  return {
    titulo: t('auth:registro.errores.registroFallido.titulo'),
    mensaje: mensajeTraduccido,
  }
}

const Registro: React.FC = () => {
  const navigation = useNavigation<Nav>()
  const { registrar, cargando } = useAuth()
  const { t } = useTranslation()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState<Date | undefined>()
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  // Control de montaje para evitar setState en componentes desmontados
  const isMountedRef = useRef(true)

  // Refs para controlar foco entre inputs
  const nombreInputRef = useRef<any>(null)
  const emailInputRef = useRef<any>(null)
  const passwordInputRef = useRef<any>(null)

  // Animaciones
  const messageOpacity = useRef(new Animated.Value(0)).current
  const messageTranslateY = useRef(new Animated.Value(20)).current
  const formOpacity = useRef(new Animated.Value(0)).current
  const formTranslateY = useRef(new Animated.Value(30)).current

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    // Secuencia de animaciones de entrada
    Animated.sequence([
      // Mensaje aparece primero
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
      // Formulario aparece después
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

  const emailValid = useMemo(() => {
    const value = email.trim()
    if (value.length === 0) return false
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(value)
  }, [email])

  const passwordValid = useMemo(() => password.length >= 6, [password])

  const emailError = useMemo(() => {
    if (!emailTouched) return ''
    if (email.trim().length === 0)
      return t('auth:registro.errores.correo.obligatorio')
    if (!emailValid) return t('auth:registro.errores.correo.invalido')
    return ''
  }, [email, emailTouched, emailValid, t])

  const passwordError = useMemo(() => {
    if (!passwordTouched) return ''
    if (password.length === 0)
      return t('auth:registro.errores.password.obligatoria')
    if (!passwordValid) return t('auth:registro.errores.password.minimo')
    return ''
  }, [password, passwordTouched, passwordValid, t])

  const fechaNacimientoError = useMemo(() => {
    // Solo mostrar error si el usuario seleccionó una fecha pero es menor de edad
    // (El DatePicker ya previene seleccionar fechas que hagan menor de edad)
    if (!fechaNacimiento) return ''

    const hoy = new Date()
    const edad = hoy.getFullYear() - fechaNacimiento.getFullYear()
    const mesActual = hoy.getMonth()
    const mesNacimiento = fechaNacimiento.getMonth()
    const diaActual = hoy.getDate()
    const diaNacimiento = fechaNacimiento.getDate()

    const tieneCumplios =
      mesActual > mesNacimiento ||
      (mesActual === mesNacimiento && diaActual >= diaNacimiento)
    const edadReal = tieneCumplios ? edad : edad - 1

    if (edadReal < 18) return t('auth:registro.errores.edad.minimo')
    return ''
  }, [fechaNacimiento, t])

  const canSubmit = useMemo(() => {
    return (
      nombre.trim() !== '' &&
      emailValid &&
      passwordValid &&
      fechaNacimiento !== undefined
    )
  }, [nombre, emailValid, passwordValid, fechaNacimiento])

  const onSubmit = useCallback(async () => {
    // Cerrar teclado inmediatamente al enviar
    Keyboard.dismiss()

    if (!canSubmit) {
      if (isMountedRef.current) {
        Alert.alert(
          t('auth:compartido.errores.camposIncompletos.titulo'),
          t('auth:compartido.errores.camposIncompletos.mensaje')
        )
      }
      return
    }

    console.log('[Registro] Llamando a registrar...', { email, nombre })
    const result = await registrar(
      email.trim(),
      password,
      nombre.trim(),
      fechaNacimiento
    )
    console.log('[Registro] Resultado de registrar:', {
      success: result.success,
      user: result.user
        ? {
            uid: result.user.uid,
            email: result.user.email,
            emailVerified: result.user.emailVerified,
          }
        : null,
      error: result.error,
    })

    if (!result.success || !result.user) {
      if (isMountedRef.current) {
        const { titulo, mensaje } = getAuthErrorMessage(result.error, t)
        Alert.alert(titulo, mensaje)
      }
      return
    }

    // ✅ Registro exitoso: NO navegar aquí
    // AuthNavigator detectará emailVerified=false y navegará automáticamente
    // Esto evita conflictos de navegación simultánea
    console.log(
      '[Registro] ✅ Registro exitoso, esperando navegación de AuthNavigator...'
    )
  }, [canSubmit, email, nombre, password, fechaNacimiento, registrar, t])

  // Validar nombre
  const nombreValido = useCallback(() => nombre.trim().length > 0, [nombre])

  // Validar email
  const emailValido = useCallback(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }, [email])

  // Validar password
  const passwordValido = useCallback(() => password.length >= 6, [password])

  // Avanzar de nombre a email
  const handleNombreSubmit = useCallback(() => {
    if (nombreValido()) {
      emailInputRef.current?.focus?.()
    }
  }, [nombreValido])

  // Avanzar de email a password
  const handleEmailSubmit = useCallback(() => {
    if (emailValido()) {
      setEmailTouched(true)
      passwordInputRef.current?.focus?.()
    }
  }, [emailValido])

  // Avanzar de password a fecha de nacimiento
  const handlePasswordSubmit = useCallback(() => {
    if (passwordValido()) {
      setPasswordTouched(true)
      // No hay ref para BirthDatePicker, así que solo marcamos como tocado
    }
  }, [passwordValido])

  const goToLogin = useCallback(() => {
    if (isMountedRef.current) {
      navigation.navigate('Ingresar')
    }
  }, [navigation])

  return (
    <Screen contentContainerStyle={styles.content} style={styles.container}>
      {/* Círculo decorativo */}
      <View style={styles.decorativeCircle} />

      {/* Huella decorativa */}
      <View style={styles.pawPrint}>
        <Text style={styles.pawEmoji}>🐾</Text>
      </View>

      <Block>
        {/* Mensaje emocional */}
        <Animated.View
          style={{
            opacity: messageOpacity,
            transform: [{ translateY: messageTranslateY }],
          }}
        >
          <Text style={styles.emotionalMessage}>
            {t('auth:registro.formulario.mensajeEmocional')}
          </Text>
          <Text h4 style={styles.title}>
            {t('auth:registro.formulario.titulo')}
          </Text>
          <Text style={styles.subtitle}>
            {t('auth:registro.formulario.subtitulo')}
          </Text>
        </Animated.View>

        {/* Formulario con animación */}
        <Animated.View
          style={[
            styles.form,
            {
              opacity: formOpacity,
              transform: [{ translateY: formTranslateY }],
            },
          ]}
        >
          <TextInput
            ref={nombreInputRef}
            label={t('auth:registro.formulario.nombre.label')}
            value={nombre}
            onChangeText={setNombre}
            placeholder={t('auth:registro.formulario.nombre.placeholder')}
            iconName="user"
            returnKeyType="next"
            onSubmitEditing={handleNombreSubmit}
          />

          <TextInput
            ref={emailInputRef}
            label={t('auth:registro.formulario.correo.label')}
            value={email}
            onChangeText={tVal => {
              setEmail(tVal)
              if (!emailTouched) setEmailTouched(true)
            }}
            placeholder={t('auth:registro.formulario.correo.placeholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            iconName="envelope"
            errorText={emailError}
            returnKeyType="next"
            onSubmitEditing={handleEmailSubmit}
          />

          <TextInput
            ref={passwordInputRef}
            label={t('auth:registro.formulario.password.label')}
            value={password}
            onChangeText={tVal => {
              setPassword(tVal)
              if (!passwordTouched) setPasswordTouched(true)
            }}
            placeholder={t('auth:registro.formulario.password.placeholder')}
            secureTextEntry
            autoCapitalize="none"
            iconName="lock"
            errorText={passwordError}
            returnKeyType="next"
            onSubmitEditing={handlePasswordSubmit}
          />

          <BirthDatePicker
            value={fechaNacimiento}
            onValueChange={setFechaNacimiento}
            errorText={fechaNacimientoError}
          />

          <Button
            title={
              cargando
                ? t('auth:registro.formulario.estado.creando')
                : t('auth:registro.formulario.accion')
            }
            onPress={onSubmit}
            variant="primario"
            style={styles.submit}
            disabled={!canSubmit}
            loading={cargando}
          />

          <Button
            title={t('auth:registro.ui.tengoCuenta')}
            onPress={goToLogin}
            variant="bloque"
            style={styles.secondary}
          />

          <GoogleSignInButton />
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
  kav: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  decorativeCircle: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: `${COLOR.ENFASIS}10`,
  },
  pawPrint: {
    position: 'absolute',
    bottom: height * 0.12,
    right: 35,
    opacity: 0.06,
    transform: [{ rotate: '25deg' }],
  },
  pawEmoji: {
    fontSize: 40,
  },
  emotionalMessage: {
    fontSize: 14,
    color: COLOR.ENFASIS,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    color: COLOR.TEXTO,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 28,
  },
  subtitle: {
    color: COLOR.SUBTEXTO,
    marginBottom: 32,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    marginTop: 8,
  },
  submit: {
    marginTop: 14,
    height: 52,
    borderRadius: 26,
    width: 280,
    alignSelf: 'center',
  },
  secondary: {
    marginTop: 12,
    width: 280,
    alignSelf: 'center',
  },
})

export default Registro
