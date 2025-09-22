import React from 'react';
import { Block } from 'galio-framework';
import { useAuth } from '../services/context/AuthContext';
import Login from './Login';
import Welcome from './Welcome';
import { Text } from 'react-native';

const AuthNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  // Mientras carga, muestra una pantalla vacía o un loader
  if (loading) {
    return (
      <Block flex center middle>
        <Text>CARGANDO...</Text>
      </Block>
    );
  }

  // Si hay usuario autenticado, muestra la pantalla de bienvenida
  if (user) {
    return <Welcome />;
  }

  // Si no hay usuario, muestra la pantalla de login
  return <Login />;
};

export default AuthNavigator;