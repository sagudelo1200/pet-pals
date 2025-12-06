import React, { useState, useCallback, useRef, useEffect } from 'react'
import { StyleSheet, Alert, View, Animated, Dimensions } from 'react-native'
import { Block, Text } from 'galio-framework'
import { COLOR } from '@/constants'
import { Button, TextInput } from '@/components/ui'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import Screen from '@/components/ui/Screen'
import { useAuth } from '@/context/AuthContext'
import { useNavigation } from '@react-navigation/native'
import type { AuthFlowParamList } from '@/navigation/types'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { tErrorMaybe } from '@/services/i18n'

type Nav = StackNavigationProp<AuthFlowParamList>

const { height } = Dimensions.get('window')

const Ingresar: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigation = useNavigation<Nav>()
  const { ingresar, cargando } = useAuth()
  const { t } = useTranslation()

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

  const handleSubmit = useCallback(async () => {
    if (!email || !password) {
      Alert.alert(
        t('auth:compartido.errores.camposIncompletos.titulo'),
        t('auth:compartido.errores.camposIncompletos.mensaje')
      )
      return
    }
    const result = await ingresar(email.trim(), password)
    if (!result.success) {
      Alert.alert(
        t('auth:ingresar.errores.loginFallido.titulo'),
        tErrorMaybe(result.error, t('comun.intentaNuevamente'))
      )
    }
  }, [email, password, ingresar])

  const goToRegistro = useCallback(() => {
    navigation.navigate('Registro')
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
            {t('auth:ingresar.formulario.mensajeEmocional')}
          </Text>
          <Text h4 style={styles.title}>
            {t('auth:ingresar.formulario.titulo')}
          </Text>
          <Text style={styles.subtitle}>
            {t('auth:ingresar.formulario.subtitulo')}
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
            label={t('auth:ingresar.formulario.correo.label')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth:ingresar.formulario.correo.placeholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            iconName="envelope"
          />

          <TextInput
            label={t('auth:ingresar.formulario.password.label')}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth:ingresar.formulario.password.placeholder')}
            secureTextEntry
            autoCapitalize="none"
            iconName="lock"
          />

          <Button
            title={
              cargando
                ? t('auth:ingresar.formulario.estado.ingresando')
                : t('auth:ingresar.formulario.accion')
            }
            onPress={handleSubmit}
            variant="primario"
            style={styles.submit}
            disabled={cargando}
            loading={cargando}
          />

          <Button
            title={t('auth:registro.formulario.accion')}
            onPress={goToRegistro}
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
    backgroundColor: `${COLOR.PRIMARIO}10`,
  },
  pawPrint: {
    position: 'absolute',
    bottom: height * 0.15,
    left: 30,
    opacity: 0.06,
    transform: [{ rotate: '-20deg' }],
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
    marginTop: 12,
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

export default Ingresar
