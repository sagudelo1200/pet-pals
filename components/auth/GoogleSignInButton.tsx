import React, { useEffect } from 'react'
import {
  StyleSheet,
  Alert,
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import GoogleLogo from '@/assets/imgs/logos/google.svg'
import { COLOR } from '@/constants'
import { useGoogleAuth } from '@/hooks/useGoogleAuth'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from 'react-i18next'

export const GoogleSignInButton = () => {
  const { signIn, loading: googleLoading, error } = useGoogleAuth()
  const { ingresarConGoogle } = useAuth()
  const { t } = useTranslation()

  useEffect(() => {
    if (error) {
      Alert.alert(
        t('auth:errores.tituloGoogle', {
          defaultValue: 'Error de autenticación',
        }),
        error
      )
    }
  }, [error, t])

  const handlePress = async () => {
    if (!ingresarConGoogle) return

    const result = await signIn()
    if (result && !result.success && result.error) {
      Alert.alert(
        t('auth:errores.tituloGoogle', {
          defaultValue: 'Error de autenticación',
        }),
        result.error
      )
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.separatorContainer}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>{t('auth:o_prueba')}</Text>
        <View style={styles.separatorLine} />
      </View>

      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          { opacity: pressed || googleLoading ? 0.8 : 1 },
        ]}
        accessibilityRole="button"
      >
        {googleLoading ? (
          <ActivityIndicator size="small" color={COLOR.TEXTO} />
        ) : (
          <>
            <View style={styles.logoWrap}>
              <GoogleLogo width={20} height={20} />
            </View>
            <Text style={styles.text}>
              {t('auth:googleSignIn', { defaultValue: 'Continuar con Google' })}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLOR.BORDE,
  },
  separatorText: {
    marginHorizontal: 12,
    color: COLOR.SUBTEXTO,
    fontSize: 13,
    fontWeight: '500',
  },
  button: {
    backgroundColor: COLOR.BASE,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    width: 280,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  text: {
    color: COLOR.TEXTO,
    fontWeight: '600',
  },
  logoWrap: {
    marginRight: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
