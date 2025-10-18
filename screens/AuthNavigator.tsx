import React, { useEffect } from 'react';
import { useAuth } from '../services/context/AuthContext';
import { LoadingScreen } from '../components';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../navigation/Screens';
import Login from './Login';

type AuthNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Onboarding'>;

const AuthNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const navigation = useNavigation<AuthNavigationProp>();

  // Efecto para navegar automáticamente al drawer cuando hay usuario
  useEffect(() => {
    if (user && !loading) {
      // Navegar al drawer automáticamente
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
        messageType="pets"
        spinnerColor="#0066cc"
      />
    );
  }

  // Si hay usuario autenticado, muestra loading mientras navega
  if (user) {
    return (
      <LoadingScreen 
        message="🚀 Accediendo a tu cuenta..."
        messageType="auth"
        spinnerColor="#0066cc"
      />
    );
  }

  // Si no hay usuario, muestra la pantalla de login
  return <Login />;
};

export default AuthNavigator;