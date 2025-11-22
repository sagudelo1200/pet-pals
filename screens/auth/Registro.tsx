import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { StyleSheet, View, Alert, Animated, Dimensions } from 'react-native'
import { Block, Text } from 'galio-framework'
import { COLOR } from '@/constants'
import { Button, TextInput } from '@/components/ui'
import Screen from '@/components/ui/Screen'
import { useAuth } from '@/services/context/AuthContext'
import { tErrorMaybe } from '@/services/i18n'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { AuthFlowParamList } from '@/navigation/types'

type Nav = StackNavigationProp<AuthFlowParamList>

const { height } = Dimensions.get('window')

const Registro: React.FC = () => {
  const navigation = useNavigation<Nav>()
  const { registrar, cargando, recargarPerfil } = useAuth()
  const { t } = useTranslation()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  // Animaciones
  const messageOpacity = useRef(new Animated.Value(0)).current
  const messageTranslateY = useRef(new Animated.Value(20)).current
  const formOpacity = useRef(new Animated.Value(0)).current
  const formTranslateY = useRef(new Animated.Value(30)).current

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

  const canSubmit = useMemo(() => {
    return nombre.trim() !== '' && emailValid && passwordValid
  }, [nombre, emailValid, passwordValid])

  const onSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert(
        t('auth:compartido.errores.camposIncompletos.titulo'),
        t('auth:compartido.errores.camposIncompletos.mensaje')
      )
      return
    }

    const result = await registrar(email.trim(), password, nombre.trim())
    if (!result.success || !result.user) {
      Alert.alert(
        t('auth:registro.errores.registroFallido.titulo'),
        tErrorMaybe(result.error, t('comun.intentaNuevamente'))
      )
      return
    }

    await recargarPerfil?.()
  }, [canSubmit, email, nombre, password, registrar])

  const goToLogin = useCallback(() => {
    navigation.navigate('Ingresar')
  }, [navigation])

  return (
    <Screen
      contentContainerStyle={styles.content}
      style={styles.container}
      includeTopInset
    >
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
            label={t('auth:registro.formulario.nombre.label')}
            value={nombre}
            onChangeText={setNombre}
            placeholder={t('auth:registro.formulario.nombre.placeholder')}
            iconName="user"
          />

          <TextInput
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
          />

          <TextInput
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
          />

          <Button
            title={
              cargando
                ? t('auth:registro.formulario.estado.creando')
                : t('auth:registro.formulario.accion')
            }
            onPress={onSubmit}
            variant="primario"
            fullWidth
            style={styles.submit}
            disabled={!canSubmit}
            loading={cargando}
          />

          <Button
            title={t('auth:registro.ui.tengoCuenta')}
            onPress={goToLogin}
            variant="bloque"
            fullWidth
            style={styles.secondary}
          />
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
  },
  secondary: {
    marginTop: 12,
  },
})

export default Registro
