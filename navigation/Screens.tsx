import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Home from '../screens/Home';
import AuthNavigator from '../screens/AuthNavigator';

// Tipos de navegación para Pet Pals con Tabs
export type AuthStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type RootTabParamList = {
  HomeTab: undefined;
  MascotasTab: undefined;
  CrearTab: undefined;
  PerfilTab: undefined;
};

// Stack principal con autenticación
const Stack = createStackNavigator<AuthStackParamList>();

// Navegador principal con Auth y App
export default function Views(): React.ReactElement {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen name="App" component={Home} />
    </Stack.Navigator>
  );
}