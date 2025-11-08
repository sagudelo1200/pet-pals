import React, { useState, useCallback } from 'react'
import { StyleSheet, Alert, View } from 'react-native'
import { Block, Text } from 'galio-framework'
import { COLOR } from '@/constants'
import { Button, TextInput } from '@/components/ui'
import Screen from '@/components/ui/Screen'
import { useAuth } from '@/services/context/AuthContext'
import { useNavigation } from '@react-navigation/native'
import type { AuthFlowParamList } from '@/navigation/types'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { tErrorMaybe } from '@/services/i18n'

type Nav = StackNavigationProp<AuthFlowParamList>

const Ingresar: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigation = useNavigation<Nav>()
  const { ingresar, cargando } = useAuth()
  const { t } = useTranslation()
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
    <Screen contentContainerStyle={styles.content} style={styles.container}>
      <Block>
        <Text h4 style={styles.title}>
          {t('auth:ingresar.formulario.titulo')}
        </Text>
        <Text style={styles.subtitle}>
          {t('auth:ingresar.formulario.subtitulo')}
        </Text>

        <View style={styles.form}>
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
            fullWidth
            style={styles.submit}
            disabled={cargando}
            loading={cargando}
          />

          <Button
            title={t('auth:registro.formulario.accion')}
            onPress={goToRegistro}
            variant="bloque"
            fullWidth
            style={styles.secondary}
          />
        </View>
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
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  title: {
    color: COLOR.TEXTO,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: COLOR.SUBTEXTO,
    marginBottom: 18,
  },
  form: {
    marginTop: 9,
  },
  submit: {
    marginTop: 9,
  },
  secondary: {
    marginTop: 9,
  },
})

export default Ingresar
