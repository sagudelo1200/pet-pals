import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  ImageBackground,
  Dimensions,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { Block, Text } from 'galio-framework';

import { Button, Input } from '../components';
import { Icon } from '@/components/ui';
import { COLOR } from '@/constants';
 

// Imagen local
const RegisterBackground = require('../assets/imgs/register-bg.png');
import { useAuth } from '../services/context/AuthContext';

const { width, height } = Dimensions.get('screen');

interface DismissKeyboardProps {
  children: React.ReactNode;
}

const DismissKeyboard: React.FC<DismissKeyboardProps> = ({ children }) => (
  <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
    {children}
  </TouchableWithoutFeedback>
);

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  
  const { login } = useAuth();

  const emailValid = useMemo(() => {
    const value = email.trim();
    if (value.length === 0) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(value);
  }, [email]);

  const passwordValid = useMemo(() => password.trim().length >= 6, [password]);

  const emailError = useMemo(() => {
    if (!emailTouched) return '';
    if (email.trim().length === 0) return 'El correo es obligatorio.';
    if (!emailValid) return 'Ingresa un correo válido (ej. usuario@dominio.com).';
    return '';
  }, [email, emailTouched, emailValid]);

  const passwordError = useMemo(() => {
    if (!passwordTouched) return '';
    if (password.trim().length === 0) return 'La contraseña es obligatoria.';
    if (!passwordValid) return 'La contraseña debe tener al menos 6 caracteres.';
    return '';
  }, [password, passwordTouched, passwordValid]);

  const canSubmit = useMemo(() => emailValid && passwordValid, [emailValid, passwordValid]);

  const handleLogin = async (): Promise<void> => {
    // Marcar como tocados para mostrar feedback si faltan datos
    if (!emailTouched) setEmailTouched(true);
    if (!passwordTouched) setPasswordTouched(true);
    if (!canSubmit) return;

    setIsLoading(true);
    
    try {
      const result = await login(email.trim(), password.trim());
      
      if (!result.success) {
        Alert.alert('Error de autenticación', result.error || 'No se pudo iniciar sesión');
      } else {
        // El éxito se maneja automáticamente por el AuthContext
        console.log('Login exitoso');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Ocurrió un error inesperado');
      console.error('Error en login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DismissKeyboard>
      <Block flex middle>
        <StatusBar hidden />
        <ImageBackground
          source={RegisterBackground}
          style={{ width, height, zIndex: 1 }}
        >
          <Block flex middle>
            <Block style={styles.loginContainer}>
              <Block flex space='between'>
                <Block flex={0.2} middle style={styles.socialConnect}>
                  <Block flex={0.6} middle>
                    <Text color='#8898AA' size={12}>
                      Ingresa con
                    </Text>
                  </Block>
                  <Block flex={0.4} row center style={{ marginBottom: 18 }}>
                    <Button
                      style={styles.socialButtons}
                      onPress={() => Alert.alert('Funcionalidad no implementada', 'Inicio de sesión con Google no está disponible en esta versión.')}
                    >
                      <Block row>
                        <Icon
                          name='google'
                          type='brands'
                          size={28}
                          color={'#DF4930'}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.socialTextButtons}>GOOGLE</Text>
                      </Block>
                    </Button>
                  </Block>
                </Block>
                <Block flex={0.8} middle space='between'>
                  <Block flex={0.2} middle>
                    <Text
                      style={{
                        fontFamily: 'open-sans-regular',
                        textAlign: 'center',
                      }}
                      color='#8898AA'
                      size={12}
                    >
                      O hazlo de la manera clásica
                    </Text>
                  </Block>
                  <Block center flex={0.9}>
                    <Block flex center>
                      <Block>
                        <Block width={width * 0.8} style={{ marginBottom: 6 }}>
                          <Input
                            borderless
                            placeholder='Correo'
                            value={email}
                            onChangeText={(t: string) => { setEmail(t); if (!emailTouched) setEmailTouched(true); }}
                            color={emailTouched && !emailValid ? COLOR.ERROR : COLOR.TEXTO}
                            error={emailTouched && !emailValid}
                            keyboardType='email-address'
                            autoCapitalize='none'
                            autoCorrect={false}
                            iconContent={
                              <Icon
                                name='envelope'
                                size={18}
                                color={emailTouched && !emailValid ? COLOR.ERROR : COLOR.SUBTEXTO}
                                style={styles.inputIcons}
                              />
                            }
                          />
                          {emailError ? (
                            <Text size={12} color={COLOR.ERROR}>
                              {emailError}
                            </Text>
                          ) : null}
                        </Block>
                        <Block width={width * 0.8} style={{ marginBottom: 15 }}>
                          <Input
                            password
                            borderless
                            placeholder='Contraseña'
                            value={password}
                            onChangeText={(t: string) => { setPassword(t); if (!passwordTouched) setPasswordTouched(true); }}
                            color={passwordTouched && !passwordValid ? COLOR.ERROR : COLOR.TEXTO}
                            error={passwordTouched && !passwordValid}
                            iconContent={
                              <Icon
                                name='lock'
                                size={18}
                                color={passwordTouched && !passwordValid ? COLOR.ERROR : COLOR.SUBTEXTO}
                                style={styles.inputIcons}
                              />
                            }
                          />
                          {passwordError ? (
                            <Text size={12} color={COLOR.ERROR}>
                              {passwordError}
                            </Text>
                          ) : null}
                        </Block>
                        
                        {/* <Block row style={styles.forgotPassword}>
                          <Button
                            color='transparent'
                            textStyle={{
                              color: COLOR.PRIMARIO,
                              fontSize: 14,
                              fontFamily: 'open-sans-regular',
                            }}
                          >
                            ¡Olvidé mi contraseña!
                          </Button>
                        </Block> */}
                      </Block>
                      
                      <Block center style={{ marginTop: 39 }}>
                        <Button 
                          color='primary' 
                          style={styles.loginButton}
                          onPress={handleLogin}
                          loading={isLoading}
                          disabled={isLoading || !canSubmit}
                        >
                          <Text
                            style={{ fontFamily: 'open-sans-bold' }}
                            size={21}
                            color={COLOR.TEXTO}
                          >
                            {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
                          </Text>
                        </Button>
                        
                        <Block row style={styles.signUpLink}>
                          <Block>

                            <Text
                              style={{ fontFamily: 'open-sans-regular' }}
                              size={14}
                              color={COLOR.TEXTO}
                              >
                              ¿No tienes una cuenta?
                            </Text>
                          </Block>
                          <Button
                            color='transparent'
                            textStyle={{
                              color: COLOR.PRIMARIO,
                              fontSize: 14,
                              fontFamily: 'open-sans-bold',
                            }}
                          >
                            Regístrate
                          </Button>
                        </Block>
                      </Block>
                    </Block>
                  </Block>
                </Block>
              </Block>
            </Block>
          </Block>
        </ImageBackground>
      </Block>
    </DismissKeyboard>
  );
};

const styles = StyleSheet.create({
  loginContainer: {
    width: width * 0.9,
    height: height < 812 ? height * 0.7 : height * 0.6,
  backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 36,
  shadowColor: COLOR.BASE,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowRadius: 8,
    shadowOpacity: 0.1,
    elevation: 1,
    overflow: 'hidden',
  },
  socialConnect: {
  backgroundColor: COLOR.BASE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(136, 152, 170, 0.3)',
  },
  socialButtons: {
    width: 132,
    height: 39,
  backgroundColor: COLOR.SECUNDARIO,
  shadowColor: COLOR.BASE,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowRadius: 8,
    shadowOpacity: 0.1,
    elevation: 1,
  },
  socialTextButtons: {
  color: COLOR.PRIMARIO,
    fontWeight: '900',
    fontSize: 21,
  },
  inputIcons: {
    marginRight: 12,
  },
  forgotPassword: {
    justifyContent: 'flex-end',
    marginBottom: 9,
  },
  loginButton: {
    width: width * 0.6,
    marginTop: 25,
    marginBottom: 20,
  },
  signUpLink: {
    justifyContent: 'center',
    marginBottom: 20,
  },
});

export default Login;