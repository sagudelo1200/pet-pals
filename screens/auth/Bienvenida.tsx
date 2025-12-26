import { FC, useEffect, useRef } from 'react'
import { StyleSheet, View, Animated, Dimensions } from 'react-native'
import { Text } from 'galio-framework'
import { COLOR } from '@/constants'
import { Button, Screen } from '@/components/ui'
import { useNavigation } from '@react-navigation/native'
import type { AuthFlowParamList } from '@/navigation/types'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { LinearGradient } from 'expo-linear-gradient'
import PaseoTranquilo from '@/assets/imgs/undraw/paseo_tranquilo.svg'

type Nav = StackNavigationProp<AuthFlowParamList>

const Bienvenida: FC = () => {
  const navigation = useNavigation<Nav>()
  const { t } = useTranslation()

  // Animaciones
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.8)).current
  const messageOpacity = useRef(new Animated.Value(0)).current
  const messageTranslateY = useRef(new Animated.Value(20)).current
  const buttonOpacity = useRef(new Animated.Value(0)).current
  const buttonScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    // Secuencia de animaciones de entrada
    Animated.sequence([
      // Logo aparece con fade y escala
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // Mensaje aparece
      Animated.parallel([
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(messageTranslateY, {
          toValue: 0,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
      ]),
      // Botón aparece
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 500,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start()

    // Animación de respiración del botón (pulso suave)
    const breatheAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 1.03,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    )

    // Iniciar después de que aparezca el botón
    setTimeout(() => breatheAnimation.start(), 1500)

    return () => breatheAnimation.stop()
  }, [])

  const handleGetStarted = () => {
    navigation.navigate('Ingresar')
  }

  const handleCreateAccount = () => {
    navigation.navigate('Registro')
  }

  return (
    <Screen
      style={styles.container}
      contentContainerStyle={styles.content}
      disableDismiss
      includeTopInset
    >
      <LinearGradient
        colors={[COLOR.BASE, COLOR.BLOQUE]}
        style={StyleSheet.absoluteFill}
        start={[0.08, 0.02]}
        end={[0.9, 0.95]}
      />

      <Animated.View
        style={[
          styles.illustrationWrap,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <PaseoTranquilo
          width={Math.min(620, Dimensions.get('window').width - 48)}
          height={320}
        />
      </Animated.View>

      {/* Mensaje de bienvenida */}
      <Animated.View
        style={[
          styles.messageContainer,
          {
            opacity: messageOpacity,
            transform: [{ translateY: messageTranslateY }],
          },
        ]}
      >
        <View style={styles.card}>
          <Text h3 style={styles.welcomeTitle}>
            {t('auth:bienvenida.titulo')}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            {t('auth:bienvenida.subtitulo')}
          </Text>
          <Text style={styles.welcomeDescription}>
            {t('auth:bienvenida.descripcion')}
          </Text>
        </View>
      </Animated.View>

      {/* Botones */}
      <Animated.View
        style={[
          styles.buttonsContainer,
          {
            opacity: buttonOpacity,
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [{ scale: buttonScale }],
          }}
        >
          <Button
            title={t('auth:bienvenida.botones.empezar')}
            onPress={handleGetStarted}
            variant="primario"
            fullWidth
            style={styles.primaryButton}
          />
        </Animated.View>

        <Button
          title={t('auth:bienvenida.botones.crearCuenta')}
          onPress={handleCreateAccount}
          variant="contorno"
          fullWidth
          style={styles.secondaryButton}
        />
      </Animated.View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 420,
    marginTop: 36,
    paddingHorizontal: 24,
  },
  illustrationWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 36,
    marginBottom: 8,
  },
  card: {
    backgroundColor: `${COLOR.BLOQUE}E8`,
    padding: 24,
    borderRadius: 22,
    alignSelf: 'stretch',
    marginHorizontal: 16,
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: COLOR.SOMBRA,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 12,
    borderWidth: 1,
    borderColor: `${COLOR.TEXTO}22`,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.PRIMARIO,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeDescription: {
    fontSize: 15,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 360,
  },
  primaryButton: {
    marginBottom: 18,
    height: 64,
    borderRadius: 18,
  },
  secondaryButton: {
    marginTop: 8,
    height: 56,
    borderRadius: 18,
  },
})

export default Bienvenida
