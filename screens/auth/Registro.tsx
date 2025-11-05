import React, { useCallback, useMemo, useState } from 'react'
import {
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  View,
  Alert,
  Pressable,
} from 'react-native'
import { Block, Text } from 'galio-framework'
import { COLOR } from '@/constants'
import { Button, TextInput } from '@/components/ui'
import { useAuth } from '@/services/context/AuthContext'
import { UsuarioService } from '@/services/firebase/usuario'
import type { RolUsuario } from '@/models/Usuario'
import { tErrorMaybe } from '@/services/i18n'
import { mapFirebaseError } from '@/services/firebase/errors'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { AuthFlowParamList } from '@/navigation/types'

interface DismissKeyboardProps {
  children: React.ReactNode
}

const DismissKeyboard: React.FC<DismissKeyboardProps> = ({ children }) => (
  <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
    {children}
  </TouchableWithoutFeedback>
)

type Nav = StackNavigationProp<AuthFlowParamList>

const Registro: React.FC = () => {
  const navigation = useNavigation<Nav>()
  const { register, loading, reloadProfile } = useAuth()
  const { t } = useTranslation()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<RolUsuario>('dueño')
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [creatingProfile, setCreatingProfile] = useState(false)

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
        t('auth:errores.camposIncompletos.titulo'),
        t('auth:errores.camposIncompletos.mensaje')
      )
      return
    }

    const result = await register(email.trim(), password, nombre.trim())
    if (!result.success || !result.user) {
      Alert.alert(
        t('auth:errores.registroFallido.titulo'),
        tErrorMaybe(result.error, t('comun.intentaNuevamente'))
      )
      return
    }

    try {
      setCreatingProfile(true)
      await UsuarioService.createForCurrentUser({
        nombre: nombre.trim(),
        correo: email.trim(),
        celular: '',
        roles: [rol],
        verificado: false,
        fecha_registro: new Date(),
        estado: 'activo',
      } as any)
      await reloadProfile?.()
    } catch (e: any) {
      Alert.alert(
        'Perfil no creado',
        tErrorMaybe(mapFirebaseError(e), 'Intenta nuevamente.')
      )
    } finally {
      setCreatingProfile(false)
    }
  }, [canSubmit, email, nombre, password, register, rol])

  const goToLogin = useCallback(() => {
    navigation.navigate('Ingresar')
  }, [navigation])

  return (
    <DismissKeyboard>
      <View style={styles.container}>
        <StatusBar hidden />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          <Block style={styles.content}>
            <Text h4 style={styles.title}>
              {t('auth:registro.titulo')}
            </Text>
            <Text style={styles.subtitle}>{t('auth:registro.subtitulo')}</Text>

            <View style={styles.form}>
              <TextInput
                label={t('auth:registro.nombre.label')}
                value={nombre}
                onChangeText={setNombre}
                placeholder={t('auth:registro.nombre.placeholder')}
                iconName="user"
              />

              <TextInput
                label={t('auth:correo')}
                value={email}
                onChangeText={tVal => {
                  setEmail(tVal)
                  if (!emailTouched) setEmailTouched(true)
                }}
                placeholder={t('auth:correoPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                iconName="envelope"
                errorText={emailError}
              />

              <TextInput
                label={t('auth:password')}
                value={password}
                onChangeText={tVal => {
                  setPassword(tVal)
                  if (!passwordTouched) setPasswordTouched(true)
                }}
                placeholder={t('auth:passwordPlaceholder')}
                secureTextEntry
                autoCapitalize="none"
                iconName="lock"
                errorText={passwordError}
              />

              <Text style={styles.label}>{t('auth:registro.soy')}</Text>
              <View style={styles.roleRow}>
                <Pressable
                  onPress={() => setRol('dueño')}
                  style={[
                    styles.roleBtn,
                    { marginRight: 8 },
                    rol === 'dueño' ? styles.roleBtnActive : undefined,
                  ]}
                >
                  <Text style={styles.roleText}>{t('auth:rol.dueno')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setRol('paseador')}
                  style={[
                    styles.roleBtn,
                    rol === 'paseador' ? styles.roleBtnActive : undefined,
                  ]}
                >
                  <Text style={styles.roleText}>{t('auth:rol.paseador')}</Text>
                </Pressable>
              </View>

              <Button
                title={
                  loading || creatingProfile
                    ? t('auth:registro.creando')
                    : t('auth:registro.accion')
                }
                onPress={onSubmit}
                variant="primario"
                fullWidth
                style={styles.submit}
                disabled={!canSubmit || creatingProfile}
                loading={loading || creatingProfile}
              />

              <Button
                title={t('auth:registro.tengoCuenta')}
                onPress={goToLogin}
                variant="bloque"
                fullWidth
                style={styles.secondary}
              />
            </View>
          </Block>
        </KeyboardAvoidingView>
      </View>
    </DismissKeyboard>
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
    marginTop: 8,
  },
  submit: {
    marginTop: 10,
  },
  secondary: {
    marginTop: 8,
  },
  label: {
    color: COLOR.SUBTEXTO,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  roleRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  roleBtn: {
    flex: 1,
    backgroundColor: COLOR.BLOQUE,
    borderColor: COLOR.BORDE,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  roleBtnActive: {
    borderColor: COLOR.ENFASIS,
  },
  roleText: {
    color: COLOR.TEXTO,
    fontWeight: '700',
  },
})

export default Registro
