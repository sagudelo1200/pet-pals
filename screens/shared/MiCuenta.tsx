import React, { useCallback } from 'react'
import { Alert, Platform, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '@/components/ui'
import Screen from '@/components/ui/Screen'
import { tErrorMaybe } from '@/services/i18n'
import { useAuth } from '@/services/context/AuthContext'
import { useNavigation } from '@react-navigation/native'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'

const MiCuenta = () => {
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const { cerrarSesion, cargando, user, profile } = useAuth()
  const { t } = useTranslation()
  const correo = user?.email ?? (profile as any)?.correo ?? '—'
  const nombre = user?.displayName ?? (profile as any)?.nombre ?? '—'

  const TAB_BAR_HEIGHT =
    Platform.OS === 'ios'
      ? Math.max(insets.bottom + 65, 85)
      : Math.max(insets.bottom + 60, 75)

  const handleLogout = useCallback(async () => {
    const result = await cerrarSesion()
    if (result.success) {
      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })
    } else {
      Alert.alert(
        t('perfil:error_cerrar_sesion_titulo'),
        tErrorMaybe(result.error, t('comun:intentaNuevamente'))
      )
    }
  }, [cerrarSesion, navigation, t])

  return (
    <Screen style={[styles.container, { paddingBottom: TAB_BAR_HEIGHT }]}>
      <View style={styles.content}>
        <Text style={styles.text}>{t('perfil:titulo')}</Text>
        <Text style={styles.subText}>{t('perfil:descripcion')}</Text>
        <Text style={styles.nameText}>
          {t('perfil:nombre_label', { nombre })}
        </Text>
        <Text style={styles.emailText}>
          {t('perfil:sesion_label', { correo })}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          style={styles.logoutButton as any}
          onPress={() => void handleLogout()}
          disabled={cargando}
          loading={cargando}
          variant="secundario"
          title={
            cargando ? t('perfil:cerrando_sesion') : t('perfil:cerrar_sesion')
          }
        />
      </View>
    </Screen>
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
    justifyContent: 'flex-start' as const,
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
