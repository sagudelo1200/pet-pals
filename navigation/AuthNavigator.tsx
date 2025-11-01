import React, { useEffect } from 'react';
import { useAuth } from '@/services/context/AuthContext';
import { LoadingScreen } from '@/components';
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Ingresar from '@/screens/auth/Ingresar';
import Registro from '@/screens/auth/Registro';
import { AuthFlowParamList } from './types';

const Stack = createStackNavigator<AuthFlowParamList>();

const AuthNavigator: React.FC = () => {
  const { user, loading, roles } = useAuth();
  const navigation = useNavigation<any>(); // TODO: tipar con RootStack

  // Efecto para navegar automáticamente cuando hay usuario
  useEffect(() => {
    if (user && !loading) {
      // Decidir destino por rol. Si tiene 'dueño' => DuenoApp, sino si 'paseador' => PaseadorApp
      const isDueno = Array.isArray(roles) && roles.includes('dueño');
      const isPaseador = Array.isArray(roles) && roles.includes('paseador');
      const target = isDueno ? 'DuenoApp' : (isPaseador ? 'PaseadorApp' : 'DuenoApp');

      navigation.reset({
        index: 0,
        routes: [{ name: target as never }],
      });
    }
  }, [user, loading, roles, navigation]);

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

  // Si no hay usuario, mostramos el stack de autenticación (Ingresar / Registro)
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name='Ingresar' component={Ingresar} />
      <Stack.Screen name='Registro' component={Registro} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
