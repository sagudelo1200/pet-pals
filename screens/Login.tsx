import React, { useState } from 'react';
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

import { Button, Icon, Input } from '../components';
import { argonTheme } from '../constants';

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
  
  const { login } = useAuth();

  const handleLogin = async (): Promise<void> => {
    // Validaciones básicas
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return;
    }
    
    if (!password.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu contraseña');
      return;
    }

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
      Alert.alert('Error', 'Ocurrió un error inesperado');
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
              <Block flex space="between">
                <Block flex={0.2} middle style={styles.socialConnect}>
                  <Block flex={0.6} middle>
                    <Text color="#8898AA" size={12}>
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
                          name="logo-google"
                          family="Ionicon"
                          size={33}
                          color={'#DF3E30'}
                          style={{ marginRight: 3 }}
                        />
                        <Text style={styles.socialTextButtons}>GOOGLE</Text>
                      </Block>
                    </Button>
                  </Block>
                </Block>
                <Block flex={0.8} middle space="between">
                  <Block flex={0.2} middle>
                    <Text
                      style={{
                        fontFamily: 'open-sans-regular',
                        textAlign: 'center',
                      }}
                      color="#8898AA"
                      size={12}
                    >
                      O hazlo de la manera clásica
                    </Text>
                  </Block>
                  <Block center flex={0.9}>
                    <Block flex center>
                      <Block>
                        <Block
                          width={width * 0.8}
                          style={{ marginBottom: 6 }}
                        >
                          <Input
                            borderless
                            placeholder="Correo"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            iconContent={
                              <Icon
                                size={16}
                                color="#ADB5BD"
                                name="ic_mail_24px"
                                family="ArgonExtra"
                                style={styles.inputIcons}
                              />
                            }
                          />
                        </Block>
                        <Block width={width * 0.8} style={{ marginBottom: 15 }}>
                          <Input
                            password
                            borderless
                            placeholder="Contraseña"
                            value={password}
                            onChangeText={setPassword}
                            iconContent={
                              <Icon
                                size={16}
                                color="#ADB5BD"
                                name="padlock-unlocked"
                                family="ArgonExtra"
                                style={styles.inputIcons}
                              />
                            }
                          />
                        </Block>
                        
                        {/* <Block row style={styles.forgotPassword}>
                          <Button
                            color="transparent"
                            textStyle={{
                              color: argonTheme.COLORS.PRIMARY,
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
                          color="primary" 
                          style={styles.loginButton}
                          onPress={handleLogin}
                          loading={isLoading}
                        >
                          <Text
                            style={{ fontFamily: 'open-sans-bold' }}
                            size={21}
                            color={argonTheme.COLORS.WHITE}
                          >
                            {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
                          </Text>
                        </Button>
                        
                        {/* <Block row style={styles.signUpLink}>
                          <Block>

                            <Text
                              style={{ fontFamily: 'open-sans-regular' }}
                              size={14}
                              color={argonTheme.COLORS.TEXT}
                              >
                              ¿No tienes una cuenta?
                            </Text>
                          </Block>
                          <Button
                            color="transparent"
                            textStyle={{
                              color: argonTheme.COLORS.PRIMARY,
                              fontSize: 14,
                              fontFamily: 'open-sans-bold',
                            }}
                          >
                            Regístrate
                          </Button>
                        </Block> */}
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
    backgroundColor: '#F4F5F7',
    borderRadius: 36,
    shadowColor: argonTheme.COLORS.BLACK,
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
    backgroundColor: argonTheme.COLORS.WHITE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(136, 152, 170, 0.3)',
  },
  socialButtons: {
    width: 132,
    height: 39,
    backgroundColor: '#fff',
    shadowColor: argonTheme.COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowRadius: 8,
    shadowOpacity: 0.1,
    elevation: 1,
  },
  socialTextButtons: {
    color: argonTheme.COLORS.PRIMARY,
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