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
import { Images, argonTheme } from '../constants';
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
      const result = await login(email.trim(), password);
      
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
          source={Images.RegisterBackground}
          style={{ width, height, zIndex: 1 }}
        >
          <Block flex middle>
            <Block style={styles.loginContainer}>
              <Block flex space="between">
                <Block flex={0.2} middle style={styles.socialConnect}>
                  <Block flex={0.6} middle>
                    <Text color="#8898AA" size={12}>
                      Sign in with
                    </Text>
                  </Block>
                  <Block flex={0.4} row style={{ marginBottom: 18 }}>
                    <Button
                      style={{ ...styles.socialButtons, marginRight: 30 }}
                    >
                      <Block row>
                        <Icon
                          name="logo-github"
                          family="Ionicon"
                          size={14}
                          color={'black'}
                          style={{ marginTop: 2, marginRight: 5 }}
                        />
                        <Text style={styles.socialTextButtons}>GITHUB</Text>
                      </Block>
                    </Button>
                    <Button style={styles.socialButtons}>
                      <Block row>
                        <Icon
                          name="facebook-square"
                          family="font-awesome"
                          size={14}
                          color={'black'}
                          style={{ marginTop: 2, marginRight: 5 }}
                        />
                        <Text style={styles.socialTextButtons}>FACEBOOK</Text>
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
                      Or sign in the classic way
                    </Text>
                  </Block>
                  <Block center flex={0.9}>
                    <Block flex space="between">
                      <Block>
                        <Block
                          width={width * 0.8}
                          style={{ marginBottom: 15 }}
                        >
                          <Input
                            borderless
                            placeholder="Email"
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
                            placeholder="Password"
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
                        
                        {/* Botón de "Forgot Password" opcional */}
                        <Block row style={styles.forgotPassword}>
                          <Button
                            color="transparent"
                            textStyle={{
                              color: argonTheme.COLORS.PRIMARY,
                              fontSize: 14,
                              fontFamily: 'open-sans-regular',
                            }}
                          >
                            Forgot password?
                          </Button>
                        </Block>
                      </Block>
                      
                      <Block center>
                        <Button 
                          color="primary" 
                          style={styles.loginButton}
                          onPress={handleLogin}
                          loading={isLoading}
                        >
                          <Text
                            style={{ fontFamily: 'open-sans-bold' }}
                            size={14}
                            color={argonTheme.COLORS.WHITE}
                          >
                            {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
                          </Text>
                        </Button>
                        
                        {/* Botón para ir a registro */}
                        <Block row style={styles.signUpLink}>
                          <Text
                            style={{ fontFamily: 'open-sans-regular' }}
                            size={14}
                            color={argonTheme.COLORS.TEXT}
                          >
                            Don't have an account?{' '}
                          </Text>
                          <Button
                            color="transparent"
                            textStyle={{
                              color: argonTheme.COLORS.PRIMARY,
                              fontSize: 14,
                              fontFamily: 'open-sans-bold',
                            }}
                          >
                            Sign up
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
    height: height < 812 ? height * 0.8 : height * 0.7,
    backgroundColor: '#F4F5F7',
    borderRadius: 4,
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
    width: 120,
    height: 40,
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
    fontWeight: '800',
    fontSize: 14,
  },
  inputIcons: {
    marginRight: 12,
  },
  forgotPassword: {
    justifyContent: 'flex-end',
    paddingRight: 16,
    marginBottom: 20,
  },
  loginButton: {
    width: width * 0.5,
    marginTop: 25,
    marginBottom: 20,
  },
  signUpLink: {
    justifyContent: 'center',
    marginBottom: 20,
  },
});

export default Login;