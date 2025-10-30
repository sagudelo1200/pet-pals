import React, { useState } from 'react';
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



interface DismissKeyboardProps {
  children: React.ReactNode;
}

const DismissKeyboard: React.FC<DismissKeyboardProps> = ({ children }) => (
  <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
    {children}
  </TouchableWithoutFeedback>
);

const Ingresar: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    // Solo UI: no implementa auth real aún
    Alert.alert('Ingresar', `Correo: ${email}`);
  };

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

              <Button
                title='Ingresar'
                onPress={handleSubmit}
                variant='primario'
                fullWidth
                style={styles.submit}
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
});

export default Ingresar;
