import React, { useEffect } from 'react'
import { StyleSheet, Alert, View, Text } from 'react-native'
import { Button } from '@/components/ui'
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
        <Text style={styles.separatorText}>
          {t('auth:oContinuarCon', { defaultValue: 'O continuar con' })}
        </Text>
        <View style={styles.separatorLine} />
      </View>

      <Button
        title={t('auth:googleSignIn', { defaultValue: 'Continuar con Google' })}
        onPress={handlePress}
        variant="base"
        style={styles.button}
        textStyle={styles.text}
        loading={googleLoading}
      />
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
    backgroundColor: '#E0E0E0',
  },
  separatorText: {
    marginHorizontal: 12,
    color: '#757575',
    fontSize: 13,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    width: 280,
    alignSelf: 'center',
  },
  text: {
    color: '#757575',
    fontWeight: '600',
  },
})
