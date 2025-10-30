import React, { useState, useCallback } from 'react';
import {
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  View,
  Alert,
} from 'react-native';
import { Block, Text } from 'galio-framework';
import { COLOR } from '@/constants';
import { Button, TextInput } from '@/components/ui';
import { useAuth } from '@/services/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { AuthFlowParamList } from '@/navigation/types';
import type { StackNavigationProp } from '@react-navigation/stack';



interface DismissKeyboardProps {
  children: React.ReactNode;
}

const DismissKeyboard: React.FC<DismissKeyboardProps> = ({ children }) => (
  <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
    {children}
  </TouchableWithoutFeedback>
);

type Nav = StackNavigationProp<AuthFlowParamList>;

const Ingresar: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation<Nav>();
  const { login, loading } = useAuth();
  const handleSubmit = useCallback(async () => {
    if (!email || !password) {
      Alert.alert('Campos incompletos', 'Ingresa tu correo y contraseña.');
      return;
    }
    const result = await login(email.trim(), password);
    if (!result.success) {
      Alert.alert('No se pudo iniciar sesión', result.error || 'Intenta nuevamente.');
    }
    // Si tiene éxito, AuthNavigator se encargará de redirigir a App
  }, [email, password, login]);

  const goToRegistro = useCallback(() => {
    navigation.navigate('Registro');
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
            <Text h4 style={styles.title}>Inicia sesión</Text>
            <Text style={styles.subtitle}>Bienvenido, ingresa tus datos</Text>

            <View style={styles.form}>
              <TextInput
                label='Correo electrónico'
                value={email}
                onChangeText={setEmail}
                placeholder='tucorreo@dominio.com'
                keyboardType='email-address'
                autoCapitalize='none'
                iconName='envelope'
              />

              <TextInput
                label='Contraseña'
                value={password}
                onChangeText={setPassword}
                placeholder='••••••••'
                secureTextEntry
                autoCapitalize='none'
                iconName='lock'
              />

              <Button
                title={loading ? 'Ingresando…' : 'Ingresar'}
                onPress={handleSubmit}
                variant='primario'
                fullWidth
                style={styles.submit}
                disabled={loading}
                loading={loading}
              />

              <Button
                title='Crear una cuenta'
                onPress={goToRegistro}
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
});

export default Ingresar;
