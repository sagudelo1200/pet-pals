import React from 'react';
import { StyleSheet } from 'react-native';
import { Block, Text } from 'galio-framework';
import { Button } from '../components';
import { argonTheme } from '../constants';
import { useAuth } from '../services/context/AuthContext';

const Welcome: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
    } catch (error) {
      console.error('Error en logout:', error);
    }
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
  logoutButton: {
    marginTop: 30,
    width: 200,
  },
});

export default Welcome;