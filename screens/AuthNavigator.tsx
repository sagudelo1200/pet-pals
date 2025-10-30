import React, { useEffect } from 'react';
import { useAuth } from '../services/context/AuthContext';
import { LoadingScreen } from '../components';
import { useNavigation } from '@react-navigation/native';
import Login from './Login';

const AuthNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const navigation = useNavigation<any>(); // Usar any temporalmente para las pruebas

  // Efecto para navegar automáticamente cuando hay usuario
  useEffect(() => {
    if (user && !loading) {
      // Navegar a App (Tab Navigator) cuando hay usuario autenticado
      navigation.reset({
        index: 0,
        routes: [{ name: 'App' }],
      });
    }
  }, [user, loading, navigation]);

  // Mientras carga, muestra el componente de carga con mensajes de mascotas
  if (loading) {
    return (
      <LoadingScreen 
        messageType='pets'
        spinnerColor='#22A47C'
      />
    );
  }

  // Si hay usuario autenticado, muestra loading mientras navega
  if (user) {
    return (
      <LoadingScreen 
        message='🚀 Accediendo a tu cuenta...'
        messageType='auth'
        spinnerColor='#22A47C'
      />
    );
  }

  // Si no hay usuario, muestra la pantalla de login
  return <Login />;
};

export default AuthNavigator;