import React from 'react';
import { StyleSheet } from 'react-native';
import { Block, Text } from 'galio-framework';
import { Button } from '../components';
import { argonTheme } from '../constants';
import { useAuth } from '../services/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../navigation/Screens';

// Tipado para la navegación
type WelcomeNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Auth'>;

const Welcome: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<WelcomeNavigationProp>();

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  const handleGoToApp = (): void => {
    navigation.navigate('App');
  };

  const handleCrearMascota = (): void => {
    navigation.navigate('CrearMascota');
  };

  return (
    <Block flex center middle style={styles.container}>
      <Block center style={styles.content}>
        <Text
          style={{ fontFamily: 'open-sans-bold' }}
          size={24}
          color={argonTheme.COLORS.PRIMARY}
        >
          ¡Bienvenido!
        </Text>
        
        <Text
          style={{ fontFamily: 'open-sans-regular', textAlign: 'center', marginTop: 20 }}
          size={16}
          color={argonTheme.COLORS.TEXT}
        >
          {user?.displayName ? `Hola, ${user.displayName}` : 'Has iniciado sesión correctamente'}
        </Text>
        
        <Text
          style={{ fontFamily: 'open-sans-light', textAlign: 'center', marginTop: 10 }}
          size={14}
          color={argonTheme.COLORS.MUTED}
        >
          Email: {user?.email}
        </Text>

        {/* Botones de acción */}
        <Block center style={styles.buttonSection}>
          <Button
            color="success" 
            style={styles.actionButton}
            onPress={handleGoToApp}
          >
            <Text
              style={{ fontFamily: 'open-sans-bold' }}
              size={14}
              color={argonTheme.COLORS.WHITE}
            >
              IR A LA APP
            </Text>
          </Button>

          <Button
            color="info" 
            style={styles.actionButton}
            onPress={handleCrearMascota}
          >
            <Text
              style={{ fontFamily: 'open-sans-bold' }}
              size={14}
              color={argonTheme.COLORS.WHITE}
            >
              🐕 REGISTRAR MASCOTA
            </Text>
          </Button>
        </Block>
        
        <Button 
          color="primary" 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text
            style={{ fontFamily: 'open-sans-bold' }}
            size={14}
            color={argonTheme.COLORS.WHITE}
          >
            CERRAR SESIÓN
          </Text>
        </Button>
      </Block>
    </Block>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F4F5F7',
  },
  content: {
    padding: 40,
  },
  buttonSection: {
    marginTop: 30,
    marginBottom: 20,
  },
  actionButton: {
    width: 200,
    marginBottom: 15,
  },
  logoutButton: {
    width: 200,
  },
});

export default Welcome;