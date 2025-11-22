import React, { useEffect, useRef } from 'react'
import { StyleSheet, View, Animated, Dimensions, Image } from 'react-native'
import { Text } from 'galio-framework'
import { COLOR } from '@/constants'
import { Button, Screen } from '@/components/ui'
import { useNavigation } from '@react-navigation/native'
import type { AuthFlowParamList } from '@/navigation/types'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'

type Nav = StackNavigationProp<AuthFlowParamList>

const { height } = Dimensions.get('window')

const Bienvenida: React.FC = () => {
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
      {/* Círculos decorativos suaves */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      {/* Logo con animación */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={styles.logoBackground}>
          <Image
            source={require('@/assets/imgs/petpals-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
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
        <Text h3 style={styles.welcomeTitle}>
          {t('auth:bienvenida.titulo')}
        </Text>
        <Text style={styles.welcomeSubtitle}>
          {t('auth:bienvenida.subtitulo')}
        </Text>
        <Text style={styles.welcomeDescription}>
          {t('auth:bienvenida.descripcion')}
        </Text>
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
          variant="secundario"
          fullWidth
          style={styles.secondaryButton}
        />
      </Animated.View>

      {/* Huellas decorativas */}
      <View style={styles.pawPrint1}>
        <Text style={styles.pawEmoji}>🐾</Text>
      </View>
      <View style={styles.pawPrint2}>
        <Text style={styles.pawEmoji}>🐾</Text>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: `${COLOR.PRIMARIO}15`, // 15 = ~8% opacity
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: `${COLOR.ENFASIS}10`, // 10 = ~6% opacity
  },
  logoContainer: {
    marginBottom: 48,
    alignItems: 'center',
  },
  logoBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLOR.BLOQUE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLOR.PRIMARIO,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: COLOR.BORDE,
  },
  logo: {
    width: 100,
    height: 100,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 56,
    paddingHorizontal: 8,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: COLOR.ENFASIS,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  welcomeDescription: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 340,
  },
  primaryButton: {
    marginBottom: 16,
    height: 56,
    borderRadius: 28,
    shadowColor: COLOR.PRIMARIO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  secondaryButton: {
    marginTop: 8,
    height: 48,
  },
  pawPrint1: {
    position: 'absolute',
    top: height * 0.15,
    left: 30,
    opacity: 0.08,
    transform: [{ rotate: '-15deg' }],
  },
  pawPrint2: {
    position: 'absolute',
    bottom: height * 0.25,
    right: 40,
    opacity: 0.06,
    transform: [{ rotate: '25deg' }],
  },
  pawEmoji: {
    fontSize: 48,
  },
})

export default Bienvenida
