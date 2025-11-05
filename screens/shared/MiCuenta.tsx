import React, { useCallback } from 'react'
import { Alert, Platform, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '@/components'
import { tErrorMaybe } from '@/services/i18n'
import { useAuth } from '@/services/context/AuthContext'
import { useNavigation } from '@react-navigation/native'
import { COLOR } from '@/constants'

const MiCuenta = () => {
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const { logout, loading, user, profile } = useAuth()
  const correo = user?.email ?? (profile as any)?.correo ?? '—'
  const nombre = user?.displayName ?? (profile as any)?.nombre ?? '—'

  const TAB_BAR_HEIGHT =
    Platform.OS === 'ios'
      ? Math.max(insets.bottom + 65, 85)
      : Math.max(insets.bottom + 60, 75)

  const handleLogout = useCallback(async () => {
    const result = await logout()
    if (result.success) {
      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })
    } else {
      Alert.alert(
        'No se pudo cerrar sesión',
        tErrorMaybe(result.error, 'Intenta nuevamente.')
      )
    }
  }, [logout, navigation])

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: TAB_BAR_HEIGHT }]}>
      <View style={styles.content}>
        <Text style={styles.text}>¡Mi Cuenta!</Text>
        <Text style={styles.subText}>
          Esta sección está en desarrollo. ¡Mantente atento a las
          actualizaciones!
        </Text>
        <Text style={styles.nameText}>Nombre: {nombre}</Text>
        <Text style={styles.emailText}>Sesión iniciada como: {correo}</Text>
      </View>

      <View style={styles.footer}>
        <Button
          style={styles.logoutButton as any}
          onPress={handleLogout}
          disabled={loading}
          color={'secondary'}
        >
          {loading ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = {
  container: {
    flex: 1,
    alignItems: 'center' as const,
    backgroundColor: COLOR.BASE,
  },
  content: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold' as 'bold',
    textAlign: 'center' as const,
    color: COLOR.TEXTO,
  },
  subText: {
    fontSize: 16,
    textAlign: 'center' as const,
    marginTop: 10,
    color: COLOR.SUBTEXTO,
  },
  nameText: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700' as '700',
    color: COLOR.TEXTO,
    textAlign: 'center' as const,
  },
  footer: {
    alignSelf: 'stretch' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  logoutButton: {
    alignSelf: 'center' as const,
    minWidth: 220,
  },
  emailText: {
    marginTop: 16,
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center' as const,
  },
}

export default MiCuenta
