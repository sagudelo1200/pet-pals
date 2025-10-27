import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Dashboard from '../screens/Dashboard';
import AuthNavigator from '../screens/AuthNavigator';
import { AuthStackParamList } from './types';

// Stack principal con autenticación
const Stack = createStackNavigator<AuthStackParamList>();

// Navegador principal con Auth y App
export default function Views(): React.ReactElement {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name='Auth' component={AuthNavigator} />
      <Stack.Screen name='App' component={Dashboard} />
    </Stack.Navigator>
  );
}