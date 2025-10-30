import React, { useCallback, useMemo, useState } from 'react';
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
} from 'react-native';
import { Block, Text } from 'galio-framework';
import { COLOR } from '@/constants';
import { Button, TextInput } from '@/components/ui';
import { useAuth } from '@/services/context/AuthContext';
import { UsuarioService } from '@/services/firebase/usuario';
import type { RolUsuario } from '@/models/Usuario';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthFlowParamList } from '@/navigation/types';

interface DismissKeyboardProps {
  children: React.ReactNode;
}

const DismissKeyboard: React.FC<DismissKeyboardProps> = ({ children }) => (
  <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
    {children}
  </TouchableWithoutFeedback>
);

type Nav = StackNavigationProp<AuthFlowParamList>;

const Registro: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { register, loading } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<RolUsuario>('dueño');
  const [creatingProfile, setCreatingProfile] = useState(false);

  const canSubmit = useMemo(() => {
    return nombre.trim() !== '' && email.trim() !== '' && password.length >= 6;
  }, [nombre, email, password]);

  const onSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Datos incompletos', 'Completa nombre, correo y una contraseña de al menos 6 caracteres.');
      return;
    }

    const result = await register(email.trim(), password, nombre.trim());
    if (!result.success || !result.user) {
      Alert.alert('No se pudo registrar', result.error || 'Intenta nuevamente.');
      return;
    }

    try {
      setCreatingProfile(true);
      await UsuarioService.create({
        nombre: nombre.trim(),
        correo: email.trim(),
        celular: '',
        roles: [rol],
        verificado: false,
        fecha_registro: new Date(),
        estado: 'activo',
      } as any);
      // La navegación a App la hará AuthNavigator al detectar usuario
    } catch (e: any) {
      Alert.alert('Perfil no creado', e?.message || 'Intenta nuevamente.');
    } finally {
      setCreatingProfile(false);
    }
  }, [canSubmit, email, nombre, password, register, rol]);

  const goToLogin = useCallback(() => {
    navigation.navigate('Ingresar');
  }, [navigation]);

  return (
    <DismissKeyboard>
      <View style={styles.container}>
        <StatusBar hidden />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          <Block style={styles.content}>
            <Text h4 style={styles.title}>Crear cuenta</Text>
            <Text style={styles.subtitle}>Regístrate para empezar</Text>

            <View style={styles.form}>
              <TextInput
                label='Nombre completo'
                value={nombre}
                onChangeText={setNombre}
                placeholder='Tu nombre'
                iconName='person'
              />

              <TextInput
                label='Correo electrónico'
                value={email}
                onChangeText={setEmail}
                placeholder='tucorreo@dominio.com'
                keyboardType='email-address'
                autoCapitalize='none'
                iconName='mail'
              />

              <TextInput
                label='Contraseña'
                value={password}
                onChangeText={setPassword}
                placeholder='••••••••'
                secureTextEntry
                autoCapitalize='none'
                iconName='lock-closed'
              />

              <Text style={styles.label}>Soy:</Text>
              <View style={styles.roleRow}>
                <Pressable
                  onPress={() => setRol('dueño')}
                  style={[styles.roleBtn, { marginRight: 8 }, rol === 'dueño' ? styles.roleBtnActive : undefined]}
                >
                  <Text style={styles.roleText}>Dueño</Text>
                </Pressable>
                <Pressable
                  onPress={() => setRol('paseador')}
                  style={[styles.roleBtn, rol === 'paseador' ? styles.roleBtnActive : undefined]}
                >
                  <Text style={styles.roleText}>Paseador</Text>
                </Pressable>
              </View>

              <Button
                title={loading || creatingProfile ? 'Creando cuenta…' : 'Registrarme'}
                onPress={onSubmit}
                variant='primario'
                fullWidth
                style={styles.submit}
                disabled={loading || creatingProfile || !canSubmit}
                loading={loading || creatingProfile}
              />

              <Button
                title='Ya tengo cuenta'
                onPress={goToLogin}
                variant='bloque'
                fullWidth
                style={styles.secondary}
              />
            </View>
          </Block>
        </KeyboardAvoidingView>
      </View>
    </DismissKeyboard>
  );
};

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
});

export default Registro;
